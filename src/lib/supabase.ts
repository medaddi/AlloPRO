/**
 * AlloPro — Supabase client, typed schema, atomic queue RPCs & Realtime hooks.
 */
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type PostgrestError } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';

/* -------------------------------------------------------------------------- */
/*                               DATABASE TYPES                               */
/* -------------------------------------------------------------------------- */

export type UserRole = 'client' | 'pro' | 'admin';
export type BookingEngine = 'queue' | 'appointment' | 'ondemand';
export type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

export type UserRow = {
  id: string;
  phone: string;
  full_name: string;
  role: UserRole;
  language: 'fr' | 'ar';
  city: string;
  avatar_url: string | null;
  push_token: string | null;
  created_at: string;
};

export type CategoryRow = {
  id: string;
  slug: string;
  name_fr: string;
  name_ar: string;
  icon: string;
  booking_type: BookingEngine;
  sort_order: number;
};

/** A precise trade (métier) inside a category — seeded in supabase/categories_seed.sql. */
export type CategoryJobRow = {
  id: string;
  category_id: string;
  slug: string;
  name_fr: string;
  name_ar: string;
  sort_order: number;
};

export type CategoryWithJobs = CategoryRow & { jobs: CategoryJobRow[] };

export type ProProfileRow = {
  id: string;
  user_id: string;
  category_id: string | null;
  /** Exact trade inside the category (category_jobs.id). */
  job_id: string | null;
  business_name: string;
  description_fr: string | null;
  description_ar: string | null;
  city: string;
  neighborhood: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
  cover_url: string | null;
  is_open: boolean;
  current_queue_number: number;
  last_issued_ticket: number;
  rating_avg: number;
  rating_count: number;
  subscription_active: boolean;
  subscription_end_date: string;
  /**
   * Verified badge. Not in the original spec schema — add it with:
   * ALTER TABLE public.pro_profiles ADD COLUMN is_verified BOOLEAN DEFAULT false;
   */
  is_verified?: boolean;
  created_at: string;
};

export type ServiceRow = {
  id: string;
  pro_id: string;
  title_fr: string;
  title_ar: string;
  price_mad: number;
  duration_minutes: number;
  is_active: boolean;
  created_at: string;
};

export type BookingRow = {
  id: string;
  client_id: string | null;
  walkin_name: string | null;
  pro_id: string;
  service_id: string | null;
  booking_type: BookingEngine;
  status: BookingStatus;
  queue_number: number | null;
  scheduled_at: string | null;
  client_lat: number | null;
  client_lng: number | null;
  client_address: string | null;
  issue_notes: string | null;
  issue_photo_url: string | null;
  total_price_mad: number;
  booking_date: string;
  created_at: string;
};

export type KridiRow = {
  id: string;
  pro_id: string;
  client_name: string;
  client_phone: string | null;
  amount_mad: number;
  note: string | null;
  is_paid: boolean;
  created_at: string;
};

export type ReviewRow = {
  id: string;
  booking_id: string;
  client_id: string;
  pro_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

/** Required columns on insert; everything else has a DB default or is nullable. */
type InsertOf<Row, Required extends keyof Row> = Pick<Row, Required> & Partial<Omit<Row, Required>>;

type Table<Row, Required extends keyof Row> = {
  Row: Row;
  Insert: InsertOf<Row, Required>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      users: Table<UserRow, 'id' | 'phone' | 'full_name'>;
      categories: Table<CategoryRow, 'slug' | 'name_fr' | 'name_ar' | 'icon' | 'booking_type'>;
      category_jobs: Table<CategoryJobRow, 'category_id' | 'slug' | 'name_fr' | 'name_ar'>;
      pro_profiles: Table<ProProfileRow, 'business_name' | 'latitude' | 'longitude'>;
      services: Table<ServiceRow, 'pro_id' | 'title_fr' | 'title_ar' | 'price_mad'>;
      bookings: Table<BookingRow, 'pro_id' | 'booking_type'>;
      pro_kridi: Table<KridiRow, 'pro_id' | 'client_name' | 'amount_mad'>;
      reviews: Table<ReviewRow, 'booking_id' | 'client_id' | 'pro_id' | 'rating'>;
    };
    Views: { [_ in never]: never };
    Functions: {
      take_queue_ticket: {
        Args: { p_pro_id: string; p_client_id: string | null; p_service_id: string | null; p_walkin_name?: string | null };
        Returns: BookingRow;
      };
      advance_pro_queue: {
        Args: { p_pro_id: string };
        Returns: number;
      };
      get_booked_slots: {
        Args: { p_pro_id: string; p_date: string };
        Returns: { scheduled_at: string; duration_minutes: number }[];
      };
    };
    Enums: {
      user_role: UserRole;
      booking_engine: BookingEngine;
      booking_status: BookingStatus;
    };
    CompositeTypes: { [_ in never]: never };
  };
};

/* -------------------------------------------------------------------------- */
/*                                   CLIENT                                   */
/* -------------------------------------------------------------------------- */

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    '[AlloPro] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to .env and restart Metro with `npx expo start -c`.',
  );
}

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});

/**
 * Refresh the auth token only while the app is in the foreground
 * (recommended by Supabase for React Native).
 */
if (Platform.OS !== 'web') {
  const handleAppState = (state: AppStateStatus) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  };
  handleAppState(AppState.currentState);
  AppState.addEventListener('change', handleAppState);
}

/* -------------------------------------------------------------------------- */
/*                                  HELPERS                                   */
/* -------------------------------------------------------------------------- */

/** Device-local date as YYYY-MM-DD (matches bookings.booking_date for users in Morocco). */
export const todayISODate = (d: Date = new Date()): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** People still waiting before a given ticket (never negative). */
export const peopleAhead = (myTicket: number, currentServing: number): number =>
  Math.max(0, myTicket - currentServing - 1);

/** Rough wait estimate shown in the Active Ticket banner (~20 min). */
export const estimateWaitMinutes = (ahead: number, avgServiceMinutes = 20): number =>
  Math.max(0, Math.round(ahead * avgServiceMinutes));

export class AlloProDataError extends Error {
  code?: string;
  constructor(err: PostgrestError | Error) {
    super(err.message);
    this.name = 'AlloProDataError';
    if ('code' in err) this.code = err.code;
  }
}

let channelSeq = 0;
const uniqueChannel = (prefix: string) => `${prefix}:${Date.now().toString(36)}:${++channelSeq}`;

/* -------------------------------------------------------------------------- */
/*                                ATOMIC RPCS                                 */
/* -------------------------------------------------------------------------- */

/** Client taps "Prendre mon tour" — or Pro adds a walk-in (clientId null + walkinName). */
export async function takeQueueTicket(params: {
  proId: string;
  clientId: string | null;
  serviceId: string | null;
  walkinName?: string | null;
}): Promise<BookingRow> {
  const { data, error } = await supabase.rpc('take_queue_ticket', {
    p_pro_id: params.proId,
    p_client_id: params.clientId,
    p_service_id: params.serviceId,
    p_walkin_name: params.walkinName ?? null,
  });
  if (error) throw new AlloProDataError(error);
  if (!data) throw new AlloProDataError(new Error('take_queue_ticket returned no booking'));
  return data as BookingRow;
}

/** Pro taps "CLIENT SUIVANT" — returns the new ticket being served. */
export async function advanceProQueue(proId: string): Promise<number> {
  const { data, error } = await supabase.rpc('advance_pro_queue', { p_pro_id: proId });
  if (error) throw new AlloProDataError(error);
  return data as number;
}

/* -------------------------------------------------------------------------- */
/*                               REALTIME HOOKS                               */
/* -------------------------------------------------------------------------- */

type LiveQueueState = {
  isOpen: boolean;
  currentNumber: number;
  lastIssued: number;
  waitingCount: number;
};

/**
 * Live queue counters of one pro (current ticket, last issued ticket, open/closed).
 * Powers the Pro "Live Guichet", the pro profile bottom bar and the client ticket banner.
 */
export function useProLiveQueue(proId: string | null | undefined) {
  const [state, setState] = useState<LiveQueueState | null>(null);
  const [loading, setLoading] = useState<boolean>(!!proId);
  const [error, setError] = useState<AlloProDataError | null>(null);

  const apply = useCallback((row: Pick<ProProfileRow, 'is_open' | 'current_queue_number' | 'last_issued_ticket'>) => {
    setState({
      isOpen: row.is_open,
      currentNumber: row.current_queue_number,
      lastIssued: row.last_issued_ticket,
      waitingCount: Math.max(0, row.last_issued_ticket - row.current_queue_number),
    });
  }, []);

  const refresh = useCallback(async () => {
    if (!proId) return;
    const { data, error: err } = await supabase
      .from('pro_profiles')
      .select('is_open, current_queue_number, last_issued_ticket')
      .eq('id', proId)
      .single();
    if (err) setError(new AlloProDataError(err));
    else if (data) {
      setError(null);
      apply(data);
    }
    setLoading(false);
  }, [proId, apply]);

  useEffect(() => {
    if (!proId) {
      setState(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    refresh();

    const channel = supabase
      .channel(uniqueChannel(`pro-queue:${proId}`))
      .on<ProProfileRow>(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'pro_profiles', filter: `id=eq.${proId}` },
        (payload) => {
          if (payload.new && 'id' in payload.new) apply(payload.new as ProProfileRow);
        },
      )
      .subscribe((status) => {
        // Re-sync after reconnects so no update is missed while offline.
        if (status === 'SUBSCRIBED') refresh();
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [proId, refresh, apply]);

  return { ...state, state, loading, error, refresh };
}

/** Follows a single booking (client "Mes Réservations" live tracker). */
export function useBookingLive(bookingId: string | null | undefined) {
  const [booking, setBooking] = useState<BookingRow | null>(null);
  const [loading, setLoading] = useState<boolean>(!!bookingId);
  const [error, setError] = useState<AlloProDataError | null>(null);

  const refresh = useCallback(async () => {
    if (!bookingId) return;
    const { data, error: err } = await supabase.from('bookings').select('*').eq('id', bookingId).single();
    if (err) setError(new AlloProDataError(err));
    else {
      setError(null);
      setBooking(data);
    }
    setLoading(false);
  }, [bookingId]);

  useEffect(() => {
    if (!bookingId) {
      setBooking(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    refresh();

    const channel = supabase
      .channel(uniqueChannel(`booking:${bookingId}`))
      .on<BookingRow>(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `id=eq.${bookingId}` },
        (payload) => {
          if (payload.new && 'id' in payload.new) setBooking(payload.new as BookingRow);
        },
      )
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'bookings', filter: `id=eq.${bookingId}` }, () =>
        setBooking(null),
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') refresh();
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookingId, refresh]);

  return { booking, loading, error, refresh };
}

/** Booking + client contact + service, as shown on the Pro "Guichet". */
export type BookingWithDetails = BookingRow & {
  client: Pick<UserRow, 'full_name' | 'phone' | 'language'> | null;
  service: Pick<ServiceRow, 'title_fr' | 'title_ar' | 'price_mad' | 'duration_minutes'> | null;
};

export const BOOKING_DETAILS_SELECT =
  '*, client:users!bookings_client_id_fkey(full_name, phone, language), service:services(title_fr, title_ar, price_mad, duration_minutes)';

/** All of today's bookings for a pro (queue tickets, appointments, SOS requests). */
export function useProTodayBookings(proId: string | null | undefined) {
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(!!proId);
  const [error, setError] = useState<AlloProDataError | null>(null);
  const inFlight = useRef(false);
  const pending = useRef(false);

  const refresh = useCallback(async () => {
    if (!proId) return;
    // Coalesce bursts of realtime events into at most one trailing refetch.
    if (inFlight.current) {
      pending.current = true;
      return;
    }
    inFlight.current = true;
    do {
      pending.current = false;
      const { data, error: err } = await supabase
        .from('bookings')
        .select(BOOKING_DETAILS_SELECT)
        .eq('pro_id', proId)
        .eq('booking_date', todayISODate())
        .order('queue_number', { ascending: true, nullsFirst: false })
        .order('scheduled_at', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true });
      if (err) setError(new AlloProDataError(err));
      else {
        setError(null);
        setBookings((data ?? []) as unknown as BookingWithDetails[]);
      }
    } while (pending.current);
    inFlight.current = false;
    setLoading(false);
  }, [proId]);

  useEffect(() => {
    if (!proId) {
      setBookings([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    refresh();

    const channel = supabase
      .channel(uniqueChannel(`pro-bookings:${proId}`))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `pro_id=eq.${proId}` }, () => {
        refresh();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') refresh();
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [proId, refresh]);

  return { bookings, loading, error, refresh };
}

/** The signed-in client's active (not finished) bookings — drives the Active Ticket banner. */
export function useClientActiveBookings(clientId: string | null | undefined) {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState<boolean>(!!clientId);
  const [error, setError] = useState<AlloProDataError | null>(null);

  const refresh = useCallback(async () => {
    if (!clientId) return;
    const { data, error: err } = await supabase
      .from('bookings')
      .select('*')
      .eq('client_id', clientId)
      .in('status', ['pending', 'confirmed', 'in_progress'])
      .gte('booking_date', todayISODate())
      .order('created_at', { ascending: false });
    if (err) setError(new AlloProDataError(err));
    else {
      setError(null);
      setBookings(data ?? []);
    }
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
      .channel(uniqueChannel(`client-bookings:${clientId}`))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `client_id=eq.${clientId}` }, () => {
        refresh();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') refresh();
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId, refresh]);

  return { bookings, loading, error, refresh };
}

/* -------------------------------------------------------------------------- */
/*                              CATALOG & CATEGORIES                          */
/* -------------------------------------------------------------------------- */

/** Services of one pro. `onlyActive` for the client profile; all for the pro catalog. */
export function useServices(proId: string | null | undefined, options: { onlyActive?: boolean } = {}) {
  const { onlyActive = false } = options;
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState<boolean>(!!proId);
  const [error, setError] = useState<AlloProDataError | null>(null);

  const refresh = useCallback(async () => {
    if (!proId) {
      setServices([]);
      setLoading(false);
      return;
    }
    let query = supabase.from('services').select('*').eq('pro_id', proId);
    if (onlyActive) query = query.eq('is_active', true);
    const { data, error: err } = await query.order('price_mad', { ascending: true });
    if (err) setError(new AlloProDataError(err));
    else {
      setError(null);
      setServices(data ?? []);
    }
    setLoading(false);
  }, [proId, onlyActive]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  return { services, setServices, loading, error, refresh };
}

let categoriesCache: CategoryWithJobs[] | null = null;

/** The 6 seeded categories with their target jobs, sorted (cached for the app session). */
export function useCategories() {
  const [categories, setCategories] = useState<CategoryWithJobs[]>(categoriesCache ?? []);
  const [loading, setLoading] = useState(!categoriesCache);
  const [error, setError] = useState<AlloProDataError | null>(null);

  useEffect(() => {
    if (categoriesCache) return;
    let active = true;
    supabase
      .from('categories')
      .select('*, jobs:category_jobs(*)')
      .order('sort_order', { ascending: true })
      .then(({ data, error: err }) => {
        if (!active) return;
        if (err) setError(new AlloProDataError(err));
        else {
          categoriesCache = ((data ?? []) as unknown as CategoryWithJobs[]).map((c) => ({
            ...c,
            jobs: [...(c.jobs ?? [])].sort((a, b) => a.sort_order - b.sort_order),
          }));
          setCategories(categoriesCache);
        }
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { categories, loading, error };
}
