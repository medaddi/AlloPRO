/**
 * ALLO LM3LM — Client Home & Discovery.
 * City/neighborhood selector + FR|ع, fixed search, live ticket banner(s),
 * category bar and "Pros ouverts près de vous".
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ChevronDown, LayoutGrid, MapPin, Search, SearchX, X } from 'lucide-react-native';

import ActiveTicketBanner from '../../components/client/ActiveTicketBanner';
import CityPickerSheet from '../../components/client/CityPickerSheet';
import ProCard from '../../components/client/ProCard';
import CategoryIcon from '../../components/ui/CategoryIcon';
import LanguageSwitch from '../../components/ui/LanguageSwitch';
import { triggerHaptic } from '../../components/ui/PrimaryButton';
import SkeletonCard from '../../components/ui/SkeletonCard';
import { formatLocationLabel, getNeighborhood } from '../../constants/moroccoCities';
import { colors, getFontFamily, lineHeightFor, radii, shadows } from '../../constants/theme';
import { useAppLanguage } from '../../i18n';
import { usePros, useClientBookings } from '../../lib/clientData';
import { useCategories } from '../../lib/supabase';
import { selectCity, useAppStore } from '../../store/useAppStore';

const normalize = (s: string | null | undefined) =>
  (s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, lang, isRTL } = useAppLanguage();

  const user = useAppStore((s) => s.user);
  const city = useAppStore(selectCity);
  const neighborhoodSlug = useAppStore((s) => s.selectedNeighborhood);
  const userLocation = useAppStore((s) => s.userLocation);
  const setUserLocation = useAppStore((s) => s.setUserLocation);

  const { pros, loading, refresh } = usePros(city.name_fr, userLocation);
  const { active } = useClientBookings(user?.id);
  const { categories } = useCategories();

  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [cityOpen, setCityOpen] = useState(false);

  // Best-effort GPS for distances (never blocks the screen).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let { granted } = await Location.getForegroundPermissionsAsync();
        if (!granted) ({ granted } = await Location.requestForegroundPermissionsAsync());
        if (!granted || cancelled) return;
        const last = await Location.getLastKnownPositionAsync();
        if (last && !cancelled) setUserLocation({ latitude: last.coords.latitude, longitude: last.coords.longitude });
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!cancelled) setUserLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      } catch {
        // Location is optional on Home.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setUserLocation]);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return pros.filter((p) => {
      if (category && p.category?.slug !== category) return false;
      if (!q) return true;
      return [p.business_name, p.neighborhood, p.category?.name_fr, p.category?.name_ar, p.description_fr]
        .map(normalize)
        .some((field) => field.includes(q));
    });
  }, [pros, category, query]);

  const locationLabel = formatLocationLabel(city, getNeighborhood(city, neighborhoodSlug), lang);
  const firstName = user?.full_name?.split(' ')[0];

  const fontBold = getFontFamily(lang, 'bold');
  const fontSemi = getFontFamily(lang, 'semibold');
  const fontMedium = getFontFamily(lang, 'medium');

  const header = (
    <View>
      {active.slice(0, 2).map((b) => (
        <ActiveTicketBanner
          key={b.id}
          booking={b}
          proName={b.pro?.business_name ?? ''}
          onPress={() => router.push('/bookings')}
          style={styles.banner}
        />
      ))}

      <Text style={[styles.sectionTitle, { fontFamily: fontBold, lineHeight: lineHeightFor(17, lang) }]}>
        {t('home.categories')}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
        <CategoryChip
          label={t('categories.all')}
          active={category === null}
          onPress={() => setCategory(null)}
          icon={<LayoutGrid size={22} color={category === null ? colors.text.inverse : colors.primary.DEFAULT} />}
        />
        {categories.map((c) => (
          <CategoryChip
            key={c.id}
            label={lang === 'ar' ? c.name_ar : c.name_fr}
            active={category === c.slug}
            onPress={() => setCategory(category === c.slug ? null : c.slug)}
            icon={
              <CategoryIcon
                icon={c.icon}
                slug={c.slug}
                size={44}
                radius={14}
                color={category === c.slug ? colors.text.inverse : colors.primary.DEFAULT}
                background={category === c.slug ? colors.accent.DEFAULT : undefined}
              />
            }
          />
        ))}
      </ScrollView>

      <Text style={[styles.sectionTitle, { fontFamily: fontBold, lineHeight: lineHeightFor(17, lang) }]}>
        {t('home.nearbyOpen')}
      </Text>
    </View>
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => setCityOpen(true)}
          style={styles.location}
          accessibilityRole="button"
          accessibilityLabel={`${t('home.selectCity')}: ${locationLabel}`}
        >
          <MapPin size={18} color={colors.accent.DEFAULT} />
          <Text numberOfLines={1} style={[styles.locationText, { fontFamily: fontSemi }]}>
            {locationLabel}
          </Text>
          <ChevronDown size={16} color={colors.text.secondary} />
        </Pressable>
        <LanguageSwitch />
      </View>

      <Text style={[styles.greeting, { fontFamily: fontBold, lineHeight: lineHeightFor(22, lang) }]}>
        {firstName ? t('home.greeting', { name: firstName }) : t('home.greetingGuest')}
      </Text>

      {/* Fixed (sticky) search */}
      <View style={styles.searchBox}>
        <Search size={18} color={colors.text.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('home.searchPlaceholder')}
          placeholderTextColor={colors.text.muted}
          returnKeyType="search"
          style={[styles.searchInput, { fontFamily: fontMedium, textAlign: isRTL ? 'right' : 'left' }]}
          accessibilityLabel={t('common.search')}
        />
        {!!query && (
          <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('common.close')}>
            <X size={18} color={colors.text.muted} />
          </Pressable>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(p) => p.id}
        ListHeaderComponent={header}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={loading && pros.length > 0}
            onRefresh={refresh}
            tintColor={colors.accent.DEFAULT}
            colors={[colors.accent.DEFAULT]}
          />
        }
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          loading ? (
            <View style={{ gap: 10 }}>
              {[0, 1, 2, 3].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </View>
          ) : (
            <View style={styles.empty}>
              <SearchX size={32} color={colors.secondary.tealDark} />
              <Text style={[styles.emptyTitle, { fontFamily: fontSemi }]}>{t('home.noResults')}</Text>
              <Text style={[styles.emptyHint, { fontFamily: fontMedium }]}>{t('home.noResultsHint')}</Text>
            </View>
          )
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(Math.min(index, 6) * 40).duration(280)}>
            <ProCard pro={item} onPress={(p) => router.push({ pathname: '/pro/[id]', params: { id: p.id } })} />
          </Animated.View>
        )}
      />

      <CityPickerSheet visible={cityOpen} onClose={() => setCityOpen(false)} />
    </View>
  );
}

function CategoryChip({
  label,
  active,
  onPress,
  icon,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  icon: ReactNode;
}) {
  const { lang } = useAppLanguage();
  return (
    <Pressable
      onPress={() => {
        triggerHaptic('light');
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [styles.categoryCard, active && styles.categoryCardActive, pressed && { transform: [{ scale: 0.98 }] }]}
    >
      <View style={[styles.categoryIconWrap, active && { backgroundColor: colors.accent.DEFAULT }]}>{icon}</View>
      <Text
        numberOfLines={2}
        style={[
          styles.categoryLabel,
          { fontFamily: getFontFamily(lang, 'semibold'), lineHeight: lineHeightFor(12, lang) },
          active && { color: colors.primary.DEFAULT },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background.main,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  location: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
  },
  locationText: {
    flexShrink: 1,
    fontSize: 15,
    color: colors.text.primary,
  },
  greeting: {
    paddingHorizontal: 20,
    marginTop: 4,
    fontSize: 22,
    color: colors.text.primary,
    textAlign: 'auto',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 6,
    height: 52,
    paddingHorizontal: 14,
    borderRadius: radii.btn,
    backgroundColor: colors.background.surface,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    ...shadows.card,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: colors.text.primary,
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  banner: {
    marginBottom: 10,
  },
  sectionTitle: {
    marginTop: 14,
    marginBottom: 10,
    fontSize: 17,
    color: colors.text.primary,
    textAlign: 'auto',
  },
  categories: {
    gap: 10,
    paddingBottom: 4,
  },
  categoryCard: {
    width: 88,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 18,
    backgroundColor: colors.background.surface,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  categoryCardActive: {
    borderColor: colors.accent.DEFAULT,
    borderWidth: 1.5,
  },
  categoryIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary.tealLight,
    overflow: 'hidden',
  },
  categoryLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  empty: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 36,
  },
  emptyTitle: {
    fontSize: 15,
    color: colors.text.primary,
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: 13,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});
