/**
 * ALLO LM3LM — Success pop-up (queue ticket taken / booking confirmed).
 * - Pin with checkmark pops 0 → 1.15 → settles at 1.0 (elastic spring)
 * - 10 star & dot particles (#F08A4B / #A5C4C4) burst radially and fade over 800ms
 * - Success haptic on open; CTA sits in the thumb zone (bottom sheet layout)
 */
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import {
  colors,
  getFontFamily,
  lineHeightFor,
  motion,
  numericTextStyle,
  radii,
  shadows,
  toAppLanguage,
} from '../../constants/theme';
import PrimaryButton, { triggerHaptic } from '../ui/PrimaryButton';
import { LocationPinCheck, starPath } from './shapes';

const BURST_SIZE = 200;
const PIN_WIDTH = 64;
const STAR_D = starPath(12, 12, 11, 5);

type Particle = { angle: number; distance: number; kind: 'star' | 'dot'; color: string; size: number };

const PARTICLES: Particle[] = Array.from({ length: motion.confetti.particles }, (_, i) => {
  const isStar = i % 2 === 0;
  return {
    angle: (i / motion.confetti.particles) * Math.PI * 2 - Math.PI / 2 + (i % 3) * 0.08,
    distance: isStar ? 84 : 66,
    kind: isStar ? 'star' : 'dot',
    color: i % 4 === 0 || i % 4 === 3 ? colors.accent.DEFAULT : colors.secondary.teal,
    size: isStar ? 16 : 9,
  };
});

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  /** Queue engine: big "#15" ticket display. */
  ticketNumber?: number | null;
  /** Appointment / SOS: e.g. "Mardi 12 nov. • 15:30". Rendered LTR-safe by caller. */
  highlight?: string | null;
  ctaLabel?: string;
  /** Optional second action (e.g. "Voir mes réservations"). */
  secondaryLabel?: string;
  onSecondary?: () => void;
};

export default function SuccessConfettiPopup({
  visible,
  onClose,
  title,
  subtitle,
  ticketNumber,
  highlight,
  ctaLabel,
  secondaryLabel,
  onSecondary,
}: Props) {
  const { t, i18n } = useTranslation();
  const lang = toAppLanguage(i18n.language);
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();

  // Keep the Modal mounted while the exit animation plays.
  const [mounted, setMounted] = useState(visible);

  const backdrop = useSharedValue(0);
  const sheet = useSharedValue(0);
  const pinScale = useSharedValue(0);
  const burst = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      backdrop.value = 0;
      sheet.value = 0;
      pinScale.value = 0;
      burst.value = 0;

      triggerHaptic('success');

      if (reduceMotion) {
        backdrop.value = 1;
        sheet.value = 1;
        pinScale.value = 1;
        burst.value = 1;
        return;
      }

      backdrop.value = withTiming(1, { duration: motion.duration.base });
      sheet.value = withSpring(1, motion.spring.gentle);
      pinScale.value = withDelay(
        120,
        withSequence(
          withTiming(motion.confetti.popPeak, { duration: 260, easing: Easing.out(Easing.cubic) }),
          withSpring(1, motion.spring.elastic),
        ),
      );
      burst.value = withDelay(
        220,
        withTiming(1, { duration: motion.duration.confettiBurst, easing: Easing.out(Easing.quad) }),
      );
    } else if (mounted) {
      cancelAnimation(pinScale);
      cancelAnimation(burst);
      backdrop.value = withTiming(0, { duration: motion.duration.fast });
      sheet.value = withTiming(0, { duration: motion.duration.base }, (finished) => {
        if (finished) runOnJS(setMounted)(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, reduceMotion]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));
  const sheetStyle = useAnimatedStyle(() => ({
    opacity: interpolate(sheet.value, [0, 0.4, 1], [0, 1, 1]),
    transform: [{ translateY: interpolate(sheet.value, [0, 1], [48, 0]) }],
  }));
  const pinStyle = useAnimatedStyle(() => ({ transform: [{ scale: pinScale.value }] }));
  const haloStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pinScale.value, [0, 1], [0, 1]),
    transform: [{ scale: interpolate(pinScale.value, [0, 1.15], [0.6, 1.05]) }],
  }));

  const fontBold = getFontFamily(lang, 'bold');
  const fontMedium = getFontFamily(lang, 'medium');

  const resolvedTitle =
    title ??
    (ticketNumber != null
      ? t('success.ticketTitle', { defaultValue: 'Votre tour est réservé !' })
      : t('success.bookingTitle', { defaultValue: 'Réservation confirmée !' }));
  const resolvedSubtitle =
    subtitle ??
    (ticketNumber != null
      ? t('success.ticketSubtitle', { defaultValue: 'Nous vous prévenons quand votre tour approche.' })
      : t('success.bookingSubtitle', { defaultValue: 'Le pro a bien reçu votre demande.' }));

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.fill}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('common.close', { defaultValue: 'Fermer' })}
          />
        </Animated.View>

        <Animated.View
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }, sheetStyle]}
          accessibilityViewIsModal
          accessibilityLiveRegion="polite"
        >
          <View style={styles.handle} />

          <View style={styles.burst}>
            <Animated.View style={[styles.halo, haloStyle]} />
            {PARTICLES.map((p, i) => (
              <ConfettiParticle key={i} particle={p} progress={burst} />
            ))}
            <Animated.View style={pinStyle}>
              <LocationPinCheck width={PIN_WIDTH} />
            </Animated.View>
          </View>

          <Text style={[styles.title, { fontFamily: fontBold, lineHeight: lineHeightFor(22, lang) }]}>
            {resolvedTitle}
          </Text>
          <Text style={[styles.subtitle, { fontFamily: fontMedium, lineHeight: lineHeightFor(15, lang) }]}>
            {resolvedSubtitle}
          </Text>

          {ticketNumber != null && (
            <View style={styles.ticket}>
              <Text style={[styles.ticketLabel, { fontFamily: getFontFamily(lang, 'semibold') }]}>
                {t('success.ticketLabel', { defaultValue: 'Votre numéro' })}
              </Text>
              <Text style={styles.ticketNumber}>{`#${ticketNumber}`}</Text>
            </View>
          )}

          {!!highlight && (
            <View style={styles.highlight}>
              <Text style={[styles.highlightText, { fontFamily: getFontFamily(lang, 'semibold') }]}>{highlight}</Text>
            </View>
          )}

          <View style={styles.actions}>
            <PrimaryButton
              title={ctaLabel ?? t('success.cta', { defaultValue: 'Parfait' })}
              onPress={onClose}
              haptic="light"
            />
            {!!secondaryLabel && (
              <PrimaryButton
                title={secondaryLabel}
                onPress={onSecondary ?? onClose}
                variant="ghost"
                haptic="light"
                compact
              />
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */

function ConfettiParticle({ particle, progress }: { particle: Particle; progress: SharedValue<number> }) {
  const dx = Math.cos(particle.angle) * particle.distance;
  const dy = Math.sin(particle.angle) * particle.distance;
  const spin = particle.kind === 'star' ? 120 : 0;

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.12, 0.65, 1], [0, 1, 0.9, 0]),
    transform: [
      { translateX: dx * progress.value },
      { translateY: dy * progress.value },
      { scale: interpolate(progress.value, [0, 0.35, 1], [0.3, 1.1, 0.6]) },
      { rotate: `${spin * progress.value}deg` },
    ],
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.particle, style]}>
      {particle.kind === 'star' ? (
        <Svg width={particle.size} height={particle.size} viewBox="0 0 24 24">
          <Path d={STAR_D} fill={particle.color} strokeLinejoin="round" />
        </Svg>
      ) : (
        <View
          style={{
            width: particle.size,
            height: particle.size,
            borderRadius: particle.size / 2,
            backgroundColor: particle.color,
          }}
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.background.surface,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    paddingHorizontal: 24,
    paddingTop: 10,
    alignItems: 'center',
    ...shadows.sheet,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border.strong,
    marginBottom: 4,
  },
  burst: {
    width: BURST_SIZE,
    height: BURST_SIZE * 0.82,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: colors.accent.soft,
    borderWidth: 1,
    borderColor: colors.secondary.tealLight,
  },
  particle: {
    position: 'absolute',
  },
  title: {
    fontSize: 22,
    color: colors.text.primary,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 15,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  ticket: {
    marginTop: 18,
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: radii.card,
    backgroundColor: colors.background.main,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  ticketLabel: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  ticketNumber: {
    ...numericTextStyle('display', 'bold', colors.primary.DEFAULT),
    fontSize: 48,
    lineHeight: 56,
  },
  highlight: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.status.onlineSoft,
  },
  highlightText: {
    fontSize: 14,
    color: colors.status.online,
    textAlign: 'center',
  },
  actions: {
    alignSelf: 'stretch',
    marginTop: 22,
    gap: 6,
  },
});
