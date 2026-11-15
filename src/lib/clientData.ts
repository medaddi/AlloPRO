/**
 * AlloPro — Client-side data: pro discovery, pro details, the client's bookings
 * (with pro contact once confirmed), appointment availability and booking actions.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { ProListItem } from '../components/client/ProCard';
import { distanceKm, type LatLng } from '../constants/moroccoCities';
import {
  AlloProDataError,
  supabase,
  todayISODate,
  type BookingEngine,
  type BookingRow,
  type CategoryRow,
  type ProProfileRow,
  type ReviewRow,
} from './supabase';

let seq = 0;
const channelName = (prefix: string) => `${prefix}:${Date.now().toString(36)}:${++seq}`;

/* -------------------------------------------------------------------------- */
/*                                PRO DISCOVERY                               */
/* -------------------------------------------------------------------------- */

const PRO_LIST_SELECT =
  '*, category:categories(slug, name_fr, name_ar, icon, booking_type), services(price_mad, is_active)';

type RawPro = ProProfileRow & {
  category: Pick<CategoryRow, 'slug' | 'name_fr' | 'name_ar' | 'icon' | 'booking_type'> | null;
  services: { price_mad: number; is_active: boolean }[] | null;
};

const toListItem = (raw: RawPro, from: LatLng | null): ProListItem => {
  const prices = (raw.services ?? [])
    .filter((s) => s.is_active)
    .map((s) => Number(s.price_mad))
    .filter((n) => n > 0);
  const { services: _services, ...rest } = raw;
  return {
    ...rest,
    min_price_mad: prices.length ? Math.min(...prices) : null,
    distance_km: from ? distanceKm(from, { latitude: raw.latitude, longitude: raw.longitude }) : null,
  };
};

/** Open first, then nearest, then best rated. */
export const sortPros = (list: ProListItem[]): ProListItem[] =>
  [...list].sort((a, b) => {
    if (a.is_open !== b.is_open) return a.is_open ? -1 : 1;
    const da = a.distance_km ?? Number.POSITIVE_INFINITY;
    const db = b.distance_km ?? Number.POSITIVE_INFINITY;
    if (da !== db) return da - db;
    return Number(b.rating_avg) - Number(a.rating_avg);
  });

/** Pros of a city (active subscription only), live open/queue status. */
export function usePros(cityName: string, userLocation: LatLng | null) {
  const [raw, setRaw] = useState<RawPro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AlloProDataError | null>(null);

  const refresh = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('pro_profiles')
      .select(PRO_LIST_SELECT)
      .eq('city', cityName)
      .eq('subscription_active', true)
      .limit(300);
    if (err) setError(new AlloProDataError(err));
    else {
      setError(null);
      setRaw((data ?? []) as unknown as RawPro[]);
    }
    setLoading(false);
  }, [cityName]);

  useEffect(() => {
    setLoading(true);
    refresh();
    const channel = supabase
      .channel(channelName(`pros:${cityName}`))
      .on<ProProfileRow>(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'pro_profiles', filter: `city=eq.${cityName}` },
        (payload) => {
          const next = payload.new as ProProfileRow;
          if (!next?.id) return;
          setRaw((list) => list.map((p) => (p.id === next.id ? { ...p, ...next } : p)));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [cityName, refresh]);

  const pros = useMemo(() => sortPros(raw.map((r) => toListItem(r, userLocation))), [raw, userLocation]);
  return { pros, loading, error, refresh };
}

export type PublicReview = Pick<ReviewRow, 'id' | 'rating' | 'comment' | 'created_at'>;

/** One pro (with category & min price) + latest reviews, live status. */
export function useProDetails(proId: string | null | undefined, userLocation: LatLng | null) {
  const [raw, setRaw] = useState<RawPro | null>(null);
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [loading, setLoading] = useState(!!proId);
  const [error, setError] = useState<AlloProDataError | null>(null);

  const refresh = useCallback(async () => {
    if (!proId) return;
    const [proRes, reviewRes] = await Promise.all([
      supabase.from('pro_profiles').select(PRO_LIST_SELECT).eq('id', proId).maybeSingle(),
      supabase
        .from('reviews')
        .select('id, rating, comment, created_at')
        .eq('pro_id', proId)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);
    if (proRes.error) setError(new AlloProDataError(proRes.error));
    else {
      setError(null);
      setRaw((proRes.data as unknown as RawPro) ?? null);
    }
    if (!reviewRes.error) setReviews(reviewRes.data ?? []);
    setLoading(false);
  }, [proId]);

  useEffect(() => {
    if (!proId) return;
    setLoading(true);
    refresh();
    const channel = supabase
      .channel(channelName(`pro:${proId}`))
      .on<ProProfileRow>(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'pro_profiles', filter: `id=eq.${proId}` },
        (payload) => {
          const next = payload.new as ProProfileRow;
          if (next?.id) setRaw((p) => (p ? { ...p, ...next } : p));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [proId, refresh]);

  const pro = useMemo(() => (raw ? toListItem(raw, userLocation) : null), [raw, userLocation]);
  return { pro, reviews, loading, error, refresh };
}

/* -------------------------------------------------------------------------- */
/*                              CLIENT BOOKINGS                               */
/* -------------------------------------------------------------------------- */

export type ClientBooking = BookingRow & {
  pro: {
    id: string;
    business_name: string;
    address: string | null;
    latitude: number;
    longitude: number;
    cover_url: string | null;
    category: Pick<CategoryRow, 'slug' | 'name_fr' | 'name_ar' | 'icon' | 'booking_type'> | null;
    /** Visible only once the booking is confirmed (RLS). */
    owner: { phone: string } | null;
  } | null;
  service: { title_fr: string; title_ar: string } | null;
  review: { id: string; rating: number } | null;
};

const CLIENT_BOOKING_SELECT =
  '*, pro:pro_profiles(id, business_name, address, latitude, longitude, cover_url, category:categories(slug, name_fr, name_ar, icon, booking_type), owner:users!pro_profiles_user_id_fkey(phone)), service:services(title_fr, title_ar), review:reviews(id, rating)';

const ACTIVE: BookingRow['status'][] = ['pending', 'confirmed', 'in_progress'];
export const isActiveBooking = (b: BookingRow) => ACTIVE.includes(b.status);

export function useClientBookings(clientId: string | null | undefined) {
  const [bookings, setBookings] = useState<ClientBooking[]>([]);
  const [loading, setLoading] = useState(!!clientId);
  const [error, setError] = useState<AlloProDataError | null>(null);
  const inFlight = useRef(false);
  const pending = useRef(false);

  const refresh = useCallback(async () => {
    if (!clientId) return;
    if (inFlight.current) {
      pending.current = true;
      return;
    }
    inFlight.current = true;
    do {
      pending.current = false;
      const { data, error: err } = await supabase
        .from('bookings')
        .select(CLIENT_BOOKING_SELECT)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (err) setError(new AlloProDataError(err));
      else {
        setError(null);
        const rows = (data ?? []) as unknown as (ClientBooking & { review: unknown })[];
        setBookings(
          rows.map((r) => ({
            ...r,
            // One-to-one embeds may come back as an array depending on PostgREST detection.
            review: Array.isArray(r.review) ? (r.review[0] ?? null) : (r.review as ClientBooking['review']),
          })),
        );
      }
    } while (pending.current);
    inFlight.current = false;
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    if (!clientId) {
      setBookings([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    refresh();
    const channel = supabase
      .channel(channelName(`client-bookings:${clientId}`))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `client_id=eq.${clientId}` }, () =>
        refresh(),
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') refresh();
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId, refresh]);

  const active = useMemo(
    () =>
      bookings.filter(
        (b) => isActiveBooking(b) && (b.booking_type !== 'queue' || b.booking_date === todayISODate()),
      ),
    [bookings],
  );
  const past = useMemo(() => bookings.filter((b) => !active.includes(b)), [bookings, active]);

  return { bookings, active, past, loading, error, refresh };
}

/* -------------------------------------------------------------------------- */
/*                                   ACTIONS                                  */
/* -------------------------------------------------------------------------- */

export type BookedSlot = { start: Date; minutes: number };

export async function getBookedSlots(proId: string, day: Date): Promise<BookedSlot[]> {
  const { data, error } = await supabase.rpc('get_booked_slots', { p_pro_id: proId, p_date: todayISODate(day) });
  if (error) throw new AlloProDataError(error);
  return ((data ?? []) as { scheduled_at: string; duration_minutes: number }[]).map((r) => ({
    start: new Date(r.scheduled_at),
    minutes: r.duration_minutes || 30,
  }));
}

export async function createAppointment(params: {
  clientId: string;
  proId: string;
  serviceId: string | null;
  scheduledAt: Date;
}): Promise<BookingRow> {
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      client_id: params.clientId,
      pro_id: params.proId,
      service_id: params.serviceId,
      booking_type: 'appointment',
      status: 'pending',
      scheduled_at: params.scheduledAt.toISOString(),
      booking_date: todayISODate(params.scheduledAt),
    })
    .select('*')
    .single();
  if (error) throw new AlloProDataError(error);
  return data;
}

export async function uploadIssuePhoto(userId: string, uri: string, mimeType = 'image/jpeg'): Promise<string> {
  const response = await fetch(uri);
  const body = await response.arrayBuffer();
  const ext = mimeType.includes('png') ? 'png' : 'jpg';
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('issue-photos').upload(path, body, { contentType: mimeType, upsert: false });
  if (error) throw new AlloProDataError(error);
  return supabase.storage.from('issue-photos').getPublicUrl(path).data.publicUrl;
}

export async function createSosRequest(params: {
  clientId: string;
  proId: string;
  serviceId: string | null;
  latitude: number;
  longitude: number;
  address: string;
  notes: string;
  photoUrl: string | null;
}): Promise<BookingRow> {
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      client_id: params.clientId,
      pro_id: params.proId,
      service_id: params.serviceId,
      booking_type: 'ondemand',
      status: 'pending',
      client_lat: params.latitude,
      client_lng: params.longitude,
      client_address: params.address,
      issue_notes: params.notes,
      issue_photo_url: params.photoUrl,
    })
    .select('*')
    .single();
  if (error) throw new AlloProDataError(error);
  return data;
}

export async function cancelBooking(bookingId: string): Promise<void> {
  const { error } = await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', bookingId);
  if (error) throw new AlloProDataError(error);
}

export async function submitReview(params: {
  bookingId: string;
  clientId: string;
  proId: string;
  rating: number;
  comment: string | null;
}): Promise<void> {
  const { error } = await supabase.from('reviews').insert({
    booking_id: params.bookingId,
    client_id: params.clientId,
    pro_id: params.proId,
    rating: Math.min(5, Math.max(1, Math.round(params.rating))),
    comment: params.comment?.trim() || null,
  });
  if (error) throw new AlloProDataError(error);
}

/** Maps server errors (RPC exceptions, unique violations) to translation keys. */
export function bookingErrorKey(
  err: unknown,
  engine: BookingEngine,
): 'errors.alreadyInQueue' | 'errors.slotTaken' | 'errors.queueClosed' | 'errors.generic' {
  const e = err as { code?: string; message?: string } | null;
  const message = e?.message?.toLowerCase() ?? '';
  if (message.includes('queue closed')) return 'errors.queueClosed';
  if (e?.code === '23505' || message.includes('already in queue')) {
    return engine === 'queue' ? 'errors.alreadyInQueue' : 'errors.slotTaken';
  }
  return 'errors.generic';
}
