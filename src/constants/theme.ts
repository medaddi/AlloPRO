/**
 * AlloPro — Design System Tokens
 * Single source of truth for every JS-side style (Reanimated, SVG, StyleSheet).
 * tailwind.config.js mirrors these values for NativeWind classNames.
 */
import { Platform, type TextStyle, type ViewStyle } from 'react-native';

/* -------------------------------------------------------------------------- */
/*                                   COLORS                                   */
/* -------------------------------------------------------------------------- */

export const colors = {
  primary: {
    DEFAULT: '#1D4355', // Deep Slate Blue — headers, outlines, brand
    light: '#2E5F75',
    dark: '#132D39',
    soft: '#E8EEF1',
  },
  accent: {
    DEFAULT: '#F08A4B', // Vibrant Coral Orange — CTAs, gears, checkmarks
    light: '#F6AD80',
    dark: '#D9702F',
    soft: '#FEF1E9',
  },
  secondary: {
    teal: '#A5C4C4', // Soft Mint Teal — radar waves, pills, selected borders
    tealLight: '#DCEAEA',
    tealDark: '#7FA6A6',
  },
  background: {
    main: '#F4F7F7', // Screen canvas
    surface: '#FFFFFF', // Cards, sheets, modals
  },
  text: {
    primary: '#1D4355',
    secondary: '#607D8B',
    muted: '#90A4AE',
    inverse: '#FFFFFF',
  },
  border: {
    DEFAULT: '#DCE6E6',
    strong: '#C5D4D4',
  },
  status: {
    online: '#10B981', // Ouvert / مفتوح, Confirmed, Kridi paid
    onlineSoft: '#E7F8F1',
    busy: '#F59E0B', // Waiting, Pending
    busySoft: '#FEF5E6',
    offline: '#EF4444', // Fermé / مغلق, Cancelled, Kridi unpaid
    offlineSoft: '#FDECEC',
    closed: '#9AA9B0', // Grey map dot for closed pros
  },
  overlay: 'rgba(19, 45, 57, 0.45)',
  transparent: 'transparent',
} as const;

export type BookingEngine = 'queue' | 'appointment' | 'ondemand';
export type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

/** Pill colors for each booking status (background + foreground). */
export const bookingStatusColors: Record<BookingStatus, { bg: string; fg: string }> = {
  pending: { bg: colors.status.busySoft, fg: colors.status.busy },
  confirmed: { bg: colors.status.onlineSoft, fg: colors.status.online },
  in_progress: { bg: colors.accent.soft, fg: colors.accent.dark },
  completed: { bg: colors.primary.soft, fg: colors.primary.DEFAULT },
  cancelled: { bg: colors.status.offlineSoft, fg: colors.status.offline },
};

/* -------------------------------------------------------------------------- */
/*                                 TYPOGRAPHY                                 */
/* -------------------------------------------------------------------------- */

export type AppLanguage = 'fr' | 'ar';
export type FontWeightToken = 'medium' | 'semibold' | 'bold';

/** Names must match the keys loaded with useFonts() in the root layout. */
export const fontFamilies = {
  fr: {
    medium: 'PlusJakartaSans_500Medium',
    semibold: 'PlusJakartaSans_600SemiBold',
    bold: 'PlusJakartaSans_700Bold',
  },
  ar: {
    medium: 'Cairo_500Medium',
    semibold: 'Cairo_600SemiBold',
    bold: 'Cairo_700Bold',
  },
} as const satisfies Record<AppLanguage, Record<FontWeightToken, string>>;

/** Numbers, prices, tickets & phones always use the Latin font (LTR legibility). */
export const numericFontFamily = fontFamilies.fr;

export const getFontFamily = (lang: AppLanguage, weight: FontWeightToken = 'medium'): string =>
  fontFamilies[lang][weight];

/** Maps any i18next language code ('ar', 'ar-MA', 'fr-FR', undefined…) to an AppLanguage. */
export const toAppLanguage = (code: string | null | undefined): AppLanguage =>
  code && code.toLowerCase().startsWith('ar') ? 'ar' : 'fr';

export const fontSizes = {
  caption: 12,
  small: 13,
  body: 15,
  bodyLarge: 16,
  title: 18,
  headline: 24,
  display: 34,
  ticket: 72,
} as const;

/** Cairo has taller ascenders/descenders: give Arabic text extra line height. */
export const lineHeightFor = (size: number, lang: AppLanguage): number =>
  Math.round(size * (lang === 'ar' ? 1.6 : 1.4));

export const textStyle = (
  lang: AppLanguage,
  size: keyof typeof fontSizes = 'body',
  weight: FontWeightToken = 'medium',
  color: string = colors.text.primary,
): TextStyle => ({
  fontFamily: getFontFamily(lang, weight),
  fontSize: fontSizes[size],
  lineHeight: lineHeightFor(fontSizes[size], lang),
  color,
  textAlign: 'auto',
  writingDirection: lang === 'ar' ? 'rtl' : 'ltr',
});

/** For ticket numbers, prices, times and +212 phones — forced LTR in both languages. */
export const numericTextStyle = (
  size: keyof typeof fontSizes = 'body',
  weight: FontWeightToken = 'bold',
  color: string = colors.text.primary,
): TextStyle => ({
  fontFamily: numericFontFamily[weight],
  fontSize: fontSizes[size],
  lineHeight: Math.round(fontSizes[size] * 1.2),
  color,
  writingDirection: 'ltr',
  fontVariant: ['tabular-nums'],
});

/* -------------------------------------------------------------------------- */
/*                           SPACING, RADII & SIZES                           */
/* -------------------------------------------------------------------------- */

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
  gutter: 20,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  btn: 16,
  card: 20,
  sheet: 28,
  pill: 999,
} as const;

export const sizes = {
  buttonHeight: 54,
  inputHeight: 52,
  minTouch: 44,
  iconSm: 16,
  iconMd: 20,
  iconLg: 24,
  iconXl: 32,
  avatar: 44,
  tabBarHeight: Platform.select({ ios: 84, default: 68 }) as number,
  /** Primary CTAs live in the bottom 25% of the screen. */
  thumbZoneRatio: 0.25,
  borderWidth: 1,
} as const;

export const hitSlop = { top: 10, bottom: 10, left: 10, right: 10 } as const;

/* -------------------------------------------------------------------------- */
/*                                   SHADOWS                                  */
/* -------------------------------------------------------------------------- */

const makeShadow = (opacity: number, radius: number, offsetY: number, elevation: number): ViewStyle => ({
  shadowColor: colors.primary.DEFAULT,
  shadowOpacity: opacity,
  shadowRadius: radius,
  shadowOffset: { width: 0, height: offsetY },
  elevation,
});

export const shadows = {
  none: makeShadow(0, 0, 0, 0),
  /** Spec default: ultra-soft natural card shadow. */
  card: makeShadow(0.05, 10, 4, 2),
  raised: makeShadow(0.08, 16, 6, 4),
  sheet: makeShadow(0.1, 24, -4, 12),
  cta: { ...makeShadow(0.18, 12, 6, 4), shadowColor: colors.accent.DEFAULT } as ViewStyle,
} as const;

/** Flat card surface: white + 1px #DCE6E6 border + soft shadow. */
export const cardSurface: ViewStyle = {
  backgroundColor: colors.background.surface,
  borderRadius: radii.card,
  borderWidth: sizes.borderWidth,
  borderColor: colors.border.DEFAULT,
  ...shadows.card,
};

/* -------------------------------------------------------------------------- */
/*                         MOTION & TACTILE FEEDBACK                          */
/* -------------------------------------------------------------------------- */

export const motion = {
  pressScale: 0.98,
  pressDuration: 110,
  spring: {
    /** Splash 'A' bounce & general UI springs. */
    gentle: { damping: 12, stiffness: 100, mass: 1 },
    /** Snappy press-release. */
    snappy: { damping: 18, stiffness: 260, mass: 0.8 },
    /** Success pop (overshoots to ~1.15 before settling). */
    elastic: { damping: 7, stiffness: 140, mass: 0.9 },
  },
  duration: {
    fast: 150,
    base: 250,
    slow: 400,
    checkmarkDraw: 600,
    confettiBurst: 800,
    pinFloat: 1500,
    radarWave: 2000,
    gearLoading: 2000,
    gearSplash: 4000,
  },
  radar: {
    waves: 3,
    scaleFrom: 0.5,
    scaleTo: 2.5,
    opacityFrom: 0.8,
    pinFloatRange: 5,
  },
  confetti: {
    particles: 10,
    popPeak: 1.15,
  },
} as const;

/* -------------------------------------------------------------------------- */
/*                         ENGINE & CATEGORY VISUALS                          */
/* -------------------------------------------------------------------------- */

export type CategorySlug = 'coiffure' | 'sante' | 'bricolage' | 'auto' | 'sport' | 'services';

/** Matches categories.icon values seeded in Supabase (lucide-react-native names). */
export const categoryVisuals: Record<
  CategorySlug,
  { icon: 'Scissors' | 'Stethoscope' | 'Wrench' | 'Car' | 'Trophy' | 'Home'; tint: string; engine: BookingEngine }
> = {
  coiffure: { icon: 'Scissors', tint: colors.accent.soft, engine: 'queue' },
  sante: { icon: 'Stethoscope', tint: colors.secondary.tealLight, engine: 'appointment' },
  bricolage: { icon: 'Wrench', tint: colors.accent.soft, engine: 'ondemand' },
  auto: { icon: 'Car', tint: colors.primary.soft, engine: 'queue' },
  sport: { icon: 'Trophy', tint: colors.secondary.tealLight, engine: 'appointment' },
  services: { icon: 'Home', tint: colors.primary.soft, engine: 'appointment' },
};

/* -------------------------------------------------------------------------- */
/*                                 AGGREGATE                                  */
/* -------------------------------------------------------------------------- */

export const theme = {
  colors,
  bookingStatusColors,
  fontFamilies,
  fontSizes,
  spacing,
  radii,
  sizes,
  shadows,
  cardSurface,
  motion,
  hitSlop,
  categoryVisuals,
} as const;

export type Theme = typeof theme;
export default theme;
