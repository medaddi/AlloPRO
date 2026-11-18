/**
 * ALLO LM3LM — Gear loading & progress bar (replaces generic spinners).
 * - Orange gear rotates 360° every 2000ms (linear)
 * - 8px rounded bar: teal track, orange fill, width animated with a cubic-bezier ease-out
 *
 * Two modes:
 *  • Controlled: pass `progress` (0..1) — the bar eases to each new value.
 *  • Auto: omit `progress` — the bar fills 0 → 100% over `duration`, then calls `onComplete`.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import {
  colors,
  getFontFamily,
  lineHeightFor,
  motion,
  numericTextStyle,
  toAppLanguage,
} from '../../constants/theme';
import { GearIcon } from './shapes';

const EASE_OUT = Easing.bezier(0.22, 1, 0.36, 1);
const TRACK_HEIGHT = 8;

type Props = {
  /** 0..1 — controlled mode. Leave undefined for auto mode. */
  progress?: number;
  /** Auto mode fill duration in ms. */
  duration?: number;
  /** Auto mode: fired once the bar reaches 100%. */
  onComplete?: () => void;
  /** Text above the bar. Pass null to hide. */
  label?: string | null;
  showPercent?: boolean;
  gearSize?: number;
  width?: DimensionValue;
  style?: StyleProp<ViewStyle>;
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0));

export default function GearLoadingProgress({
  progress,
  duration = 2400,
  onComplete,
  label,
  showPercent = true,
  gearSize = 36,
  width = '100%',
  style,
}: Props) {
  const { t, i18n } = useTranslation();
  const lang = toAppLanguage(i18n.language);
  const reduceMotion = useReducedMotion();

  const fill = useSharedValue(0);
  const rotation = useSharedValue(0);
  const [percent, setPercent] = useState(0);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const complete = useCallback(() => onCompleteRef.current?.(), []);

  const isControlled = progress != null;

  // Gear spin (independent of the bar).
  useEffect(() => {
    if (reduceMotion) {
      rotation.value = 0;
      return;
    }
    rotation.value = withRepeat(
      withTiming(360, { duration: motion.duration.gearLoading, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(rotation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  // Controlled mode: ease towards each new value.
  useEffect(() => {
    if (!isControlled) return;
    fill.value = withTiming(clamp01(progress as number), {
      duration: reduceMotion ? 0 : 600,
      easing: EASE_OUT,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isControlled, progress, reduceMotion]);

  // Auto mode: 0 → 1 once per mount / duration change.
  useEffect(() => {
    if (isControlled) return;
    fill.value = 0;
    fill.value = withTiming(1, { duration: reduceMotion ? 0 : duration, easing: EASE_OUT }, (finished) => {
      if (finished) runOnJS(complete)();
    });
    return () => cancelAnimation(fill);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isControlled, duration, reduceMotion, complete]);

  // Only push to JS when the integer percentage changes.
  useAnimatedReaction(
    () => Math.round(fill.value * 100),
    (current, previous) => {
      if (current !== previous) runOnJS(setPercent)(current);
    },
    [],
  );

  const gearStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: `${fill.value * 100}%`,
  }));

  const resolvedLabel =
    label === null ? null : label ?? t('loading.label', { defaultValue: 'Chargement en cours…' });

  return (
    <View
      style={[styles.root, { width }, style]}
      accessibilityRole="progressbar"
      accessibilityLabel={resolvedLabel ?? undefined}
      accessibilityValue={{ min: 0, max: 100, now: percent }}
    >
      <Animated.View style={[{ width: gearSize, height: gearSize }, gearStyle]}>
        <GearIcon size={gearSize} color={colors.accent.DEFAULT} />
      </Animated.View>

      <View style={styles.body}>
        {(resolvedLabel || showPercent) && (
          <View style={styles.labelRow}>
            {resolvedLabel ? (
              <Text
                numberOfLines={1}
                style={[
                  styles.label,
                  { fontFamily: getFontFamily(lang, 'semibold'), lineHeight: lineHeightFor(14, lang) },
                ]}
              >
                {resolvedLabel}
              </Text>
            ) : (
              <View style={styles.flex} />
            )}
            {showPercent && <Text style={styles.percent}>{`${percent}%`}</Text>}
          </View>
        )}

        <View style={styles.track}>
          <Animated.View style={[styles.fill, fillStyle]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  body: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  label: {
    flex: 1,
    fontSize: 14,
    color: colors.text.primary,
    textAlign: 'auto',
  },
  percent: {
    ...numericTextStyle('small', 'bold', colors.accent.dark),
  },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: colors.secondary.teal,
    overflow: 'hidden',
  },
  fill: {
    // flex-start = logical start, so the bar grows from the right in Arabic (RTL).
    alignSelf: 'flex-start',
    height: '100%',
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: colors.accent.DEFAULT,
  },
});
