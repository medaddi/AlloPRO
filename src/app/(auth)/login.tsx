/**
 * AlloPro — +212 phone login (Supabase SMS OTP).
 * Steps: phone → 6-digit code → profile (name + city) for new accounts.
 * Phone numbers and codes are always laid out LTR, in both languages.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInLeft,
  FadeInRight,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { ArrowRight, Check, ChevronLeft, MessageSquareText, Phone, UserRound } from 'lucide-react-native';

import PrimaryButton, { triggerHaptic } from '../../components/ui/PrimaryButton';
import { getCity, getCityName, getSortedCities } from '../../constants/moroccoCities';
import {
  colors,
  fontFamilies,
  getFontFamily,
  lineHeightFor,
  numericTextStyle,
  radii,
  sizes,
} from '../../constants/theme';
import { useAppLanguage } from '../../i18n';
import { supabase } from '../../lib/supabase';
import { formatMoroccanPhone, isMoroccanMobile, toE164 } from '../../lib/whatsapp';
import { useAppStore } from '../../store/useAppStore';

type Step = 'phone' | 'otp' | 'profile';
const STEPS: Step[] = ['phone', 'otp', 'profile'];
const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

/** Keeps up to 9 national digits ("0612…" or "612…" → "612…"). */
const sanitizeLocal = (raw: string): string => {
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('212')) d = d.slice(3);
  if (d.startsWith('0')) d = d.slice(1);
  return d.slice(0, 9);
};

/** "612345678" → "6 12 34 56 78" */
const formatLocal = (d: string): string => {
  if (!d) return '';
  const rest = d.slice(1).match(/.{1,2}/g) ?? [];
  return [d[0], ...rest].join(' ');
};

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ step?: string }>();
  const { t, lang, isRTL, mirror } = useAppLanguage();

  const loadProfile = useAppStore((s) => s.loadProfile);
  const activeMode = useAppStore((s) => s.activeMode);
  const selectedCity = useAppStore((s) => s.selectedCity);
  const setCity = useAppStore((s) => s.setCity);

  const [step, setStep] = useState<Step>(params.step === 'profile' ? 'profile' : 'phone');
  const [localDigits, setLocalDigits] = useState('');
  const [code, setCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [citySlug, setCitySlug] = useState(selectedCity);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);

  const e164 = useMemo(() => toE164(localDigits), [localDigits]);
  const phoneValid = localDigits.length === 9 && isMoroccanMobile(localDigits);

  /* ------------------------------ shake on error ----------------------------- */
  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));
  const fail = (message: string) => {
    setError(message);
    triggerHaptic('warning');
    shake.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-6, { duration: 50 }),
      withTiming(6, { duration: 50 }),
      withTiming(0, { duration: 50 }),
    );
  };

  /* ------------------------------ resend countdown ----------------------------- */
  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [resendIn]);

  const goTo = (next: Step) => {
    setDirection(STEPS.indexOf(next) >= STEPS.indexOf(step) ? 1 : -1);
    setError(null);
    setStep(next);
  };

  /* ---------------------------------- actions --------------------------------- */
  const sendCode = async () => {
    if (!phoneValid || !e164) {
      fail(t('auth.invalidPhone'));
      return;
    }
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithOtp({ phone: e164, options: { channel: 'sms' } });
    setLoading(false);
    if (err) {
      if (__DEV__) console.warn('[AlloPro] signInWithOtp', err.message);
      fail(t('errors.generic'));
      return;
    }
    triggerHaptic('success');
    setCode('');
    setResendIn(RESEND_SECONDS);
    goTo('otp');
  };

  const verifyCode = async (token: string) => {
    if (!e164 || token.length !== OTP_LENGTH || loading) return;
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.verifyOtp({ phone: e164, token, type: 'sms' });
    if (err) {
      setLoading(false);
      setCode('');
      fail(t('auth.invalidCode'));
      return;
    }
    triggerHaptic('success');
    try {
      const { user } = await loadProfile();
      // Existing account → the root guard routes to the app. New account → profile step.
      if (!user) goTo('profile');
    } catch {
      fail(t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  const finishProfile = async () => {
    const name = fullName.trim().replace(/\s+/g, ' ');
    if (name.length < 2) {
      fail(t('auth.nameTitle'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) {
        goTo('phone');
        return;
      }
      const phone = toE164(authUser.phone) ?? e164;
      if (!phone) throw new Error('missing phone');

      const city = getCity(citySlug);
      const { error: err } = await supabase.from('users').upsert({
        id: authUser.id,
        phone,
        full_name: name,
        language: lang,
        city: city.name_fr,
        role: activeMode === 'pro' ? 'pro' : 'client',
      });
      if (err) throw err;

      setCity(city.slug);
      triggerHaptic('success');
      await loadProfile(); // root guard redirects once the profile exists
    } catch (err) {
      if (__DEV__) console.warn('[AlloPro] finishProfile', err);
      fail(t('errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 'otp') {
      goTo('phone');
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace('/welcome');
  };

  /* ---------------------------------- render ---------------------------------- */
  const entering = (direction === 1) !== isRTL ? FadeInRight.duration(280) : FadeInLeft.duration(280);
  const fontBold = getFontFamily(lang, 'bold');
  const fontMedium = getFontFamily(lang, 'medium');

  const header = {
    phone: { Icon: Phone, title: t('auth.phoneTitle'), subtitle: t('auth.phoneSubtitle') },
    otp: {
      Icon: MessageSquareText,
      title: t('auth.otpTitle'),
      subtitle: t('auth.otpSubtitle', { phone: `⁦${formatMoroccanPhone(e164)}⁩` }),
    },
    profile: { Icon: UserRound, title: t('auth.nameTitle'), subtitle: null as string | null },
  }[step];

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        {step !== 'profile' ? (
          <Pressable
            onPress={handleBack}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            hitSlop={8}
          >
            <View style={{ transform: mirror }}>
              <ChevronLeft size={22} color={colors.primary.DEFAULT} />
            </View>
          </Pressable>
        ) : (
          <View style={styles.backButton} />
        )}
        <View style={styles.progress}>
          {STEPS.map((s, i) => (
            <View
              key={s}
              style={[styles.progressDot, i <= STEPS.indexOf(step) && styles.progressDotActive]}
            />
          ))}
        </View>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View key={step} entering={entering}>
          <View style={styles.stepIcon}>
            <header.Icon size={26} color={colors.accent.DEFAULT} strokeWidth={2.2} />
          </View>
          <Text style={[styles.title, { fontFamily: fontBold, lineHeight: lineHeightFor(24, lang) }]}>
            {header.title}
          </Text>
          {!!header.subtitle && (
            <Text style={[styles.subtitle, { fontFamily: fontMedium, lineHeight: lineHeightFor(15, lang) }]}>
              {header.subtitle}
            </Text>
          )}

          <Animated.View style={[styles.field, shakeStyle]}>
            {step === 'phone' && (
              <PhoneInput
                value={localDigits}
                onChange={(v) => {
                  setLocalDigits(sanitizeLocal(v));
                  if (error) setError(null);
                }}
                onSubmit={sendCode}
                invalid={!!error}
                placeholder={t('auth.phonePlaceholder')}
              />
            )}

            {step === 'otp' && (
              <OtpInput
                value={code}
                invalid={!!error}
                onChange={(v) => {
                  const digits = v.replace(/\D/g, '').slice(0, OTP_LENGTH);
                  setCode(digits);
                  if (error) setError(null);
                  if (digits.length === OTP_LENGTH) verifyCode(digits);
                }}
              />
            )}

            {step === 'profile' && (
              <View style={styles.profileFields}>
                <Text style={[styles.inputLabel, { fontFamily: getFontFamily(lang, 'semibold') }]}>
                  {t('auth.fullName')}
                </Text>
                <TextInput
                  value={fullName}
                  onChangeText={(v) => {
                    setFullName(v);
                    if (error) setError(null);
                  }}
                  placeholder={t('auth.fullNamePlaceholder')}
                  placeholderTextColor={colors.text.muted}
                  autoFocus
                  autoCapitalize="words"
                  autoComplete="name"
                  textContentType="name"
                  returnKeyType="done"
                  maxLength={60}
                  onSubmitEditing={finishProfile}
                  style={[
                    styles.textInput,
                    { fontFamily: fontMedium, textAlign: isRTL ? 'right' : 'left' },
                    !!error && styles.inputInvalid,
                  ]}
                />

                <Text style={[styles.inputLabel, { fontFamily: getFontFamily(lang, 'semibold'), marginTop: 18 }]}>
                  {t('profile.city')}
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cityRow}>
                  {getSortedCities(lang).map((city) => {
                    const active = city.slug === citySlug;
                    return (
                      <Pressable
                        key={city.slug}
                        onPress={() => {
                          triggerHaptic('light');
                          setCitySlug(city.slug);
                        }}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: active }}
                        style={[styles.cityChip, active && styles.cityChipActive]}
                      >
                        {active && <Check size={14} color={colors.text.inverse} strokeWidth={3} />}
                        <Text
                          style={[
                            styles.cityChipText,
                            { fontFamily: getFontFamily(lang, 'semibold') },
                            active && { color: colors.text.inverse },
                          ]}
                        >
                          {getCityName(city, lang)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </Animated.View>

          {!!error && (
            <Animated.Text
              entering={FadeIn.duration(150)}
              style={[styles.error, { fontFamily: fontMedium, lineHeight: lineHeightFor(13, lang) }]}
            >
              {error}
            </Animated.Text>
          )}

          {step === 'otp' && (
            <View style={styles.otpLinks}>
              <Pressable
                disabled={resendIn > 0 || loading}
                onPress={sendCode}
                accessibilityRole="button"
                hitSlop={8}
              >
                <Text
                  style={[
                    styles.link,
                    { fontFamily: getFontFamily(lang, 'semibold') },
                    resendIn > 0 && { color: colors.text.muted },
                  ]}
                >
                  {resendIn > 0
                    ? t('auth.resendIn', { seconds: `⁦${resendIn}⁩` })
                    : t('auth.resend')}
                </Text>
              </Pressable>
              <Pressable onPress={() => goTo('phone')} accessibilityRole="button" hitSlop={8}>
                <Text style={[styles.linkMuted, { fontFamily: getFontFamily(lang, 'semibold') }]}>
                  {t('auth.changeNumber')}
                </Text>
              </Pressable>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {step === 'phone' && (
          <>
            <PrimaryButton
              title={t('auth.sendCode')}
              icon={ArrowRight}
              iconPosition="end"
              directionalIcon
              loading={loading}
              disabled={!phoneValid}
              onPress={sendCode}
            />
            <Text style={[styles.terms, { fontFamily: fontMedium, lineHeight: lineHeightFor(12, lang) }]}>
              {t('auth.terms')}
            </Text>
          </>
        )}
        {step === 'otp' && (
          <PrimaryButton
            title={t('auth.verify')}
            loading={loading}
            disabled={code.length !== OTP_LENGTH}
            onPress={() => verifyCode(code)}
          />
        )}
        {step === 'profile' && (
          <PrimaryButton
            title={t('auth.finish')}
            icon={ArrowRight}
            iconPosition="end"
            directionalIcon
            loading={loading}
            disabled={fullName.trim().length < 2}
            onPress={finishProfile}
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 PHONE INPUT                                */
/* -------------------------------------------------------------------------- */

function PhoneInput({
  value,
  onChange,
  onSubmit,
  invalid,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  invalid: boolean;
  placeholder: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View
      style={[
        styles.phoneBox,
        focused && styles.inputFocused,
        invalid && styles.inputInvalid,
      ]}
    >
      <View style={styles.prefix}>
        <Text style={styles.flag}>🇲🇦</Text>
        <Text style={styles.prefixText}>+212</Text>
      </View>
      <TextInput
        value={formatLocal(value)}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.text.muted}
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
        autoComplete="tel"
        autoFocus
        returnKeyType="done"
        onSubmitEditing={onSubmit}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={styles.phoneInput}
        accessibilityLabel="+212"
      />
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  OTP INPUT                                 */
/* -------------------------------------------------------------------------- */

function OtpInput({ value, onChange, invalid }: { value: string; onChange: (v: string) => void; invalid: boolean }) {
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(true);

  return (
    <Pressable style={styles.otpRow} onPress={() => inputRef.current?.focus()} accessible={false}>
      {Array.from({ length: OTP_LENGTH }).map((_, i) => {
        const char = value[i] ?? '';
        const isActive = focused && i === Math.min(value.length, OTP_LENGTH - 1);
        return (
          <View
            key={i}
            style={[
              styles.otpCell,
              !!char && styles.otpCellFilled,
              isActive && styles.inputFocused,
              invalid && styles.inputInvalid,
            ]}
          >
            <Text style={styles.otpChar}>{char}</Text>
          </View>
        );
      })}
      {/* One real input over the cells: supports paste & Android SMS autofill. */}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChange}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={OTP_LENGTH}
        autoFocus
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        caretHidden
        style={styles.otpHiddenInput}
        accessibilityLabel="OTP"
      />
    </Pressable>
  );
}

/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background.main,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backButton: {
    width: sizes.minTouch,
    height: sizes.minTouch,
    borderRadius: sizes.minTouch / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progress: {
    flexDirection: 'row',
    gap: 6,
  },
  progressDot: {
    width: 22,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border.DEFAULT,
  },
  progressDotActive: {
    backgroundColor: colors.accent.DEFAULT,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  stepIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.accent.soft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 24,
    color: colors.text.primary,
    textAlign: 'auto',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 15,
    color: colors.text.secondary,
    textAlign: 'auto',
  },
  field: {
    marginTop: 28,
  },
  phoneBox: {
    flexDirection: 'row',
    direction: 'ltr',
    alignItems: 'center',
    height: 60,
    borderRadius: radii.btn,
    borderWidth: 1.5,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.background.surface,
    overflow: 'hidden',
  },
  prefix: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: '100%',
    paddingHorizontal: 14,
    borderRightWidth: 1,
    borderRightColor: colors.border.DEFAULT,
    backgroundColor: colors.background.main,
  },
  flag: {
    fontSize: 18,
  },
  prefixText: {
    ...numericTextStyle('bodyLarge', 'bold', colors.text.primary),
  },
  phoneInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 14,
    fontFamily: fontFamilies.fr.bold,
    fontSize: 20,
    letterSpacing: 1,
    color: colors.text.primary,
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  inputFocused: {
    borderColor: colors.secondary.tealDark,
  },
  inputInvalid: {
    borderColor: colors.status.offline,
  },
  otpRow: {
    flexDirection: 'row',
    direction: 'ltr',
    justifyContent: 'space-between',
    gap: 8,
  },
  otpCell: {
    flex: 1,
    maxWidth: 54,
    height: 60,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.background.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpCellFilled: {
    borderColor: colors.secondary.teal,
  },
  otpChar: {
    ...numericTextStyle('headline', 'bold', colors.text.primary),
  },
  otpHiddenInput: {
    ...StyleSheet.absoluteFillObject,
    color: 'transparent',
    opacity: 0.02,
  },
  otpLinks: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  link: {
    fontSize: 14,
    color: colors.accent.dark,
  },
  linkMuted: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  profileFields: {},
  inputLabel: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: 8,
    textAlign: 'auto',
  },
  textInput: {
    height: sizes.inputHeight + 4,
    borderRadius: radii.btn,
    borderWidth: 1.5,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.background.surface,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.text.primary,
  },
  cityRow: {
    gap: 8,
    paddingVertical: 2,
  },
  cityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: 16,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.background.surface,
  },
  cityChipActive: {
    backgroundColor: colors.primary.DEFAULT,
    borderColor: colors.primary.DEFAULT,
  },
  cityChipText: {
    fontSize: 14,
    color: colors.text.primary,
  },
  error: {
    marginTop: 10,
    fontSize: 13,
    color: colors.status.offline,
    textAlign: 'auto',
  },
  bottom: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 10,
    backgroundColor: colors.background.main,
    borderTopWidth: 1,
    borderTopColor: colors.border.DEFAULT,
  },
  terms: {
    fontSize: 12,
    color: colors.text.muted,
    textAlign: 'center',
  },
});
