/**
 * ALLO LM3LM — Thumb-zone CTA button.
 * 54px tall, 16px radius, scale(0.98) press compression + expo-haptics feedback.
 * Every button can pair its label with an icon (visual-first for artisans).
 */
import { useEffect, type ComponentType } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import type { LucideIcon } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { colors, getFontFamily, motion, radii, shadows, sizes, toAppLanguage } from '../../constants/theme';
import { GearIcon } from '../animations/shapes';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
export type HapticKind = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'none';

type IconComponent = LucideIcon | ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

type Props = Omit<PressableProps, 'style' | 'children' | 'onPress'> & {
  title: string;
  onPress?: (e: GestureResponderEvent) => void;
  variant?: ButtonVariant;
  icon?: IconComponent;
  iconPosition?: 'start' | 'end';
  /** Mirror the icon in Arabic (arrows, chevrons). */
  directionalIcon?: boolean;
  loading?: boolean;
  disabled?: boolean;
  haptic?: HapticKind;
  /** Compact 44px variant for secondary rows. */
  compact?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

const VARIANTS: Record<ButtonVariant, { bg: string; fg: string; border?: string; shadow?: ViewStyle }> = {
  primary: { bg: colors.accent.DEFAULT, fg: colors.text.inverse, shadow: shadows.cta },
  secondary: { bg: colors.primary.DEFAULT, fg: colors.text.inverse, shadow: shadows.raised },
  outline: { bg: colors.background.surface, fg: colors.primary.DEFAULT, border: colors.border.strong },
  ghost: { bg: colors.transparent, fg: colors.primary.DEFAULT },
  danger: { bg: colors.status.offline, fg: colors.text.inverse },
  success: { bg: colors.status.online, fg: colors.text.inverse },
};

export function triggerHaptic(kind: HapticKind): void {
  const run = (): Promise<void> => {
    switch (kind) {
      case 'light':
        return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      case 'medium':
        return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      case 'heavy':
        return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      case 'success':
        return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      case 'warning':
        return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      default:
        return Promise.resolve();
    }
  };
  // Haptics are a nicety: devices without a vibrator must never crash the press.
  run().catch(() => undefined);
}

export default function PrimaryButton({
  title,
  onPress,
  variant = 'primary',
  icon: Icon,
  iconPosition = 'start',
  directionalIcon = false,
  loading = false,
  disabled = false,
  haptic = 'medium',
  compact = false,
  fullWidth = true,
  style,
  textStyle,
  accessibilityLabel,
  ...rest
}: Props) {
  const { i18n } = useTranslation();
  const lang = toAppLanguage(i18n.language);
  const isRTL = lang === 'ar';
  const palette = VARIANTS[variant];
  const inactive = disabled || loading;

  const scale = useSharedValue(1);
  const spin = useSharedValue(0);

  useEffect(() => {
    if (!loading) {
      cancelAnimation(spin);
      spin.value = 0;
      return;
    }
    spin.value = withRepeat(
      withTiming(360, { duration: motion.duration.gearLoading, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(spin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const spinStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value}deg` }] }));

  const handlePressIn = () => {
    scale.value = withTiming(motion.pressScale, { duration: motion.pressDuration });
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, motion.spring.snappy);
  };
  const handlePress = (e: GestureResponderEvent) => {
    if (inactive) return;
    if (haptic !== 'none') triggerHaptic(haptic);
    onPress?.(e);
  };

  const height = compact ? sizes.minTouch : sizes.buttonHeight;
  const iconSize = compact ? sizes.iconMd - 2 : sizes.iconMd;
  const iconNode = Icon ? (
    <View style={directionalIcon && isRTL ? styles.mirrored : undefined}>
      <Icon size={iconSize} color={palette.fg} strokeWidth={2.4} />
    </View>
  ) : null;

  return (
    <AnimatedPressable
      {...rest}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      style={[
        styles.base,
        {
          height,
          backgroundColor: palette.bg,
          borderColor: palette.border ?? colors.transparent,
          borderWidth: palette.border ? sizes.borderWidth : 0,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          opacity: disabled && !loading ? 0.5 : 1,
        },
        !inactive && palette.shadow,
        pressStyle,
        style,
      ]}
    >
      {loading ? (
        <Animated.View style={spinStyle}>
          <GearIcon size={22} color={palette.fg} />
        </Animated.View>
      ) : (
        <View style={styles.content}>
          {iconPosition === 'start' && iconNode}
          <Text
            numberOfLines={1}
            style={[
              styles.label,
              { color: palette.fg, fontFamily: getFontFamily(lang, 'bold'), fontSize: compact ? 15 : 16 },
              textStyle,
            ]}
          >
            {title}
          </Text>
          {iconPosition === 'end' && iconNode}
        </View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.btn,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  label: {
    flexShrink: 1,
    textAlign: 'center',
    includeFontPadding: false,
  },
  mirrored: {
    transform: [{ scaleX: -1 }],
  },
});
