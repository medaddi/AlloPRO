/**
 * AlloPro — Global app state (Zustand + AsyncStorage persistence).
 * Holds: signed-in user, pro profile, active mode (client/pro), language mirror,
 * selected city/neighborhood and last known GPS position.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { AppLanguage } from '../constants/theme';
import {
  DEFAULT_CITY_SLUG,
  DEFAULT_NEIGHBORHOOD_SLUG,
  findCityByName,
  getCity,
  isInsideMorocco,
  nearestCity,
  type LatLng,
} from '../constants/moroccoCities';
import { changeLanguage } from '../i18n';
import { supabase, type ProProfileRow, type UserRow } from '../lib/supabase';

export type AppMode = 'client' | 'pro';

type AppState = {
  /* ------------------------------- session ------------------------------- */
  user: UserRow | null;
  proProfile: ProProfileRow | null;
  profileLoading: boolean;

  /* ----------------------------- preferences ----------------------------- */
  activeMode: AppMode;
  language: AppLanguage;
  selectedCity: string;
  selectedNeighborhood: string | null;
  /** True once the user picked a city by hand (GPS no longer overrides it). */
  cityChosenManually: boolean;
  hasOnboarded: boolean;

  /* ------------------------------- runtime ------------------------------- */
  userLocation: LatLng | null;
  hasHydrated: boolean;

  /* ------------------------------- actions ------------------------------- */
  setHasHydrated: (value: boolean) => void;
  setUser: (user: UserRow | null) => void;
  setProProfile: (pro: ProProfileRow | null) => void;
  /** Merge fields after a local edit or a Realtime update. */
  patchProProfile: (patch: Partial<ProProfileRow>) => void;
  loadProfile: () => Promise<{ user: UserRow | null; proProfile: ProProfileRow | null }>;

  setActiveMode: (mode: AppMode) => void;
  toggleMode: () => AppMode;

  /** Mirrors i18n after initI18n() (no reload, no network). */
  syncLanguage: (lang: AppLanguage) => void;
  /** User-facing switch: saves, updates Supabase profile, reloads if direction changes. */
  setLanguage: (lang: AppLanguage) => Promise<void>;

  setCity: (slug: string) => void;
  setNeighborhood: (slug: string | null) => void;
  setUserLocation: (pos: LatLng | null) => void;

  completeOnboarding: () => void;
  signOut: () => Promise<void>;
};

const initialSession = {
  user: null,
  proProfile: null,
  profileLoading: false,
} satisfies Partial<AppState>;

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialSession,
      activeMode: 'client',
      language: 'fr',
      selectedCity: DEFAULT_CITY_SLUG,
      selectedNeighborhood: DEFAULT_NEIGHBORHOOD_SLUG,
      cityChosenManually: false,
      hasOnboarded: false,
      userLocation: null,
      hasHydrated: false,

      setHasHydrated: (value) => set({ hasHydrated: value }),

      setUser: (user) => set({ user }),

      setProProfile: (proProfile) => set({ proProfile }),

      patchProProfile: (patch) => {
        const current = get().proProfile;
        if (current) set({ proProfile: { ...current, ...patch } });
      },

      loadProfile: async () => {
        set({ profileLoading: true });
        try {
          const {
            data: { user: authUser },
          } = await supabase.auth.getUser();

          if (!authUser) {
            set({ ...initialSession });
            return { user: null, proProfile: null };
          }

          const [{ data: user, error: userError }, { data: proProfile, error: proError }] = await Promise.all([
            supabase.from('users').select('*').eq('id', authUser.id).maybeSingle(),
            supabase.from('pro_profiles').select('*').eq('user_id', authUser.id).maybeSingle(),
          ]);
          if (userError) throw userError;
          if (proError) throw proError;

          set({ user: user ?? null, proProfile: proProfile ?? null });

          // Use the city saved on the account unless the user already chose one on this device.
          if (user?.city && !get().cityChosenManually) {
            const city = findCityByName(user.city) ?? getCity(DEFAULT_CITY_SLUG);
            set({ selectedCity: city.slug, selectedNeighborhood: city.neighborhoods[0]?.slug ?? null });
          }

          return { user: user ?? null, proProfile: proProfile ?? null };
        } finally {
          set({ profileLoading: false });
        }
      },

      setActiveMode: (activeMode) => set({ activeMode }),

      toggleMode: () => {
        const next: AppMode = get().activeMode === 'client' ? 'pro' : 'client';
        set({ activeMode: next });
        return next;
      },

      syncLanguage: (language) => set({ language }),

      setLanguage: async (language) => {
        set({ language });
        const user = get().user;
        if (user && user.language !== language) {
          set({ user: { ...user, language } });
          // Saved server-side so push notifications & WhatsApp templates use the right language.
          await supabase
            .from('users')
            .update({ language })
            .eq('id', user.id)
            .then(({ error }) => {
              if (error && __DEV__) console.warn('[AlloPro] language sync failed:', error.message);
            });
        }
        // Last: may reload the JS bundle to flip RTL/LTR.
        await changeLanguage(language);
      },

      setCity: (slug) => {
        const city = getCity(slug);
        set({
          selectedCity: city.slug,
          selectedNeighborhood: city.neighborhoods[0]?.slug ?? null,
          cityChosenManually: true,
        });
      },

      setNeighborhood: (selectedNeighborhood) => set({ selectedNeighborhood }),

      setUserLocation: (pos) => {
        set({ userLocation: pos });
        if (!pos || get().cityChosenManually || !isInsideMorocco(pos)) return;
        const city = nearestCity(pos);
        if (city.slug !== get().selectedCity) {
          set({ selectedCity: city.slug, selectedNeighborhood: city.neighborhoods[0]?.slug ?? null });
        }
      },

      completeOnboarding: () => set({ hasOnboarded: true }),

      signOut: async () => {
        try {
          await supabase.auth.signOut();
        } finally {
          set({ ...initialSession, activeMode: 'client' });
        }
      },
    }),
    {
      name: 'allopro.store',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      // Session data always comes fresh from Supabase; only preferences are persisted.
      partialize: (state) => ({
        activeMode: state.activeMode,
        language: state.language,
        selectedCity: state.selectedCity,
        selectedNeighborhood: state.selectedNeighborhood,
        cityChosenManually: state.cityChosenManually,
        hasOnboarded: state.hasOnboarded,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

/* -------------------------------------------------------------------------- */
/*                                 SELECTORS                                  */
/* -------------------------------------------------------------------------- */

export const selectIsSignedIn = (s: AppState) => !!s.user;
export const selectHasProProfile = (s: AppState) => !!s.proProfile;
export const selectIsProMode = (s: AppState) => s.activeMode === 'pro';
export const selectCity = (s: AppState) => getCity(s.selectedCity);
