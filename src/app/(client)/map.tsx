/**
 * AlloPro — Interactive Morocco map.
 * Live pro pins, category filter, recenter, and a bottom-sheet preview with
 * distance, wait time, Google Maps / Waze directions and "Réserver".
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type MapView from 'react-native-maps';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import * as Location from 'expo-location';
import { CalendarCheck, Clock, LocateFixed, Navigation, Route } from 'lucide-react-native';

import MoroccoMapView from '../../components/client/MoroccoMapView';
import ProCard from '../../components/client/ProCard';
import PrimaryButton, { triggerHaptic } from '../../components/ui/PrimaryButton';
import RadarSearchingAnimation from '../../components/animations/RadarSearchingAnimation';
import { cityRegion, formatDistance } from '../../constants/moroccoCities';
import { colors, getFontFamily, numericTextStyle, radii, shadows } from '../../constants/theme';
import { useAppLanguage } from '../../i18n';
import { usePros } from '../../lib/clientData';
import { openDirections } from '../../lib/maps';
import { estimateWaitMinutes, useCategories } from '../../lib/supabase';
import { ltr } from '../../lib/whatsapp';
import { selectCity, useAppStore } from '../../store/useAppStore';

export default function MapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, lang } = useAppLanguage();

  const city = useAppStore(selectCity);
  const userLocation = useAppStore((s) => s.userLocation);
  const setUserLocation = useAppStore((s) => s.setUserLocation);

  const { pros, loading } = usePros(city.name_fr, userLocation);
  const { categories } = useCategories();

  const mapRef = useRef<MapView>(null);
  const sheetRef = useRef<BottomSheet>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);

  const visible = useMemo(() => (category ? pros.filter((p) => p.category?.slug === category) : pros), [pros, category]);
  const selected = useMemo(() => pros.find((p) => p.id === selectedId) ?? null, [pros, selectedId]);

  // Recenter on the city when it changes.
  useEffect(() => {
    mapRef.current?.animateToRegion(cityRegion(city), 500);
  }, [city]);

  useEffect(() => {
    if (selected) {
      sheetRef.current?.snapToIndex(0);
      mapRef.current?.animateCamera({ center: { latitude: selected.latitude, longitude: selected.longitude } }, { duration: 400 });
    } else {
      sheetRef.current?.close();
    }
  }, [selected]);

  const recenter = useCallback(async () => {
    triggerHaptic('light');
    try {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) {
        mapRef.current?.animateToRegion(cityRegion(city), 500);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const next = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      setUserLocation(next);
      mapRef.current?.animateToRegion({ ...next, latitudeDelta: 0.04, longitudeDelta: 0.04 }, 500);
    } catch {
      mapRef.current?.animateToRegion(cityRegion(city), 500);
    }
  }, [city, setUserLocation]);

  const fontSemi = getFontFamily(lang, 'semibold');
  const engine = selected?.category?.booking_type;
  const waiting = selected ? Math.max(0, selected.last_issued_ticket - selected.current_queue_number) : 0;

  return (
    <View style={styles.screen}>
      <MoroccoMapView
        ref={mapRef}
        pros={visible}
        selectedId={selectedId}
        onSelect={setSelectedId}
        initialRegion={cityRegion(city)}
        bottomPadding={selected ? 260 : 0}
      />

      {/* Category filter */}
      <View style={[styles.topOverlay, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          <FilterChip label={t('categories.all')} active={!category} onPress={() => setCategory(null)} />
          {categories.map((c) => (
            <FilterChip
              key={c.id}
              label={lang === 'ar' ? c.name_ar : c.name_fr}
              active={category === c.slug}
              onPress={() => setCategory(category === c.slug ? null : c.slug)}
            />
          ))}
        </ScrollView>
      </View>

      {loading && pros.length === 0 && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <RadarSearchingAnimation size={200} showOrbit={false} title={t('map.locating')} subtitle="" />
        </View>
      )}

      {!loading && visible.length === 0 && (
        <View style={[styles.noPros, shadows.card]} pointerEvents="none">
          <Text style={[styles.noProsText, { fontFamily: fontSemi }]}>{t('map.noPros')}</Text>
        </View>
      )}

      <Pressable
        onPress={recenter}
        style={[styles.recenter, { bottom: selected ? 300 : 24 }]}
        accessibilityRole="button"
        accessibilityLabel={t('map.recenter')}
      >
        <LocateFixed size={22} color={colors.primary.DEFAULT} />
      </Pressable>

      <BottomSheet
        ref={sheetRef}
        index={-1}
        enablePanDownToClose
        enableDynamicSizing
        onClose={() => setSelectedId(null)}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetHandle}
      >
        <BottomSheetView style={[styles.sheetContent, { paddingBottom: 16 }]}>
          {selected && (
            <>
              <ProCard pro={selected} onPress={(p) => router.push({ pathname: '/pro/[id]', params: { id: p.id } })} />

              <View style={styles.facts}>
                {selected.distance_km != null && (
                  <Fact Icon={Route} text={t('map.distance', { distance: ltr(formatDistance(selected.distance_km)) })} />
                )}
                {engine === 'queue' && selected.is_open && (
                  <Fact
                    Icon={Clock}
                    text={t('map.wait', { minutes: ltr(estimateWaitMinutes(waiting)) })}
                  />
                )}
              </View>

              <Text style={[styles.openWith, { fontFamily: fontSemi }]}>{`${t('common.directions')} • ${t('map.openWith')}`}</Text>
              <View style={styles.navRow}>
                <NavButton label={t('map.googleMaps')} onPress={() => openDirections(selected.latitude, selected.longitude, 'google')} />
                <NavButton label={t('map.waze')} onPress={() => openDirections(selected.latitude, selected.longitude, 'waze')} />
              </View>

              <PrimaryButton
                title={t('map.book')}
                icon={CalendarCheck}
                onPress={() => router.push({ pathname: '/pro/[id]', params: { id: selected.id } })}
                style={{ marginTop: 12 }}
              />
            </>
          )}
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { lang } = useAppLanguage();
  return (
    <Pressable
      onPress={() => {
        triggerHaptic('light');
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[styles.filterChip, active && styles.filterChipActive]}
    >
      <Text
        style={[styles.filterText, { fontFamily: getFontFamily(lang, 'semibold') }, active && { color: colors.text.inverse }]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Fact({ Icon, text }: { Icon: typeof Clock; text: string }) {
  const { lang } = useAppLanguage();
  return (
    <View style={styles.fact}>
      <Icon size={15} color={colors.secondary.tealDark} />
      <Text style={[styles.factText, { fontFamily: getFontFamily(lang, 'semibold') }]}>{text}</Text>
    </View>
  );
}

function NavButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        triggerHaptic('light');
        onPress();
      }}
      accessibilityRole="button"
      style={({ pressed }) => [styles.navButton, pressed && { transform: [{ scale: 0.98 }] }]}
    >
      <Navigation size={16} color={colors.primary.DEFAULT} />
      <Text style={styles.navText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background.main,
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    start: 0,
    end: 0,
  },
  filters: {
    gap: 8,
    paddingHorizontal: 16,
  },
  filterChip: {
    height: 38,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: radii.pill,
    backgroundColor: colors.background.surface,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    ...shadows.card,
  },
  filterChipActive: {
    backgroundColor: colors.primary.DEFAULT,
    borderColor: colors.primary.DEFAULT,
  },
  filterText: {
    fontSize: 13,
    color: colors.text.primary,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(244, 247, 247, 0.6)',
  },
  noPros: {
    position: 'absolute',
    alignSelf: 'center',
    top: '45%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.background.surface,
  },
  noProsText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  recenter: {
    position: 'absolute',
    end: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background.surface,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.raised,
  },
  sheetBackground: {
    backgroundColor: colors.background.surface,
    borderRadius: radii.sheet,
  },
  sheetHandle: {
    backgroundColor: colors.border.strong,
    width: 40,
  },
  sheetContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  facts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  fact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.background.main,
  },
  factText: {
    fontSize: 13,
    color: colors.text.primary,
  },
  openWith: {
    marginTop: 14,
    marginBottom: 8,
    fontSize: 13,
    color: colors.text.secondary,
    textAlign: 'auto',
  },
  navRow: {
    flexDirection: 'row',
    gap: 10,
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border.strong,
    backgroundColor: colors.background.surface,
  },
  navText: {
    ...numericTextStyle('body', 'bold', colors.primary.DEFAULT),
  },
});
