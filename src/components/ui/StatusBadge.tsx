/**
 * AlloPro — Status pill (Ouvert / Fermé, queue count, booking status).
 * Dot + label; optional pulsing dot for live states.
 */
import { useEffect } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useAppLanguage } from '../../i18n';
import { colors, getFontFamily, radii } from '../../constants/theme';
import type { BookingStatus } from '../../lib/supabase';

export type BadgeTone = 'online' | 'busy' | 'offline' | 'accent' | 'neutral' | 'primary';

const TONES: Record<BadgeTone, { bg: string; fg: string; dot: string }> = {
  online: { bg: colors.status.onlineSoft, fg: '#0B7F5A', dot: colors.status.online },
  busy: { bg: colors.status.busySoft, fg: '#A86A05', dot: colors.status.busy },
  offline: { bg: colors.status.offlineSoft, fg: '#C02E2E', dot: colors.status.offline },
  accent: { bg: colors.accent.soft, fg: colors.accent.dark, dot: colors.accent.DEFAULT },
  neutral: { bg: colors.background.main, fg: colors.text.secondary, dot: colors.status.closed },
  primary: { bg: colors.primary.soft, fg: colors.primary.DEFAULT, dot: colors.primary.DEFAULT },
};

export const bookingStatusTone: Record<BookingStatus, BadgeTone> = {
  pending: 'busy',
  confirmed: 'online',
  in_progress: 'accent',
  completed: 'primary',
  cancelled: 'offline',
};

type Props = {
  label: string;
  tone?: BadgeTone;
  /** Show the colored dot (default true). */
  dot?: boolean;
  /** Pulse the dot for live states ("Ouvert", "En direct"). */
  pulse?: boolean;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
};

export default function StatusBadge({ label, tone = 'neutral', dot = true, pulse = false, size = 'sm', style }: Props) {
  const { lang } = useAppLanguage();
  const palette = TONES[tone];
  const small = size === 'sm';

  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: palette.bg, paddingVertical: small ? 4 : 6, paddingHorizontal: small ? 10 : 12 },
        style,
      ]}
      accessibilityRole="text"
      accessibilityLabel={label}
    >
      {dot && <Dot color={palette.dot} pulse={pulse} size={small ? 7 : 8} />}
      <Text
        numberOfLines={1}
        style={[
          styles.label,
          {
            color: palette.fg,
            fontFamily: getFontFamily(lang, 'semibold'),
            fontSize: small ? 12 : 13,
            lineHeight: lang === 'ar' ? (small ? 18 : 20) : small ? 16 : 18,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function Dot({ color, pulse, size }: { color: string; pulse: boolean; size: number }) {
  const reduceMotion = useReducedMotion();
  const p = useSharedValue(0);

  useEffect(() => {
    if (!pulse || reduceMotion) {
      cancelAnimation(p);
      p.value = 0;
      return;
    }
    p.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }), -1, false);
    return () => cancelAnimation(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pulse, reduceMotion]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(p.value, [0, 1], [0.6, 0]),
    transform: [{ scale: interpolate(p.value, [0, 1], [1, 2.4]) }],
  }));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {pulse && (
        <Animated.View
          style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color }, ringStyle]}
        />
      )}
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    borderRadius: radii.pill,
  },
  label: {
    includeFontPadding: false,
  },
});
