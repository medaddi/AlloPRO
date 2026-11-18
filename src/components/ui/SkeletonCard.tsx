/**
 * ALLO LM3LM — Placeholder card with a soft pulse, same footprint as ProCard.
 */
import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { cardSurface, colors } from '../../constants/theme';

export default function SkeletonCard({ style }: { style?: StyleProp<ViewStyle> }) {
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(0.55);

  useEffect(() => {
    if (reduceMotion) return;
    pulse.value = withRepeat(withTiming(1, { duration: 800, easing: Easing.inOut(Easing.quad) }), -1, true);
    return () => cancelAnimation(pulse);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  const animated = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <View style={[styles.card, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View style={[styles.thumb, animated]} />
      <View style={styles.lines}>
        <Animated.View style={[styles.line, { width: '70%' }, animated]} />
        <Animated.View style={[styles.line, { width: '50%', height: 10 }, animated]} />
        <Animated.View style={[styles.pill, animated]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...cardSurface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.border.DEFAULT,
  },
  lines: {
    flex: 1,
    gap: 8,
  },
  line: {
    height: 13,
    borderRadius: 6,
    backgroundColor: colors.border.DEFAULT,
  },
  pill: {
    width: 110,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.border.DEFAULT,
  },
});
