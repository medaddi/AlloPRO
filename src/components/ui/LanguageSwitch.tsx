/**
 * AlloPro — FR | ع language pill.
 * Always "FR" on the left and "ع" on the right, whatever the layout direction.
 * Switching flips RTL/LTR, which reloads the app once.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, getFontFamily, radii } from '../../constants/theme';
import { useAppLanguage, type AppLanguage } from '../../i18n';
import { useAppStore } from '../../store/useAppStore';
import { triggerHaptic } from './PrimaryButton';

const OPTIONS: { value: AppLanguage; label: string; a11y: string }[] = [
  { value: 'fr', label: 'FR', a11y: 'Français' },
  { value: 'ar', label: 'ع', a11y: 'العربية' },
];

export default function LanguageSwitch({ style }: { style?: StyleProp<ViewStyle> }) {
  const { lang } = useAppLanguage();
  const setLanguage = useAppStore((s) => s.setLanguage);
  const [switching, setSwitching] = useState(false);

  const choose = async (value: AppLanguage) => {
    if (value === lang || switching) return;
    triggerHaptic('light');
    setSwitching(true);
    try {
      await setLanguage(value);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <View style={[styles.wrap, style]} accessibilityRole="radiogroup">
      {OPTIONS.map((o) => {
        const active = o.value === lang;
        return (
          <Pressable
            key={o.value}
            onPress={() => choose(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: active, disabled: switching }}
            accessibilityLabel={o.a11y}
            hitSlop={6}
            style={[styles.option, active && styles.optionActive]}
          >
            <Text style={[styles.label, { fontFamily: getFontFamily(o.value, 'bold') }, active && styles.labelActive]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    direction: 'ltr',
    alignSelf: 'flex-start',
    backgroundColor: colors.background.surface,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    padding: 3,
  },
  option: {
    minWidth: 44,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionActive: {
    backgroundColor: colors.primary.DEFAULT,
  },
  label: {
    fontSize: 14,
    color: colors.text.secondary,
    includeFontPadding: false,
  },
  labelActive: {
    color: colors.text.inverse,
  },
});
