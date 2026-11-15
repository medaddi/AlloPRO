/**
 * AlloPro — Bottom sheet modal for forms (walk-in, service, Kridi…).
 * Slides up, dims the screen, keeps the footer CTA above the keyboard.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { interpolate, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';

import { colors, getFontFamily, lineHeightFor, motion, radii, shadows, sizes } from '../../constants/theme';
import { useAppLanguage } from '../../i18n';

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Pinned under the scrollable content (primary action). */
  footer?: ReactNode;
};

export default function SheetModal({ visible, onClose, title, subtitle, children, footer }: Props) {
  const insets = useSafeAreaInsets();
  const { t, lang } = useAppLanguage();
  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.value = withSpring(1, motion.spring.snappy);
    } else if (mounted) {
      progress.value = withTiming(0, { duration: motion.duration.base }, (finished) => {
        if (finished) runOnJS(setMounted)(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(progress.value, [0, 1], [500, 0]) }],
  }));

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t('common.close')} />
        </Animated.View>

        <Animated.View style={[styles.sheet, sheetStyle]} accessibilityViewIsModal>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerTexts}>
              <Text
                style={[styles.title, { fontFamily: getFontFamily(lang, 'bold'), lineHeight: lineHeightFor(19, lang) }]}
              >
                {title}
              </Text>
              {!!subtitle && (
                <Text
                  style={[
                    styles.subtitle,
                    { fontFamily: getFontFamily(lang, 'medium'), lineHeight: lineHeightFor(13, lang) },
                  ]}
                >
                  {subtitle}
                </Text>
              )}
            </View>
            <Pressable
              onPress={onClose}
              style={styles.close}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              hitSlop={8}
            >
              <X size={20} color={colors.text.secondary} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>

          {!!footer && <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>{footer}</View>}
          {!footer && <View style={{ height: Math.max(insets.bottom, 16) }} />}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
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
    maxHeight: '88%',
    backgroundColor: colors.background.surface,
    borderTopLeftRadius: radii.sheet,
    borderTopRightRadius: radii.sheet,
    paddingTop: 10,
    ...shadows.sheet,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border.strong,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 12,
  },
  headerTexts: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 19,
    color: colors.text.primary,
    textAlign: 'auto',
  },
  subtitle: {
    fontSize: 13,
    color: colors.text.secondary,
    textAlign: 'auto',
  },
  close: {
    width: sizes.minTouch - 8,
    height: sizes.minTouch - 8,
    borderRadius: 18,
    backgroundColor: colors.background.main,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flexGrow: 0,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 14,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border.DEFAULT,
    gap: 8,
  },
});
