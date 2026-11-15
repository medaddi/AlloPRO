/**
 * AlloPro — Splash logo animation.
 * - Stylized 'A' (#1D4355) springs from 0.5 → 1.0 (damping 12, stiffness 100)
 * - Orange gear (#F08A4B) behind the 'A' rotates 360° continuously (4000ms, linear)
 * - Clock-badge checkmark draws itself via strokeDashoffset (600ms)
 */
import { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { useTranslation } from 'react-i18next';

import { colors, fontFamilies, getFontFamily, lineHeightFor, motion, toAppLanguage } from '../../constants/theme';
import { gearPath } from './shapes';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/* ---------------------------- Logo geometry (200²) ---------------------------- */

const GEAR_D = gearPath(100, 100, 86, 73, 12, 60);
/** Thick 'A' with a triangular counter; evenodd cuts the counter out. */
const A_D = 'M100 34 L151 160 L125 160 L115 134 L85 134 L75 160 L49 160 Z M100 74 L112 116 L88 116 Z';
const CHECK_D = 'M137 151 L146 160 L163 141';
const CHECK_LENGTH = 40;

type Props = {
  /** Logo square size in dp. */
  size?: number;
  /** Shows "AlloPro" + tagline under the logo. */
  showWordmark?: boolean;
  /** Extra time (ms) to hold the finished logo before calling onFinish. */
  holdMs?: number;
  /** Called once the intro (bounce + checkmark) has played. The gear keeps spinning. */
  onFinish?: () => void;
  style?: StyleProp<ViewStyle>;
};

export default function SplashLogoAnimation({
  size = 168,
  showWordmark = true,
  holdMs = 500,
  onFinish,
  style,
}: Props) {
  const { t, i18n } = useTranslation();
  const lang = toAppLanguage(i18n.language);
  const reduceMotion = useReducedMotion();

  const logoScale = useSharedValue(0.5);
  const logoOpacity = useSharedValue(0);
  const gearRotation = useSharedValue(0);
  const gearOpacity = useSharedValue(0);
  const checkOffset = useSharedValue(CHECK_LENGTH);
  const wordmarkProgress = useSharedValue(0);

  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;
  const finish = useCallback(() => onFinishRef.current?.(), []);

  useEffect(() => {
    if (reduceMotion) {
      logoScale.value = 1;
      logoOpacity.value = 1;
      gearOpacity.value = 1;
      checkOffset.value = 0;
      wordmarkProgress.value = 1;
      const timer = setTimeout(finish, holdMs);
      return () => clearTimeout(timer);
    }

    logoOpacity.value = withTiming(1, { duration: motion.duration.base });
    logoScale.value = withSpring(1, motion.spring.gentle);

    gearOpacity.value = withTiming(1, { duration: motion.duration.slow });
    gearRotation.value = withRepeat(
      withTiming(360, { duration: motion.duration.gearSplash, easing: Easing.linear }),
      -1,
      false,
    );

    checkOffset.value = withDelay(
      450,
      withSequence(
        withTiming(0, { duration: motion.duration.checkmarkDraw, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: holdMs }, (finished) => {
          if (finished) runOnJS(finish)();
        }),
      ),
    );

    wordmarkProgress.value = withDelay(
      300,
      withTiming(1, { duration: motion.duration.slow, easing: Easing.out(Easing.cubic) }),
    );

    return () => {
      cancelAnimation(logoScale);
      cancelAnimation(logoOpacity);
      cancelAnimation(gearRotation);
      cancelAnimation(gearOpacity);
      cancelAnimation(checkOffset);
      cancelAnimation(wordmarkProgress);
    };
    // Shared values are stable refs; the intro plays once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion, holdMs, finish]);

  const gearStyle = useAnimatedStyle(() => ({
    opacity: gearOpacity.value,
    transform: [{ rotate: `${gearRotation.value}deg` }],
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const checkProps = useAnimatedProps(() => ({
    strokeDashoffset: checkOffset.value,
  }));

  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: wordmarkProgress.value,
    transform: [{ translateY: (1 - wordmarkProgress.value) * 12 }],
  }));

  const tagline = t('splash.tagline', { defaultValue: 'Votre tour, sans attendre' });

  return (
    <View
      style={[styles.root, style]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`AlloPro. ${tagline}`}
    >
      <View style={{ width: size, height: size }}>
        <Animated.View style={[StyleSheet.absoluteFill, gearStyle]}>
          <Svg width={size} height={size} viewBox="0 0 200 200">
            <Path d={GEAR_D} fill={colors.accent.DEFAULT} fillRule="evenodd" />
          </Svg>
        </Animated.View>

        <Animated.View style={[StyleSheet.absoluteFill, logoStyle]}>
          <Svg width={size} height={size} viewBox="0 0 200 200">
            <Path
              d={A_D}
              fill={colors.primary.DEFAULT}
              fillRule="evenodd"
              stroke={colors.primary.DEFAULT}
              strokeWidth={6}
              strokeLinejoin="round"
            />
            {/* Clock badge */}
            <Circle cx={150} cy={150} r={27} fill={colors.background.surface} stroke={colors.primary.DEFAULT} strokeWidth={6} />
            <Line x1={150} y1={127} x2={150} y2={132} stroke={colors.primary.DEFAULT} strokeWidth={4} strokeLinecap="round" />
            <Line x1={173} y1={150} x2={168} y2={150} stroke={colors.primary.DEFAULT} strokeWidth={4} strokeLinecap="round" />
            <Line x1={127} y1={150} x2={132} y2={150} stroke={colors.primary.DEFAULT} strokeWidth={4} strokeLinecap="round" />
            <AnimatedPath
              d={CHECK_D}
              stroke={colors.accent.DEFAULT}
              strokeWidth={7}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              strokeDasharray={CHECK_LENGTH}
              animatedProps={checkProps}
            />
          </Svg>
        </Animated.View>
      </View>

      {showWordmark && (
        <Animated.View style={[styles.wordmarkWrap, wordmarkStyle]}>
          {/* Brand name stays Latin & LTR in both languages. */}
          <Animated.Text style={styles.wordmark}>
            <Animated.Text style={{ color: colors.primary.DEFAULT }}>Allo</Animated.Text>
            <Animated.Text style={{ color: colors.accent.DEFAULT }}>Pro</Animated.Text>
          </Animated.Text>
          <Animated.Text
            style={[
              styles.tagline,
              {
                fontFamily: getFontFamily(lang, 'medium'),
                lineHeight: lineHeightFor(15, lang),
                writingDirection: lang === 'ar' ? 'rtl' : 'ltr',
              },
            ]}
          >
            {tagline}
          </Animated.Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmarkWrap: {
    marginTop: 20,
    alignItems: 'center',
  },
  wordmark: {
    fontFamily: fontFamilies.fr.bold,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.5,
    writingDirection: 'ltr',
  },
  tagline: {
    marginTop: 4,
    fontSize: 15,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});
