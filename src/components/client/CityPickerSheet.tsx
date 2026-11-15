/**
 * AlloPro — City → neighborhood picker ("Casablanca - Maârif ▾").
 */
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Check, ChevronLeft, ChevronRight, MapPin } from 'lucide-react-native';

import {
  getCity,
  getCityName,
  getNeighborhoodName,
  getSortedCities,
  type MoroccoCity,
} from '../../constants/moroccoCities';
import { colors, getFontFamily, radii } from '../../constants/theme';
import { useAppLanguage } from '../../i18n';
import { useAppStore } from '../../store/useAppStore';
import { triggerHaptic } from '../ui/PrimaryButton';
import SheetModal from '../ui/SheetModal';

export default function CityPickerSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t, lang, mirror } = useAppLanguage();
  const selectedCity = useAppStore((s) => s.selectedCity);
  const selectedNeighborhood = useAppStore((s) => s.selectedNeighborhood);
  const setCity = useAppStore((s) => s.setCity);
  const setNeighborhood = useAppStore((s) => s.setNeighborhood);

  const [city, setCityStep] = useState<MoroccoCity | null>(null);

  useEffect(() => {
    if (visible) setCityStep(null);
  }, [visible]);

  const fontSemi = getFontFamily(lang, 'semibold');

  const pickNeighborhood = (c: MoroccoCity, slug: string) => {
    triggerHaptic('light');
    setCity(c.slug);
    setNeighborhood(slug);
    onClose();
  };

  return (
    <SheetModal
      visible={visible}
      onClose={onClose}
      title={city ? getCityName(city, lang) : t('home.selectCity')}
      subtitle={city ? t('home.selectNeighborhood') : undefined}
    >
      {city ? (
        <>
          <Pressable onPress={() => setCityStep(null)} style={styles.back} accessibilityRole="button" hitSlop={6}>
            <View style={{ transform: mirror }}>
              <ChevronLeft size={18} color={colors.accent.dark} />
            </View>
            <Text style={[styles.backText, { fontFamily: fontSemi }]}>{t('home.selectCity')}</Text>
          </Pressable>
          {city.neighborhoods.map((n) => {
            const active = city.slug === selectedCity && n.slug === selectedNeighborhood;
            return (
              <Row key={n.slug} label={getNeighborhoodName(n, lang)} active={active} onPress={() => pickNeighborhood(city, n.slug)} />
            );
          })}
        </>
      ) : (
        getSortedCities(lang).map((c) => (
          <Row
            key={c.slug}
            label={getCityName(c, lang)}
            sub={lang === 'ar' ? c.region_ar : c.region_fr}
            active={c.slug === selectedCity}
            chevron
            onPress={() => {
              if (c.neighborhoods.length <= 1) {
                pickNeighborhood(c, c.neighborhoods[0]?.slug ?? '');
                return;
              }
              setCityStep(getCity(c.slug));
            }}
          />
        ))
      )}
    </SheetModal>
  );
}

function Row({
  label,
  sub,
  active,
  chevron = false,
  onPress,
}: {
  label: string;
  sub?: string;
  active: boolean;
  chevron?: boolean;
  onPress: () => void;
}) {
  const { lang, mirror } = useAppLanguage();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [styles.row, active && styles.rowActive, pressed && { opacity: 0.85 }]}
    >
      <MapPin size={18} color={active ? colors.accent.DEFAULT : colors.text.muted} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, { fontFamily: getFontFamily(lang, 'semibold') }]}>{label}</Text>
        {!!sub && <Text style={[styles.rowSub, { fontFamily: getFontFamily(lang, 'medium') }]}>{sub}</Text>}
      </View>
      {active && !chevron && <Check size={18} color={colors.accent.DEFAULT} strokeWidth={3} />}
      {chevron && (
        <View style={{ transform: mirror }}>
          <ChevronRight size={18} color={colors.text.muted} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 14,
    color: colors.accent.dark,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 14,
    borderRadius: radii.btn,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.background.surface,
  },
  rowActive: {
    borderColor: colors.secondary.teal,
    backgroundColor: colors.background.main,
  },
  rowLabel: {
    fontSize: 15,
    color: colors.text.primary,
    textAlign: 'auto',
  },
  rowSub: {
    fontSize: 12,
    color: colors.text.secondary,
    textAlign: 'auto',
  },
});
