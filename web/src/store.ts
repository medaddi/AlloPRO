/**
 * ALLO LM3LM web — single Zustand store shared by Client Mode and Pro Mode.
 * Persisted to localStorage and re-hydrated on `storage` events, so two browser
 * tabs (one client, one pro) stay in sync live — the same contract the Supabase
 * Realtime layer provides in the Android app.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  categoryOf,
  cityById,
  seedBookings,
  seedKridi,
  seedPros,
  type Booking,
  type BookingStatus,
  type CategorySlug,
  type Kridi,
  type Lang,
  type Pro,
  type Service,
} from './data/seed';

export type Mode = 'client' | 'pro';
export type View = 'app' | 'animations';
export type ClientTab = 'discover' | 'map' | 'bookings';
export type ProTab = 'guichet' | 'caisse' | 'catalog';

export type SuccessState =
  | { kind: 'ticket'; ticket: number; proName: string }
  | { kind: 'rdv'; highlight: string; proName: string }
  | { kind: 'sos'; proName: string };

type Ui = {
  success: SuccessState | null;
  radarBookingId: string | null;
  toast: string | null;
  openProId: string | null;
  selectedMapProId: string | null;
};

type ActionError = 'closed' | 'already' | 'slot';

type State = {
  mode: Mode;
  lang: Lang;
  view: View;
  clientTab: ClientTab;
  proTab: ProTab;
  cityId: string;
  neighborhoodId: string;
  radiusKm: 2 | 5 | 10;
  category: CategorySlug | null;
  query: string;
  activeProId: string;
  me: { name: string; phone: string };
  pros: Pro[];
  bookings: Booking[];
  kridi: Kridi[];
  ui: Ui;

  setMode: (m: Mode) => void;
  setLang: (l: Lang) => void;
  setView: (v: View) => void;
  setClientTab: (t: ClientTab) => void;
  setProTab: (t: ProTab) => void;
  setCity: (id: string) => void;
  setNeighborhood: (id: string) => void;
  setRadius: (r: 2 | 5 | 10) => void;
  setCategory: (c: CategorySlug | null) => void;
  setQuery: (q: string) => void;
  openPro: (id: string | null) => void;
  selectMapPro: (id: string | null) => void;
  showToast: (msg: string) => void;
  closeSuccess: () => void;
  setRadar: (id: string | null) => void;

  takeTicket: (proId: string, serviceId: string | null) => { ok: true; ticket: number } | { ok: false; error: ActionError };
  bookAppointment: (proId: string, serviceId: string | null, at: Date, highlight: string) => { ok: true } | { ok: false; error: ActionError };
  requestSos: (proId: string, serviceId: string | null, data: { lat: number; lng: number; address: string; notes: string; photo?: string }) => string;
  cancelBooking: (id: string) => void;

  setActivePro: (id: string) => void;
  toggleOpen: (proId: string) => void;
  nextClient: (proId: string) => number | null;
  addWalkin: (proId: string, name: string, serviceId: string | null) => number;
  setBookingStatus: (id: string, status: BookingStatus) => void;
  addKridi: (k: Omit<Kridi, 'id' | 'paid' | 'createdAt'>) => void;
  markKridiPaid: (id: string) => void;
  upsertService: (proId: string, svc: Service) => void;
  deleteService: (proId: string, serviceId: string) => void;
  resetDemo: () => void;
};

const uid = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
const nowIso = () => new Date().toISOString();
const emptyUi: Ui = { success: null, radarBookingId: null, toast: null, openProId: null, selectedMapProId: null };
let toastTimer: ReturnType<typeof setTimeout> | undefined;

const seedState = () => ({
  pros: seedPros(),
  bookings: seedBookings(),
  kridi: seedKridi(),
});

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      mode: 'client',
      lang: 'fr',
      view: 'app',
      clientTab: 'discover',
      proTab: 'guichet',
      cityId: 'casablanca',
      neighborhoodId: 'maarif',
      radiusKm: 5,
      category: null,
      query: '',
      activeProId: 'p1',
      me: { name: 'Youssef', phone: '+212600000001' },
      ...seedState(),
      ui: emptyUi,

      setMode: (mode) => set({ mode, view: 'app' }),
      setLang: (lang) => set({ lang }),
      setView: (view) => set({ view }),
      setClientTab: (clientTab) => set({ clientTab }),
      setProTab: (proTab) => set({ proTab }),
      setCity: (id) => {
        const city = cityById(id);
        set({ cityId: city.id, neighborhoodId: city.neighborhoods[0].id, ui: { ...get().ui, selectedMapProId: null } });
      },
      setNeighborhood: (neighborhoodId) => set({ neighborhoodId }),
      setRadius: (radiusKm) => set({ radiusKm }),
      setCategory: (category) => set({ category }),
      setQuery: (query) => set({ query }),
      openPro: (id) => set({ ui: { ...get().ui, openProId: id } }),
      selectMapPro: (id) => set({ ui: { ...get().ui, selectedMapProId: id } }),
      showToast: (msg) => {
        if (toastTimer) clearTimeout(toastTimer);
        set({ ui: { ...get().ui, toast: msg } });
        toastTimer = setTimeout(() => set({ ui: { ...get().ui, toast: null } }), 2600);
      },
      closeSuccess: () => set({ ui: { ...get().ui, success: null } }),
      setRadar: (id) => set({ ui: { ...get().ui, radarBookingId: id } }),

      /* ------------------------------ client ------------------------------ */
      takeTicket: (proId, serviceId) => {
        const { pros, bookings, me } = get();
        const pro = pros.find((p) => p.id === proId);
        if (!pro || !pro.isOpen) return { ok: false, error: 'closed' };
        const already = bookings.find(
          (b) => b.mine && b.proId === proId && b.type === 'queue' && ['pending', 'confirmed', 'in_progress'].includes(b.status),
        );
        if (already) return { ok: false, error: 'already' };
        const ticket = pro.lastTicket + 1;
        const price = pro.services.find((s) => s.id === serviceId)?.price ?? 0;
        set({
          pros: pros.map((p) => (p.id === proId ? { ...p, lastTicket: ticket } : p)),
          bookings: [
            ...bookings,
            { id: uid(), proId, serviceId, type: 'queue', status: 'confirmed', ticket, price, clientName: me.name, clientPhone: me.phone, mine: true, createdAt: nowIso() },
          ],
          ui: { ...get().ui, openProId: null, success: { kind: 'ticket', ticket, proName: pro.name } },
        });
        return { ok: true, ticket };
      },

      bookAppointment: (proId, serviceId, at, highlight) => {
        const { pros, bookings, me } = get();
        const pro = pros.find((p) => p.id === proId);
        if (!pro) return { ok: false, error: 'closed' };
        const iso = at.toISOString();
        if (bookings.some((b) => b.proId === proId && b.type === 'appointment' && b.scheduledAt === iso && b.status !== 'cancelled')) {
          return { ok: false, error: 'slot' };
        }
        const price = pro.services.find((s) => s.id === serviceId)?.price ?? 0;
        set({
          bookings: [
            ...bookings,
            { id: uid(), proId, serviceId, type: 'appointment', status: 'pending', scheduledAt: iso, price, clientName: me.name, clientPhone: me.phone, mine: true, createdAt: nowIso() },
          ],
          ui: { ...get().ui, openProId: null, success: { kind: 'rdv', highlight, proName: pro.name } },
        });
        return { ok: true };
      },

      requestSos: (proId, serviceId, data) => {
        const { pros, bookings, me } = get();
        const pro = pros.find((p) => p.id === proId);
        const id = uid();
        const price = pro?.services.find((s) => s.id === serviceId)?.price ?? 0;
        set({
          bookings: [
            ...bookings,
            { id, proId, serviceId, type: 'ondemand', status: 'pending', price, clientName: me.name, clientPhone: me.phone, mine: true, createdAt: nowIso(), ...data },
          ],
          ui: { ...get().ui, openProId: null, radarBookingId: id },
        });
        return id;
      },

      cancelBooking: (id) => set({ bookings: get().bookings.map((b) => (b.id === id ? { ...b, status: 'cancelled' } : b)) }),

      /* ------------------------------- pro -------------------------------- */
      setActivePro: (activeProId) => set({ activeProId }),

      toggleOpen: (proId) => set({ pros: get().pros.map((p) => (p.id === proId ? { ...p, isOpen: !p.isOpen } : p)) }),

      nextClient: (proId) => {
        const { pros, bookings } = get();
        const pro = pros.find((p) => p.id === proId);
        if (!pro) return null;
        let list = bookings.map((b) =>
          b.proId === proId && b.type === 'queue' && b.status === 'in_progress' ? { ...b, status: 'completed' as const } : b,
        );
        const next = list
          .filter((b) => b.proId === proId && b.type === 'queue' && (b.ticket ?? 0) > pro.currentQueue && (b.status === 'confirmed' || b.status === 'pending'))
          .sort((a, b) => (a.ticket ?? 0) - (b.ticket ?? 0))[0];
        if (!next) {
          set({ bookings: list });
          return null;
        }
        list = list.map((b) => (b.id === next.id ? { ...b, status: 'in_progress' as const } : b));
        set({ bookings: list, pros: pros.map((p) => (p.id === proId ? { ...p, currentQueue: next.ticket ?? p.currentQueue } : p)) });
        return next.ticket ?? null;
      },

      addWalkin: (proId, name, serviceId) => {
        const { pros, bookings } = get();
        const pro = pros.find((p) => p.id === proId) as Pro;
        const ticket = pro.lastTicket + 1;
        const price = pro.services.find((s) => s.id === serviceId)?.price ?? 0;
        set({
          pros: pros.map((p) => (p.id === proId ? { ...p, lastTicket: ticket } : p)),
          bookings: [...bookings, { id: uid(), proId, serviceId, type: 'queue', status: 'confirmed', ticket, price, clientName: name, walkin: true, createdAt: nowIso() }],
        });
        return ticket;
      },

      setBookingStatus: (id, status) => set({ bookings: get().bookings.map((b) => (b.id === id ? { ...b, status } : b)) }),

      addKridi: (k) => set({ kridi: [{ ...k, id: uid(), paid: false, createdAt: nowIso() }, ...get().kridi] }),
      markKridiPaid: (id) => set({ kridi: get().kridi.map((k) => (k.id === id ? { ...k, paid: true } : k)) }),

      upsertService: (proId, svc) =>
        set({
          pros: get().pros.map((p) =>
            p.id !== proId
              ? p
              : { ...p, services: p.services.some((s) => s.id === svc.id) ? p.services.map((s) => (s.id === svc.id ? svc : s)) : [...p.services, svc] },
          ),
        }),
      deleteService: (proId, serviceId) =>
        set({ pros: get().pros.map((p) => (p.id === proId ? { ...p, services: p.services.filter((s) => s.id !== serviceId) } : p)) }),

      resetDemo: () => set({ ...seedState(), ui: emptyUi, mode: 'client', view: 'app', clientTab: 'discover', proTab: 'guichet', cityId: 'casablanca', neighborhoodId: 'maarif', category: null, query: '', activeProId: 'p1' }),
    }),
    {
      name: 'allolm3lm-web-v1',
      version: 2,
      migrate: () => ({}),
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        lang: s.lang,
        cityId: s.cityId,
        neighborhoodId: s.neighborhoodId,
        radiusKm: s.radiusKm,
        activeProId: s.activeProId,
        pros: s.pros,
        bookings: s.bookings,
        kridi: s.kridi,
      }),
    },
  ),
);

/* ------------------------------ cross-tab sync ------------------------------ */
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'allolm3lm-web-v1') void useStore.persist.rehydrate();
  });
}

/* --------------------------------- selectors -------------------------------- */
export const engineOf = (pro: Pro) => categoryOf(pro.category).engine;
export const waitingOf = (pro: Pro) => Math.max(0, pro.lastTicket - pro.currentQueue);
export const AVG_SERVICE_MIN = 15;
