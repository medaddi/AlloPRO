/**
 * AlloPro — Labeled text input.
 * `ltr` forces left-to-right digits (prices, phones, durations) in both languages.
 */
import { forwardRef, useState, type ReactNode } from 'react';
import { StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';

import { colors, fontFamilies, getFontFamily, lineHeightFor, radii, sizes } from '../../constants/theme';
import { useAppLanguage } from '../../i18n';

type Props = Omit<TextInputProps, 'style'> & {
  label?: string;
  error?: string | null;
  hint?: string;
  /** Left-to-right content (numbers, phones, DH). */
  ltr?: boolean;
  /** Rendered before / after the input, e.g. "+212" or "DH". */
  prefix?: ReactNode;
  suffix?: ReactNode;
  multiline?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
};

const TextField = forwardRef<TextInput, Props>(function TextField(
  { label, error, hint, ltr = false, prefix, suffix, multiline = false, containerStyle, onFocus, onBlur, ...rest },
  ref,
) {
  const { lang, isRTL } = useAppLanguage();
  const [focused, setFocused] = useState(false);
  const forceLtr = ltr;

  return (
    <View style={containerStyle}>
      {!!label && (
        <Text style={[styles.label, { fontFamily: getFontFamily(lang, 'semibold'), lineHeight: lineHeightFor(13, lang) }]}>
          {label}
        </Text>
      )}
      <View
        style={[
          styles.box,
          multiline && styles.boxMultiline,
          forceLtr && { direction: 'ltr' },
          focused && styles.focused,
          !!error && styles.invalid,
        ]}
      >
        {prefix != null && <View style={styles.affix}>{typeof prefix === 'string' ? <Affix text={prefix} /> : prefix}</View>}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.text.muted}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            styles.input,
            multiline && styles.inputMultiline,
            {
              fontFamily: forceLtr ? fontFamilies.fr.semibold : getFontFamily(lang, 'medium'),
              textAlign: forceLtr ? 'left' : isRTL ? 'right' : 'left',
              writingDirection: forceLtr ? 'ltr' : isRTL ? 'rtl' : 'ltr',
            },
          ]}
          {...rest}
        />
        {suffix != null && <View style={styles.affix}>{typeof suffix === 'string' ? <Affix text={suffix} /> : suffix}</View>}
      </View>
      {!!error && (
        <Text style={[styles.error, { fontFamily: getFontFamily(lang, 'medium'), lineHeight: lineHeightFor(12, lang) }]}>
          {error}
        </Text>
      )}
      {!error && !!hint && (
        <Text style={[styles.hint, { fontFamily: getFontFamily(lang, 'medium'), lineHeight: lineHeightFor(12, lang) }]}>
          {hint}
        </Text>
      )}
    </View>
  );
});

function Affix({ text }: { text: string }) {
  return <Text style={styles.affixText}>{text}</Text>;
}

export default TextField;

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: 6,
    textAlign: 'auto',
  },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: sizes.inputHeight,
    borderRadius: radii.btn,
    borderWidth: 1.5,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.background.surface,
    overflow: 'hidden',
  },
  boxMultiline: {
    alignItems: 'flex-start',
    minHeight: 96,
  },
  focused: {
    borderColor: colors.secondary.tealDark,
  },
  invalid: {
    borderColor: colors.status.offline,
  },
  input: {
    flex: 1,
    minHeight: sizes.inputHeight - 3,
    paddingHorizontal: 14,
    fontSize: 16,
    color: colors.text.primary,
  },
  inputMultiline: {
    paddingTop: 12,
    paddingBottom: 12,
    minHeight: 93,
  },
  affix: {
    paddingHorizontal: 12,
    alignSelf: 'stretch',
    justifyContent: 'center',
    backgroundColor: colors.background.main,
  },
  affixText: {
    fontFamily: fontFamilies.fr.bold,
    fontSize: 15,
    color: colors.text.secondary,
  },
  error: {
    marginTop: 6,
    fontSize: 12,
    color: colors.status.offline,
    textAlign: 'auto',
  },
  hint: {
    marginTop: 6,
    fontSize: 12,
    color: colors.text.muted,
    textAlign: 'auto',
  },
});
