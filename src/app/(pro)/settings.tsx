/**
 * AlloPro — Pro settings: shop info (bilingual description, address,
 * neighborhood, GPS pin), subscription status, language, switch to client
 * mode, logout.
 */
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { BadgeCheck, CreditCard, Languages, LocateFixed, LogOut, MessageCircle, Repeat, Store } from 'lucide-react-native';

import LanguageSwitch from '../../components/ui/LanguageSwitch';
import PrimaryButton, { triggerHaptic } from '../../components/ui/PrimaryButton';
import TextField from '../../components/ui/TextField';
import { findCityByName, getCity, getNeighborhoodName } from '../../constants/moroccoCities';
import { cardSurface, colors, getFontFamily, lineHeightFor, numericTextStyle, radii } from '../../constants/theme';
import { useAppLanguage } from '../../i18n';
import { supabase } from '../../lib/supabase';
import { formatDayLabel, ltr, openWhatsApp } from '../../lib/whatsapp';
import { useAppStore } from '../../store/useAppStore';

const DAY_MS = 24 * 60 * 60 * 1000;
const SUPPORT_WHATSAPP = process.env.EXPO_PUBLIC_SUPPORT_WHATSAPP ?? '';

export default function ProSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, lang } = useAppLanguage();

  const proProfile = useAppStore((s) => s.proProfile);
  const patchProProfile = useAppStore((s) => s.patchProProfile);
  const setActiveMode = useAppStore((s) => s.setActiveMode);
  const signOut = useAppStore((s) => s.signOut);

  const city = useMemo(() => findCityByName(proProfile?.city) ?? getCity(null), [proProfile?.city]);

  const [businessName, setBusinessName] = useState('');
  const [descFr, setDescFr] = useState('');
  const [descAr, setDescAr] = useState('');
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!proProfile) return;
    setBusinessName(proProfile.business_name);
    setDescFr(proProfile.description_fr ?? '');
    setDescAr(proProfile.description_ar ?? '');
    setAddress(proProfile.address ?? '');
    setNeighborhood(proProfile.neighborhood);
    setCoords({ latitude: proProfile.latitude, longitude: proProfile.longitude });
    // Only when switching shop, not on every realtime counter update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proProfile?.id]);

  if (!proProfile) return null;

  const dirty =
    businessName.trim() !== proProfile.business_name ||
    descFr.trim() !== (proProfile.description_fr ?? '') ||
    descAr.trim() !== (proProfile.description_ar ?? '') ||
    address.trim() !== (proProfile.address ?? '') ||
    neighborhood !== proProfile.neighborhood ||
    coords?.latitude !== proProfile.latitude ||
    coords?.longitude !== proProfile.longitude;

  const end = new Date(proProfile.subscription_end_date);
  const daysLeft = Math.max(0, Math.ceil((end.getTime() - Date.now()) / DAY_MS));
  const subscriptionOk = proProfile.subscription_active && daysLeft > 0;

  const fontBold = getFontFamily(lang, 'bold');
  const fontSemi = getFontFamily(lang, 'semibold');
  const fontMedium = getFontFamily(lang, 'medium');

  /* -------------------------------- actions ------------------------------- */
  const updatePin = async () => {
    setLocating(true);
    try {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) {
        Alert.alert(t('permissions.locationTitle'), t('errors.locationDenied'));
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      triggerHaptic('success');
    } catch {
      Alert.alert(t('common.error'), t('errors.generic'));
    } finally {
      setLocating(false);
    }
  };

  const save = async () => {
    if (businessName.trim().length < 2) {
      setError(t('proSetup.nameRequired'));
      triggerHaptic('warning');
      return;
    }
    setSaving(true);
    setError(null);
    const patch = {
      business_name: businessName.trim().replace(/\s+/g, ' '),
      description_fr: descFr.trim() || null,
      description_ar: descAr.trim() || null,
      address: address.trim() || null,
      neighborhood,
      latitude: coords?.latitude ?? proProfile.latitude,
      longitude: coords?.longitude ?? proProfile.longitude,
    };
    const { error: err } = await supabase.from('pro_profiles').update(patch).eq('id', proProfile.id);
    setSaving(false);
    if (err) {
      setError(t('errors.generic'));
      return;
    }
    patchProProfile(patch);
    triggerHaptic('success');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const switchToClient = () => {
    setActiveMode('client');
    router.replace('/(client)');
  };

  const logout = () => {
    Alert.alert(t('profile.logout'), t('profile.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('profile.logout'), style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const contactSupport = () => {
    if (!SUPPORT_WHATSAPP) return;
    openWhatsApp(SUPPORT_WHATSAPP, t('settings.renewMessage', { name: proProfile.business_name }));
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { fontFamily: fontBold, lineHeight: lineHeightFor(22, lang) }]}>{t('settings.title')}</Text>

        {/* ------------------------------ shop ------------------------------ */}
        <SectionHeader Icon={Store} label={t('settings.shop')} />
        <View style={styles.card}>
          <TextField label={t('settings.businessName')} value={businessName} onChangeText={setBusinessName} maxLength={60} error={error} />
          <TextField label={t('settings.descriptionFr')} value={descFr} onChangeText={setDescFr} multiline maxLength={400} />
          <TextField label={t('settings.descriptionAr')} value={descAr} onChangeText={setDescAr} multiline maxLength={400} />
          <TextField label={t('settings.address')} value={address} onChangeText={setAddress} maxLength={120} />

          <View>
            <Text style={[styles.label, { fontFamily: fontSemi }]}>
              {t('settings.neighborhood')} • {lang === 'ar' ? city.name_ar : city.name_fr}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {city.neighborhoods.map((n) => {
                const active = n.name_fr === neighborhood;
                return (
                  <Pressable
                    key={n.slug}
                    onPress={() => setNeighborhood(n.name_fr)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active }}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, { fontFamily: fontSemi }, active && { color: colors.text.inverse }]}>
                      {getNeighborhoodName(n, lang)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View>
            <Text style={[styles.label, { fontFamily: fontSemi }]}>{t('settings.pinLocation')}</Text>
            <View style={styles.pinRow}>
              <Text style={styles.coords}>
                {coords ? `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}` : '—'}
              </Text>
              <PrimaryButton
                title={t('settings.updatePin')}
                icon={LocateFixed}
                variant="outline"
                compact
                fullWidth={false}
                loading={locating}
                onPress={updatePin}
                haptic="light"
              />
            </View>
          </View>

          <PrimaryButton
            title={saved ? t('common.saved') : t('common.save')}
            variant={saved ? 'success' : 'secondary'}
            disabled={!dirty && !saved}
            loading={saving}
            onPress={save}
          />
        </View>

        {/* -------------------------- subscription -------------------------- */}
        <SectionHeader Icon={CreditCard} label={t('settings.subscription')} />
        <View style={[styles.card, styles.subCard, !subscriptionOk && styles.subCardExpired]}>
          <View style={styles.subTop}>
            <BadgeCheck size={22} color={subscriptionOk ? colors.status.online : colors.status.offline} />
            <Text
              style={[
                styles.subTitle,
                { fontFamily: fontBold, lineHeight: lineHeightFor(15, lang) },
                !subscriptionOk && { color: colors.status.offline },
              ]}
            >
              {subscriptionOk
                ? t('settings.subscriptionActive', { date: formatDayLabel(end, lang) })
                : t('settings.subscriptionExpired')}
            </Text>
          </View>
          {subscriptionOk && (
            <Text style={[styles.subDays, { fontFamily: fontSemi }]}>{t('settings.daysLeft', { count: daysLeft })}</Text>
          )}
          <Text style={[styles.subHint, { fontFamily: fontMedium, lineHeight: lineHeightFor(12, lang) }]}>
            {t('settings.subscriptionRenew')} — {t('settings.renewHint')}
          </Text>
          {!!SUPPORT_WHATSAPP && (
            <PrimaryButton
              title={t('settings.contactSupport')}
              icon={MessageCircle}
              variant={subscriptionOk ? 'outline' : 'primary'}
              compact
              onPress={contactSupport}
              haptic="light"
            />
          )}
        </View>

        {/* ----------------------------- language ---------------------------- */}
        <SectionHeader Icon={Languages} label={t('language.title')} />
        <View style={[styles.card, styles.row]}>
          <Text style={[styles.rowLabel, { fontFamily: fontSemi }]}>{lang === 'ar' ? t('language.ar') : t('language.fr')}</Text>
          <LanguageSwitch />
        </View>

        {/* ------------------------------ account ---------------------------- */}
        <SectionHeader Icon={Repeat} label={t('settings.account')} />
        <View style={styles.card}>
          <PrimaryButton title={t('profile.switchToClient')} icon={Repeat} variant="secondary" onPress={switchToClient} />
          <PrimaryButton
            title={t('profile.logout')}
            icon={LogOut}
            variant="ghost"
            compact
            haptic="light"
            onPress={logout}
            textStyle={{ color: colors.status.offline }}
          />
        </View>

        <Text style={styles.version}>{ltr('AlloPro • v1.0.0')}</Text>
      </ScrollView>
    </View>
  );
}

function SectionHeader({ Icon, label }: { Icon: typeof Store; label: string }) {
  const { lang } = useAppLanguage();
  return (
    <View style={styles.sectionHeader}>
      <Icon size={16} color={colors.text.secondary} />
      <Text style={[styles.sectionLabel, { fontFamily: getFontFamily(lang, 'semibold') }]}>{label}</Text>
    </View>
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 24,
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  card: {
    ...cardSurface,
    padding: 16,
    gap: 14,
  },
  label: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: 8,
    textAlign: 'auto',
  },
  chips: {
    gap: 8,
  },
  chip: {
    height: 36,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.background.surface,
  },
  chipActive: {
    backgroundColor: colors.primary.DEFAULT,
    borderColor: colors.primary.DEFAULT,
  },
  chipText: {
    fontSize: 13,
    color: colors.text.primary,
  },
  pinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  coords: {
    ...numericTextStyle('small', 'medium', colors.text.secondary),
    flexShrink: 1,
  },
  subCard: {
    gap: 10,
  },
  subCardExpired: {
    borderColor: colors.status.offline,
    backgroundColor: colors.status.offlineSoft,
  },
  subTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subTitle: {
    flex: 1,
    fontSize: 15,
    color: colors.text.primary,
    textAlign: 'auto',
  },
  subDays: {
    fontSize: 13,
    color: colors.status.online,
    textAlign: 'auto',
  },
  subHint: {
    fontSize: 12,
    color: colors.text.secondary,
    textAlign: 'auto',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLabel: {
    fontSize: 15,
    color: colors.text.primary,
  },
  version: {
    marginTop: 24,
    textAlign: 'center',
    fontSize: 12,
    color: colors.text.muted,
  },
});
