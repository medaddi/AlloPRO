/**
 * ALLO LM3LM — Radar matching animation (SOS artisan dispatch & nearby search).
 * - Deep-blue pin with orange check floats on Y (−5 ↔ +5, 1500ms ease-in-out)
 * - 3 teal waves expand 0.5 → 2.5 while fading 0.8 → 0 (staggered 2000ms loop)
 * - Wrench / gear / clock chips orbit slowly around the radar perimeter
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
  withDelay,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { Clock, Settings, Wrench, type LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { colors, getFontFamily, lineHeightFor, motion, shadows, toAppLanguage } from '../../constants/theme';
import { LocationPinCheck, PIN_ASPECT } from './shapes';

const ORBIT_DURATION = 14000;
const ORBIT_ICONS: { Icon: LucideIcon; angle: number; color: string }[] = [
  { Icon: Wrench, angle: -40, color: colors.primary.DEFAULT },
  { Icon: Settings, angle: 80, color: colors.accent.DEFAULT },
  { Icon: Clock, angle: 200, color: colors.secondary.tealDark },
];

type Props = {
  /** Square radar size in dp (waves reach this diameter at full scale). */
  size?: number;
  /** Hide the orbiting tool chips (e.g. on the map overlay). */
  showOrbit?: boolean;
  /** Show title/subtitle under the radar. */
  showCaption?: boolean;
  title?: string;
  subtitle?: string;
  style?: StyleProp<ViewStyle>;
};

export default function RadarSearchingAnimation({
  size = 260,
  showOrbit = true,
  showCaption = true,
  title,
  subtitle,
  style,
}: Props) {
  const { t, i18n } = useTranslation();
  const lang = toAppLanguage(i18n.language);
  const reduceMotion = useReducedMotion();

  const float = useSharedValue<number>(motion.radar.pinFloatRange);
  const orbit = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      float.value = 0;
      orbit.value = 0;
      return;
    }
    float.value = withRepeat(
      withTiming(-motion.radar.pinFloatRange, {
        duration: motion.duration.pinFloat,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    );
    orbit.value = withRepeat(withTiming(360, { duration: ORBIT_DURATION, easing: Easing.linear }), -1, false);
    return () => {
      cancelAnimation(float);
      cancelAnimation(orbit);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  const pinWidth = Math.round(size * 0.22);
  const pinHeight = pinWidth * PIN_ASPECT;
  const waveDiameter = size / motion.radar.scaleTo;

  const pinStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: float.value - pinHeight * 0.35 }],
  }));

  // Shadow shrinks as the pin rises.
  const shadowStyle = useAnimatedStyle(() => {
    const range = motion.radar.pinFloatRange;
    const s = interpolate(float.value, [-range, range], [0.75, 1]);
    return {
      opacity: interpolate(float.value, [-range, range], [0.12, 0.22]),
      transform: [{ scaleX: s }, { scaleY: s }],
    };
  });

  const orbitStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${orbit.value}deg` }],
  }));

  const resolvedTitle = title ?? t('radar.title', { defaultValue: 'Recherche d’un artisan proche…' });
  const resolvedSubtitle =
    subtitle ?? t('radar.subtitle', { defaultValue: 'Nous contactons les pros disponibles autour de vous' });

  return (
    <View style={[styles.root, style]} accessibilityRole="progressbar" accessibilityLabel={resolvedTitle}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        {Array.from({ length: motion.radar.waves }).map((_, i) => (
          <RadarWave key={i} index={i} diameter={waveDiameter} reduceMotion={reduceMotion} />
        ))}

        {/* Static inner disc gives the pin a calm base. */}
        <View
          style={[
            styles.core,
            { width: waveDiameter * 0.9, height: waveDiameter * 0.9, borderRadius: waveDiameter * 0.45 },
          ]}
        />

        {showOrbit && (
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, orbitStyle]}>
            {ORBIT_ICONS.map((item) => (
              <OrbitChip key={item.angle} {...item} size={size} orbit={orbit} />
            ))}
          </Animated.View>
        )}

        <Animated.View
          pointerEvents="none"
          style={[
            styles.pinShadow,
            { width: pinWidth * 0.7, height: pinWidth * 0.18, borderRadius: pinWidth, marginTop: pinWidth * 0.18 },
            shadowStyle,
          ]}
        />
        <Animated.View pointerEvents="none" style={[styles.pin, pinStyle]}>
          <LocationPinCheck width={pinWidth} />
        </Animated.View>
      </View>

      {showCaption && (
        <View style={styles.caption}>
          <Text
            style={[
              styles.title,
              { fontFamily: getFontFamily(lang, 'bold'), lineHeight: lineHeightFor(18, lang) },
            ]}
          >
            {resolvedTitle}
          </Text>
          <Text
            style={[
              styles.subtitle,
              { fontFamily: getFontFamily(lang, 'medium'), lineHeight: lineHeightFor(14, lang) },
            ]}
          >
            {resolvedSubtitle}
          </Text>
        </View>
      )}
    </View>
  );
}

/* -------------------------------------------------------------------------- */

function RadarWave({ index, diameter, reduceMotion }: { index: number; diameter: number; reduceMotion: boolean }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      progress.value = 0.3 + index * 0.2;
      return;
    }
    const stagger = (motion.duration.radarWave / motion.radar.waves) * index;
    progress.value = withDelay(
      stagger,
      withRepeat(
        withTiming(1, { duration: motion.duration.radarWave, easing: Easing.out(Easing.quad) }),
        -1,
        false,
      ),
    );
    return () => cancelAnimation(progress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion, index]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [motion.radar.opacityFrom, 0]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [motion.radar.scaleFrom, motion.radar.scaleTo]) }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wave,
        { width: diameter, height: diameter, borderRadius: diameter / 2 },
        style,
      ]}
    />
  );
}

function OrbitChip({
  Icon,
  angle,
  color,
  size,
  orbit,
}: {
  Icon: LucideIcon;
  angle: number;
  color: string;
  size: number;
  orbit: SharedValue<number>;
}) {
  const chip = Math.max(30, Math.round(size * 0.13));
  const radius = size * 0.4;
  const rad = (angle * Math.PI) / 180;
  const left = size / 2 + radius * Math.cos(rad) - chip / 2;
  const top = size / 2 + radius * Math.sin(rad) - chip / 2;

  // Counter-rotate so icons stay upright while the ring turns.
  const upright = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-orbit.value}deg` }],
  }));

  return (
    <Animated.View
      style={[
        styles.chip,
        { width: chip, height: chip, borderRadius: chip / 2, left, top },
        upright,
      ]}
    >
      <Icon size={chip * 0.5} color={color} strokeWidth={2.2} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
  },
  wave: {
    position: 'absolute',
    backgroundColor: 'rgba(165, 196, 196, 0.35)',
    borderWidth: 2,
    borderColor: colors.secondary.teal,
  },
  core: {
    position: 'absolute',
    backgroundColor: colors.secondary.tealLight,
    borderWidth: 1,
    borderColor: colors.secondary.teal,
  },
  pinShadow: {
    position: 'absolute',
    backgroundColor: colors.primary.DEFAULT,
  },
  pin: {
    position: 'absolute',
  },
  chip: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.surface,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    ...shadows.card,
  },
  caption: {
    marginTop: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    color: colors.text.primary,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});
