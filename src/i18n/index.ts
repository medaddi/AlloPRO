/**
 * AlloPro — Bilingual engine (Français LTR / العربية-الدارجة RTL).
 *
 * - Language priority: saved choice → device locale → French.
 * - RTL is applied with I18nManager; React Native only flips the layout after a
 *   restart, so we reload the app once when the direction changes.
 * - Intl.PluralRules polyfill: Hermes does not ship it, and Arabic needs
 *   zero/one/two/few/many/other plural forms.
 */
import 'intl-pluralrules';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import * as Updates from 'expo-updates';
import i18n from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import { DevSettings, I18nManager } from 'react-native';

import { toAppLanguage, type AppLanguage } from '../constants/theme';
import ar from './ar.json';
import fr from './fr.json';

export type { AppLanguage };

export const LANGUAGE_STORAGE_KEY = 'allopro.language';
const RTL_RELOAD_GUARD_KEY = 'allopro.rtlReloadFor';

export const SUPPORTED_LANGUAGES: readonly AppLanguage[] = ['fr', 'ar'] as const;

export const resources = {
  fr: { translation: fr },
  ar: { translation: ar },
} as const;

export const isRTLLanguage = (lang: AppLanguage): boolean => lang === 'ar';

/* -------------------------------------------------------------------------- */
/*                                  DETECTION                                 */
/* -------------------------------------------------------------------------- */

export function detectDeviceLanguage(): AppLanguage {
  try {
    for (const locale of getLocales()) {
      if (locale.languageCode === 'ar') return 'ar';
      if (locale.languageCode === 'fr') return 'fr';
    }
  } catch {
    // expo-localization unavailable (tests / web edge cases) → default below.
  }
  return 'fr';
}

export async function getStoredLanguage(): Promise<AppLanguage | null> {
  try {
    const value = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    return value === 'fr' || value === 'ar' ? value : null;
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/*                                 DIRECTION                                  */
/* -------------------------------------------------------------------------- */

/**
 * Applies the native layout direction for a language.
 * Returns true when the running app still has the other direction (reload needed).
 */
export function applyLayoutDirection(lang: AppLanguage): boolean {
  const rtl = isRTLLanguage(lang);
  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
  I18nManager.swapLeftAndRightInRTL(true);
  return I18nManager.isRTL !== rtl;
}

export async function reloadApp(): Promise<void> {
  if (__DEV__) {
    DevSettings.reload();
    return;
  }
  try {
    await Updates.reloadAsync();
  } catch {
    DevSettings.reload();
  }
}

/**
 * Reloads once if the direction is wrong. The guard stops infinite loops when
 * RTL support is not enabled natively (app.json → extra.supportsRTL).
 */
async function reloadOnceForDirection(lang: AppLanguage): Promise<boolean> {
  const alreadyTried = await AsyncStorage.getItem(RTL_RELOAD_GUARD_KEY).catch(() => null);
  if (alreadyTried === lang) {
    if (__DEV__) {
      console.warn(
        `[AlloPro i18n] Layout direction still wrong for "${lang}" after a reload. Check "extra.supportsRTL": true in app.json and rebuild the dev client.`,
      );
    }
    return false;
  }
  await AsyncStorage.setItem(RTL_RELOAD_GUARD_KEY, lang).catch(() => undefined);
  await reloadApp();
  return true;
}

async function clearReloadGuard(): Promise<void> {
  await AsyncStorage.removeItem(RTL_RELOAD_GUARD_KEY).catch(() => undefined);
}

/* -------------------------------------------------------------------------- */
/*                                    INIT                                    */
/* -------------------------------------------------------------------------- */

let initPromise: Promise<AppLanguage> | null = null;

/**
 * Call once from the root layout before hiding the splash screen.
 * Resolves with the active language. May trigger a one-time reload to flip RTL.
 */
export function initI18n(): Promise<AppLanguage> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const lang = (await getStoredLanguage()) ?? detectDeviceLanguage();

    await i18n.use(initReactI18next).init({
      resources,
      lng: lang,
      fallbackLng: 'fr',
      supportedLngs: SUPPORTED_LANGUAGES as AppLanguage[],
      compatibilityJSON: 'v4',
      interpolation: { escapeValue: false },
      returnNull: false,
      react: { useSuspense: false },
    });

    const needsReload = applyLayoutDirection(lang);
    if (needsReload) {
      await reloadOnceForDirection(lang);
    } else {
      await clearReloadGuard();
    }
    return lang;
  })();

  return initPromise;
}

/* -------------------------------------------------------------------------- */
/*                               CHANGE LANGUAGE                              */
/* -------------------------------------------------------------------------- */

/**
 * Switches language, saves it, and reloads the app if the direction changes
 * (FR ⇄ AR always does). Pass { reload: false } to defer the reload (e.g. to
 * show a confirmation first) and call reloadApp() yourself.
 */
export async function changeLanguage(
  lang: AppLanguage,
  options: { reload?: boolean } = {},
): Promise<{ needsReload: boolean }> {
  const { reload = true } = options;
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang).catch(() => undefined);
  await i18n.changeLanguage(lang);
  const needsReload = applyLayoutDirection(lang);
  if (needsReload && reload) {
    await clearReloadGuard();
    await reloadApp();
  }
  return { needsReload };
}

/* -------------------------------------------------------------------------- */
/*                                    HOOK                                    */
/* -------------------------------------------------------------------------- */

const MIRROR = [{ scaleX: -1 }] as const;
const NO_MIRROR = [{ scaleX: 1 }] as const;

/**
 * One hook for every screen:
 *   const { t, lang, isRTL, mirror, setLanguage } = useAppLanguage();
 * `mirror` is a transform for directional icons (arrows, chevrons, back buttons).
 */
export function useAppLanguage() {
  const { t, i18n: instance } = useTranslation();
  const lang = toAppLanguage(instance.language);
  const isRTL = isRTLLanguage(lang);
  return {
    t,
    lang,
    isRTL,
    dir: (isRTL ? 'rtl' : 'ltr') as 'rtl' | 'ltr',
    mirror: isRTL ? MIRROR : NO_MIRROR,
    setLanguage: changeLanguage,
  };
}

export default i18n;
