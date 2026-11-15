/**
 * AlloPro — Root layout.
 * Boot sequence: native splash → fonts → animated SplashLogoAnimation while
 * i18n (+RTL), persisted store and Supabase session load → route guard.
 */
import '../../global.css';

import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Cairo_500Medium, Cairo_600SemiBold, Cairo_700Bold } from '@expo-google-fonts/cairo';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import Animated, { FadeOut } from 'react-native-reanimated';
import type { Session } from '@supabase/supabase-js';

import SplashLogoAnimation from '../components/animations/SplashLogoAnimation';
import { colors } from '../constants/theme';
import i18n, { initI18n } from '../i18n';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    Cairo_500Medium,
    Cairo_600SemiBold,
    Cairo_700Bold,
  });
  const fontsReady = fontsLoaded || !!fontError;

  const [i18nReady, setI18nReady] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [introDone, setIntroDone] = useState(false);

  const hasHydrated = useAppStore((s) => s.hasHydrated);
  const user = useAppStore((s) => s.user);
  const profileLoading = useAppStore((s) => s.profileLoading);
  const activeMode = useAppStore((s) => s.activeMode);

  /* ---------------------------------- i18n --------------------------------- */
  useEffect(() => {
    initI18n()
      .then((lang) => useAppStore.getState().syncLanguage(lang))
      .catch((err) => {
        if (__DEV__) console.warn('[AlloPro] i18n init failed', err);
      })
      .finally(() => setI18nReady(true));
  }, []);

  /* ---------------------------------- auth --------------------------------- */
  useEffect(() => {
    let mounted = true;

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!mounted) return;
        setSession(data.session);
        if (data.session) {
          await useAppStore
            .getState()
            .loadProfile()
            .catch((err) => {
              if (__DEV__) console.warn('[AlloPro] loadProfile failed', err);
            });
        }
      })
      .finally(() => mounted && setAuthReady(true));

    const { data: subscription } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (event === 'SIGNED_OUT') {
        useAppStore.setState({ user: null, proProfile: null });
      }
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        // Never await Supabase calls inside this callback (supabase-js deadlock); defer instead.
        setTimeout(() => {
          useAppStore
            .getState()
            .loadProfile()
            .catch(() => undefined);
        }, 0);
      }
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const appReady = fontsReady && i18nReady && authReady && hasHydrated;

  /* ------------------------------ route guard ------------------------------ */
  const segments = useSegments();
  const router = useRouter();
  const navState = useRootNavigationState();

  useEffect(() => {
    if (!appReady || !navState?.key) return;
    const group = segments[0] as string | undefined;
    const inAuth = group === '(auth)';

    if (!session) {
      if (!inAuth) router.replace('/welcome');
      return;
    }
    if (!user) {
      // Signed in but sign-up not finished (e.g. app closed on the name step).
      if (!inAuth && !profileLoading) router.replace({ pathname: '/login', params: { step: 'profile' } });
      return;
    }
    if (inAuth || !group) {
      router.replace(activeMode === 'pro' ? '/(pro)' : '/(client)');
    }
  }, [appReady, navState?.key, segments, session, user, profileLoading, activeMode, router]);

  /* --------------------------------- splash -------------------------------- */
  const onRootLayout = useCallback(() => {
    if (fontsReady) SplashScreen.hideAsync().catch(() => undefined);
  }, [fontsReady]);

  const handleIntroFinish = useCallback(() => setIntroDone(true), []);

  if (!fontsReady) return null;

  const showSplash = !(appReady && introDone);

  return (
    <GestureHandlerRootView style={styles.root} onLayout={onRootLayout}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'fade',
              contentStyle: { backgroundColor: colors.background.main },
            }}
          />
          {showSplash && (
            <Animated.View exiting={FadeOut.duration(320)} style={[StyleSheet.absoluteFill, styles.splash]}>
              <SplashLogoAnimation size={150} onFinish={handleIntroFinish} />
            </Animated.View>
          )}
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background.main,
  },
  splash: {
    backgroundColor: colors.background.main,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  errorWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    color: colors.text.primary,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  errorButton: {
    backgroundColor: colors.accent.DEFAULT,
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  errorButtonText: {
    color: colors.text.inverse,
    fontSize: 16,
  },
});

/** Shown by Expo Router if a screen throws: keeps the brand canvas instead of a red box. */
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => Promise<void> }) {
  if (__DEV__) console.error(error);
  const message = i18n.isInitialized ? i18n.t('errors.generic') : 'Un problème est survenu. Réessayez.';
  const retryLabel = i18n.isInitialized ? i18n.t('common.retry') : 'Réessayer';

  return (
    <View style={[styles.root, styles.errorWrap]}>
      <Text style={styles.errorText}>{message}</Text>
      <Pressable onPress={retry} style={styles.errorButton} accessibilityRole="button">
        <Text style={styles.errorButtonText}>{retryLabel}</Text>
      </Pressable>
    </View>
  );
}
