/**
 * ALLO LM3LM — First-run shop creation for a pro without a pro_profile.
 * Name, trade (category → booking engine), neighborhood, GPS pin.
 * Creates the profile with the 90-day free trial from the schema defaults.
 */
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Check, Gift, LocateFixed, MapPin, Store } from 'lucide-react-native';

import { getNeighborhoodName } from '../../constants/moroccoCities';
import { cardSurface, colors, getFontFamily, lineHeightFor, numericTextStyle, radii } from '../../constants/theme';
import { useAppLanguage } from '../../i18n';
import { supabase, useCategories } from '../../lib/supabase';
import { selectCity, useAppStore } from '../../store/useAppStore';
import CategoryIcon from '../ui/CategoryIcon';
import PrimaryButton, { triggerHaptic } from '../ui/PrimaryButton';
import TextField from '../ui/TextField';

type Errors = Partial<Record<'name' | 'category' | 'job' | 'location' | 'form', string>>;

export default function ProShopSetup() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, lang } = useAppLanguage();

  const user = useAppStore((s) => s.user);
  const city = useAppStore(selectCity);
  const setProProfile = useAppStore((s) => s.setProProfile);
  const setActiveMode = useAppStore((s) => s.setActiveMode);
  const setUserLocation = useAppStore((s) => s.setUserLocation);

  const { categories, loading: categoriesLoading } = useCategories();

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const jobs = categories.find((c) => c.id === categoryId)?.jobs ?? [];
  const [neighborhoodSlug, setNeighborhoodSlug] = useState(city.neighborhoods[0]?.slug ?? null);
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  const fontBold = getFontFamily(lang, 'bold');
  const fontMedium = getFontFamily(lang, 'medium');
  const fontSemi = getFontFamily(lang, 'semibold');

  const locate = async () => {
    setLocating(true);
    setErrors((e) => ({ ...e, location: undefined }));
    try {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) {
        setErrors((e) => ({ ...e, location: t('errors.locationDenied') }));
        triggerHaptic('warning');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const next = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      setCoords(next);
      setUserLocation(next);
      triggerHaptic('success');
    } catch {
      setErrors((e) => ({ ...e, location: t('errors.generic') }));
    } finally {
      setLocating(false);
    }
  };

  const create = async () => {
    const next: Errors = {};
    if (name.trim().length < 2) next.name = t('proSetup.nameRequired');
    if (!categoryId) next.category = t('proSetup.categoryRequired');
    else if (jobs.length && !jobId) next.job = t('proSetup.jobRequired');
    if (!coords) next.location = t('proSetup.locationRequired');
    setErrors(next);
    if (Object.keys(next).length || !user || !coords || !categoryId) {
      triggerHaptic('warning');
      return;
    }

    setSaving(true);
    try {
      const neighborhood = city.neighborhoods.find((n) => n.slug === neighborhoodSlug);
      const { data, error } = await supabase
        .from('pro_profiles')
        .insert({
          user_id: user.id,
          category_id: categoryId,
          job_id: jobId,
          business_name: name.trim().replace(/\s+/g, ' '),
          city: city.name_fr,
          neighborhood: neighborhood?.name_fr ?? null,
          address: address.trim() || null,
          latitude: coords.latitude,
          longitude: coords.longitude,
        })
        .select('*')
        .single();
      if (error) throw error;

      if (user.role === 'client') {
        await supabase.from('users').update({ role: 'pro' }).eq('id', user.id);
        useAppStore.setState({ user: { ...user, role: 'pro' } });
      }
      triggerHaptic('success');
      setProProfile(data);
    } catch (err) {
      if (__DEV__) console.warn('[ALLO LM3LM] create shop', err);
      setErrors({ form: t('errors.generic') });
      triggerHaptic('warning');
    } finally {
      setSaving(false);
    }
  };

  const backToClient = () => {
    setActiveMode('client');
    router.replace('/(client)');
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Animated.View entering={FadeInDown.duration(400)}>
          <View style={styles.heroIcon}>
            <Store size={28} color={colors.accent.DEFAULT} strokeWidth={2.2} />
          </View>
          <Text style={[styles.title, { fontFamily: fontBold, lineHeight: lineHeightFor(24, lang) }]}>
            {t('proSetup.title')}
          </Text>
          <Text style={[styles.subtitle, { fontFamily: fontMedium, lineHeight: lineHeightFor(15, lang) }]}>
            {t('proSetup.subtitle')}
          </Text>
          <View style={styles.trial}>
            <Gift size={16} color={colors.accent.dark} />
            <Text style={[styles.trialText, { fontFamily: fontSemi }]}>{t('proSetup.trial')}</Text>
          </View>
        </Animated.View>

        <TextField
          label={t('settings.businessName')}
          value={name}
          onChangeText={(v) => {
            setName(v);
            if (errors.name) setErrors((e) => ({ ...e, name: undefined }));
          }}
          placeholder="Salon Ahlam, Garage Atlas…"
          maxLength={60}
          error={errors.name}
          containerStyle={styles.block}
        />

        <Text style={[styles.label, { fontFamily: fontSemi }]}>{t('proSetup.category')}</Text>
        <View style={styles.categoryGrid}>
          {categoriesLoading && !categories.length
            ? [0, 1, 2, 3, 4, 5].map((i) => <View key={i} style={[styles.categoryCard, styles.skeleton]} />)
            : categories.map((cat) => {
                const active = cat.id === categoryId;
                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => {
                      triggerHaptic('light');
                      if (cat.id !== categoryId) setJobId(null);
                      setCategoryId(cat.id);
                      setErrors((e) => ({ ...e, category: undefined, job: undefined }));
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active }}
                    style={[styles.categoryCard, active && styles.categoryCardActive]}
                  >
                    <CategoryIcon icon={cat.icon} slug={cat.slug} size={40} radius={12} />
                    <Text
                      numberOfLines={2}
                      style={[styles.categoryText, { fontFamily: fontSemi, lineHeight: lineHeightFor(13, lang) }]}
                    >
                      {lang === 'ar' ? cat.name_ar : cat.name_fr}
                    </Text>
                    {active && (
                      <View style={styles.categoryCheck}>
                        <Check size={12} color={colors.text.inverse} strokeWidth={3} />
                      </View>
                    )}
                  </Pressable>
                );
              })}
        </View>
        {!!errors.category && <Text style={[styles.error, { fontFamily: fontMedium }]}>{errors.category}</Text>}

        {jobs.length > 0 && (
          <>
            <Text style={[styles.label, { fontFamily: fontSemi, marginTop: 18 }]}>{t('proSetup.job')}</Text>
            <View style={styles.jobsWrap}>
              {jobs.map((job) => {
                const active = job.id === jobId;
                return (
                  <Pressable
                    key={job.id}
                    onPress={() => {
                      triggerHaptic('light');
                      setJobId(job.id);
                      setErrors((e) => ({ ...e, job: undefined }));
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active }}
                    style={[styles.chip, styles.jobChip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, { fontFamily: fontSemi }, active && { color: colors.text.inverse }]}>
                      {lang === 'ar' ? job.name_ar : job.name_fr}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {!!errors.job && <Text style={[styles.error, { fontFamily: fontMedium }]}>{errors.job}</Text>}
          </>
        )}

        <Text style={[styles.label, { fontFamily: fontSemi, marginTop: 18 }]}>
          {t('proSetup.neighborhood')} • {lang === 'ar' ? city.name_ar : city.name_fr}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {city.neighborhoods.map((n) => {
            const active = n.slug === neighborhoodSlug;
            return (
              <Pressable
                key={n.slug}
                onPress={() => setNeighborhoodSlug(n.slug)}
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

        <TextField
          label={`${t('settings.address')} (${t('common.optional')})`}
          value={address}
          onChangeText={setAddress}
          placeholder={t('proSetup.addressPlaceholder')}
          maxLength={120}
          containerStyle={styles.block}
        />

        <Pressable
          onPress={locate}
          disabled={locating}
          accessibilityRole="button"
          style={[styles.locationCard, !!coords && styles.locationCardDone, !!errors.location && styles.locationCardError]}
        >
          <View style={[styles.locationIcon, !!coords && { backgroundColor: colors.status.online }]}>
            {coords ? (
              <MapPin size={20} color={colors.text.inverse} />
            ) : (
              <LocateFixed size={20} color={colors.primary.DEFAULT} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.locationTitle, { fontFamily: fontSemi, lineHeight: lineHeightFor(15, lang) }]}>
              {locating ? t('proSetup.locating') : coords ? t('proSetup.located') : t('proSetup.locate')}
            </Text>
            {!!coords && (
              <Text style={styles.coords}>{`${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`}</Text>
            )}
          </View>
        </Pressable>
        {!!errors.location && <Text style={[styles.error, { fontFamily: fontMedium }]}>{errors.location}</Text>}
        {!!errors.form && <Text style={[styles.error, { fontFamily: fontMedium }]}>{errors.form}</Text>}
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <PrimaryButton title={t('proSetup.create')} icon={Store} loading={saving} onPress={create} haptic="medium" />
        <PrimaryButton title={t('profile.switchToClient')} variant="ghost" compact haptic="light" onPress={backToClient} />
      </View>
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
    paddingBottom: 32,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.accent.soft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
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
  trial: {
    marginTop: 14,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.accent.soft,
  },
  trialText: {
    fontSize: 13,
    color: colors.accent.dark,
  },
  block: {
    marginTop: 20,
  },
  label: {
    marginTop: 20,
    marginBottom: 8,
    fontSize: 13,
    color: colors.text.secondary,
    textAlign: 'auto',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryCard: {
    ...cardSurface,
    width: '48%',
    flexGrow: 1,
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 16,
  },
  categoryCardActive: {
    borderColor: colors.secondary.teal,
    borderWidth: 2,
    padding: 9,
  },
  skeleton: {
    backgroundColor: colors.border.DEFAULT,
    borderColor: colors.border.DEFAULT,
  },
  categoryText: {
    flex: 1,
    fontSize: 13,
    color: colors.text.primary,
    textAlign: 'auto',
  },
  categoryCheck: {
    position: 'absolute',
    top: 6,
    end: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.accent.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  jobsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  jobChip: {
    height: undefined,
    minHeight: 38,
    paddingVertical: 8,
  },
  chipsRow: {
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.background.surface,
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: colors.primary.DEFAULT,
    borderColor: colors.primary.DEFAULT,
  },
  chipText: {
    fontSize: 13,
    color: colors.text.primary,
  },
  locationCard: {
    ...cardSurface,
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderColor: colors.secondary.teal,
  },
  locationCardDone: {
    borderStyle: 'solid',
    borderColor: colors.status.online,
  },
  locationCardError: {
    borderColor: colors.status.offline,
  },
  locationIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.secondary.tealLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationTitle: {
    fontSize: 15,
    color: colors.text.primary,
    textAlign: 'auto',
  },
  coords: {
    ...numericTextStyle('small', 'medium', colors.text.secondary),
    textAlign: 'left',
    marginTop: 2,
  },
  error: {
    marginTop: 6,
    fontSize: 12,
    color: colors.status.offline,
    textAlign: 'auto',
  },
  bottom: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border.DEFAULT,
    backgroundColor: colors.background.main,
  },
});
