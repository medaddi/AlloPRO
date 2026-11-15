/**
 * AlloPro — Welcome / onboarding.
 * Vector hero (animated logo + floating category chips), FR | ع language
 * switch, and Client / Pro role selection. CTA sits in the thumb zone.
 */
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  FadeInDown,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { ArrowRight, Car, Check, Scissors, Search, Stethoscope, Store, Wrench, type LucideIcon } from 'lucide-react-native';

import SplashLogoAnimation from '../../components/animations/SplashLogoAnimation';
import LanguageSwitch from '../../components/ui/LanguageSwitch';
import PrimaryButton, { triggerHaptic } from '../../components/ui/PrimaryButton';
import { cardSurface, colors, getFontFamily, lineHeightFor, motion, radii, shadows } from '../../constants/theme';
import { useAppLanguage } from '../../i18n';
import { useAppStore, type AppMode } from '../../store/useAppStore';

const HERO_SIZE = 220;

const HERO_CHIPS: { Icon: LucideIcon; top: number; start: number; delay: number; tint: string }[] = [
  { Icon: Scissors, top: 18, start: 6, delay: 0, tint: colors.accent.soft },
  { Icon: Stethoscope, top: 30, start: HERO_SIZE - 50, delay: 400, tint: colors.secondary.tealLight },
  { Icon: Wrench, top: HERO_SIZE - 70, start: 0, delay: 800, tint: colors.secondary.tealLight },
  { Icon: Car, top: HERO_SIZE - 60, start: HERO_SIZE - 46, delay: 1200, tint: colors.accent.soft },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, lang } = useAppLanguage();

  const storedMode = useAppStore((s) => s.activeMode);
  const setActiveMode = useAppStore((s) => s.setActiveMode);
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);

  const [role, setRole] = useState<AppMode>(storedMode);

  const handleContinue = () => {
    setActiveMode(role);
    completeOnboarding();
    router.push('/login');
  };

  const fontBold = getFontFamily(lang, 'bold');
  const fontMedium = getFontFamily(lang, 'medium');

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Text style={styles.brand}>
          <Text style={{ color: colors.primary.DEFAULT }}>Allo</Text>
          <Text style={{ color: colors.accent.DEFAULT }}>Pro</Text>
        </Text>
        <LanguageSwitch />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} bounces={false}>
        <Animated.View entering={FadeInDown.duration(500)} style={styles.hero}>
          <View style={styles.heroDisc} />
          {HERO_CHIPS.map((chip, i) => (
            <FloatingChip key={i} {...chip} />
          ))}
          <SplashLogoAnimation size={128} showWordmark={false} holdMs={0} />
        </Animated.View>

        <Animated.Text
          entering={FadeInDown.delay(120).duration(450)}
          style={[styles.title, { fontFamily: fontBold, lineHeight: lineHeightFor(26, lang) }]}
        >
          {t('welcome.title')}
        </Animated.Text>
        <Animated.Text
          entering={FadeInDown.delay(180).duration(450)}
          style={[styles.subtitle, { fontFamily: fontMedium, lineHeight: lineHeightFor(15, lang) }]}
        >
          {t('welcome.subtitle')}
        </Animated.Text>

        <Animated.Text
          entering={FadeInDown.delay(240).duration(450)}
          style={[styles.sectionLabel, { fontFamily: getFontFamily(lang, 'semibold') }]}
        >
          {t('welcome.chooseRole')}
        </Animated.Text>

        <Animated.View entering={FadeInDown.delay(300).duration(450)} style={styles.roles}>
          <RoleCard
            Icon={Search}
            title={t('welcome.client')}
            description={t('welcome.clientDesc')}
            selected={role === 'client'}
            onPress={() => setRole('client')}
          />
          <RoleCard
            Icon={Store}
            title={t('welcome.pro')}
            description={t('welcome.proDesc')}
            selected={role === 'pro'}
            onPress={() => setRole('pro')}
          />
        </Animated.View>
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <PrimaryButton
          title={t('welcome.continue')}
          icon={ArrowRight}
          iconPosition="end"
          directionalIcon
          onPress={handleContinue}
        />
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  ROLE CARD                                 */
/* -------------------------------------------------------------------------- */

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function RoleCard({
  Icon,
  title,
  description,
  selected,
  onPress,
}: {
  Icon: LucideIcon;
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { lang } = useAppLanguage();
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${title}. ${description}`}
      onPressIn={() => {
        scale.value = withTiming(motion.pressScale, { duration: motion.pressDuration });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, motion.spring.snappy);
      }}
      onPress={() => {
        triggerHaptic('light');
        onPress();
      }}
      style={[styles.roleCard, selected && styles.roleCardSelected, pressStyle]}
    >
      <View style={[styles.roleIcon, selected && { backgroundColor: colors.accent.DEFAULT }]}>
        <Icon size={22} color={selected ? colors.text.inverse : colors.primary.DEFAULT} strokeWidth={2.2} />
      </View>
      <View style={styles.roleTexts}>
        <Text style={[styles.roleTitle, { fontFamily: getFontFamily(lang, 'bold'), lineHeight: lineHeightFor(16, lang) }]}>
          {title}
        </Text>
        <Text
          style={[styles.roleDesc, { fontFamily: getFontFamily(lang, 'medium'), lineHeight: lineHeightFor(13, lang) }]}
        >
          {description}
        </Text>
      </View>
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected && <Check size={14} color={colors.text.inverse} strokeWidth={3} />}
      </View>
    </AnimatedPressable>
  );
}

/* -------------------------------------------------------------------------- */
/*                                FLOATING CHIP                               */
/* -------------------------------------------------------------------------- */

function FloatingChip({
  Icon,
  top,
  start,
  delay,
  tint,
}: {
  Icon: LucideIcon;
  top: number;
  start: number;
  delay: number;
  tint: string;
}) {
  const reduceMotion = useReducedMotion();
  const y = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    y.value = withDelay(
      delay,
      withRepeat(withTiming(-6, { duration: 1600, easing: Easing.inOut(Easing.sin) }), -1, true),
    );
    return () => cancelAnimation(y);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion, delay]);

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  return (
    <Animated.View style={[styles.chip, { top, start, backgroundColor: tint }, style]}>
      <Icon size={20} color={colors.primary.DEFAULT} strokeWidth={2.2} />
    </Animated.View>
  );
}

/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background.main,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  brand: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 20,
    writingDirection: 'ltr',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  hero: {
    width: HERO_SIZE,
    height: HERO_SIZE,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  heroDisc: {
    position: 'absolute',
    width: HERO_SIZE * 0.86,
    height: HERO_SIZE * 0.86,
    borderRadius: HERO_SIZE,
    backgroundColor: colors.background.surface,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  chip: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.background.surface,
    ...shadows.card,
  },
  title: {
    fontSize: 26,
    color: colors.text.primary,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  sectionLabel: {
    marginTop: 28,
    marginBottom: 10,
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'auto',
  },
  roles: {
    gap: 12,
  },
  roleCard: {
    ...cardSurface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
  },
  roleCardSelected: {
    borderColor: colors.secondary.teal,
    borderWidth: 2,
    padding: 15,
  },
  roleIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.secondary.tealLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleTexts: {
    flex: 1,
    gap: 2,
  },
  roleTitle: {
    fontSize: 16,
    color: colors.text.primary,
    textAlign: 'auto',
  },
  roleDesc: {
    fontSize: 13,
    color: colors.text.secondary,
    textAlign: 'auto',
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border.strong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    backgroundColor: colors.accent.DEFAULT,
    borderColor: colors.accent.DEFAULT,
  },
  bottom: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: colors.background.main,
    borderTopWidth: 1,
    borderTopColor: colors.border.DEFAULT,
  },
});
