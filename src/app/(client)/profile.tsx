/**
 * ALLO LM3LM — Client profile: identity, city, language, switch to Pro Mode,
 * help, logout.
 */
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, Languages, LifeBuoy, LogOut, MapPin, Store } from 'lucide-react-native';

import CityPickerSheet from '../../components/client/CityPickerSheet';
import LanguageSwitch from '../../components/ui/LanguageSwitch';
import PrimaryButton from '../../components/ui/PrimaryButton';
import { formatLocationLabel, getNeighborhood } from '../../constants/moroccoCities';
import { cardSurface, colors, getFontFamily, lineHeightFor, numericTextStyle, radii } from '../../constants/theme';
import { useAppLanguage } from '../../i18n';
import { formatMoroccanPhone, ltr, openWhatsApp } from '../../lib/whatsapp';
import { selectCity, useAppStore } from '../../store/useAppStore';

const SUPPORT_WHATSAPP = process.env.EXPO_PUBLIC_SUPPORT_WHATSAPP ?? '';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, lang, mirror } = useAppLanguage();

  const user = useAppStore((s) => s.user);
  const proProfile = useAppStore((s) => s.proProfile);
  const city = useAppStore(selectCity);
  const neighborhood = useAppStore((s) => s.selectedNeighborhood);
  const setActiveMode = useAppStore((s) => s.setActiveMode);
  const signOut = useAppStore((s) => s.signOut);

  const [cityOpen, setCityOpen] = useState(false);

  const fontBold = getFontFamily(lang, 'bold');
  const fontSemi = getFontFamily(lang, 'semibold');

  const switchToPro = () => {
    setActiveMode('pro');
    router.replace('/(pro)');
  };

  const logout = () => {
    Alert.alert(t('profile.logout'), t('profile.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('profile.logout'), style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const initials = (user?.full_name ?? '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.title, { fontFamily: fontBold, lineHeight: lineHeightFor(22, lang) }]}>{t('profile.title')}</Text>

        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={[styles.avatarText, { fontFamily: fontBold }]}>{initials}</Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text numberOfLines={1} style={[styles.name, { fontFamily: fontBold, lineHeight: lineHeightFor(18, lang) }]}>
              {user?.full_name ?? ''}
            </Text>
            {!!user?.phone && <Text style={styles.phone}>{formatMoroccanPhone(user.phone)}</Text>}
          </View>
        </View>

        {/* Pro Mode switch (InDrive-style) */}
        <Pressable
          onPress={switchToPro}
          accessibilityRole="button"
          style={({ pressed }) => [styles.proCard, pressed && { transform: [{ scale: 0.98 }] }]}
        >
          <View style={styles.proIcon}>
            <Store size={24} color={colors.text.inverse} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.proTitle, { fontFamily: fontBold, lineHeight: lineHeightFor(16, lang) }]}>
              {proProfile ? t('profile.switchToPro') : t('profile.becomePro')}
            </Text>
            <Text style={[styles.proSub, { fontFamily: getFontFamily(lang, 'medium'), lineHeight: lineHeightFor(12, lang) }]}>
              {proProfile ? proProfile.business_name : t('welcome.proDesc')}
            </Text>
          </View>
          <View style={{ transform: mirror }}>
            <ChevronRight size={20} color={colors.secondary.teal} />
          </View>
        </Pressable>

        <View style={styles.card}>
          <SettingRow
            Icon={MapPin}
            label={t('profile.city')}
            value={formatLocationLabel(city, getNeighborhood(city, neighborhood), lang)}
            onPress={() => setCityOpen(true)}
          />
          <View style={styles.divider} />
          <View style={styles.row}>
            <Languages size={20} color={colors.primary.DEFAULT} />
            <Text style={[styles.rowLabel, { fontFamily: fontSemi }]}>{t('language.title')}</Text>
            <LanguageSwitch />
          </View>
          {!!SUPPORT_WHATSAPP && (
            <>
              <View style={styles.divider} />
              <SettingRow
                Icon={LifeBuoy}
                label={t('profile.help')}
                onPress={() => openWhatsApp(SUPPORT_WHATSAPP, t('profile.helpMessage'))}
              />
            </>
          )}
        </View>

        <PrimaryButton
          title={t('profile.logout')}
          icon={LogOut}
          variant="ghost"
          haptic="light"
          onPress={logout}
          textStyle={{ color: colors.status.offline }}
          style={{ marginTop: 16 }}
        />

        <Text style={styles.version}>{ltr('ALLO LM3LM • v1.0.0')}</Text>
      </ScrollView>

      <CityPickerSheet visible={cityOpen} onClose={() => setCityOpen(false)} />
    </View>
  );
}

function SettingRow({
  Icon,
  label,
  value,
  onPress,
}: {
  Icon: typeof MapPin;
  label: string;
  value?: string;
  onPress: () => void;
}) {
  const { lang, mirror } = useAppLanguage();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.row, pressed && { opacity: 0.8 }]}>
      <Icon size={20} color={colors.primary.DEFAULT} />
      <Text style={[styles.rowLabel, { fontFamily: getFontFamily(lang, 'semibold') }]}>{label}</Text>
      {!!value && (
        <Text numberOfLines={1} style={[styles.rowValue, { fontFamily: getFontFamily(lang, 'medium') }]}>
          {value}
        </Text>
      )}
      <View style={{ transform: mirror }}>
        <ChevronRight size={18} color={colors.text.muted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background.main,
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    color: colors.text.primary,
    textAlign: 'auto',
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 18,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.secondary.tealLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    color: colors.primary.DEFAULT,
  },
  name: {
    fontSize: 18,
    color: colors.text.primary,
    textAlign: 'auto',
  },
  phone: {
    ...numericTextStyle('body', 'medium', colors.text.secondary),
    textAlign: 'auto',
  },
  proCard: {
    marginTop: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: radii.card,
    backgroundColor: colors.primary.DEFAULT,
  },
  proIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.accent.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proTitle: {
    fontSize: 16,
    color: colors.text.inverse,
    textAlign: 'auto',
  },
  proSub: {
    fontSize: 12,
    color: colors.secondary.tealLight,
    textAlign: 'auto',
  },
  card: {
    ...cardSurface,
    marginTop: 16,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 58,
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    color: colors.text.primary,
    textAlign: 'auto',
  },
  rowValue: {
    maxWidth: '45%',
    fontSize: 13,
    color: colors.text.secondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.DEFAULT,
  },
  version: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: 12,
    color: colors.text.muted,
  },
});
