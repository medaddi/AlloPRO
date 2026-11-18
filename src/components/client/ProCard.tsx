/**
 * ALLO LM3LM — Scannable Pro card (max 3 data points).
 *   Line 1: Business name + verified badge + ★ rating
 *   Line 2: Category + neighborhood • distance
 *   Line 3: Live status pill ("Ouvert • 2 en attente" / "À partir de 30 DH" / "Fermé")
 */
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { BadgeCheck, ChevronRight, Star } from 'lucide-react-native';

import { useAppLanguage } from '../../i18n';
import { formatDistance } from '../../constants/moroccoCities';
import { cardSurface, colors, getFontFamily, lineHeightFor, motion, numericTextStyle } from '../../constants/theme';
import type { BookingEngine, CategoryRow, ProProfileRow } from '../../lib/supabase';
import { formatMAD, ltr } from '../../lib/whatsapp';
import CategoryIcon from '../ui/CategoryIcon';
import { triggerHaptic } from '../ui/PrimaryButton';
import StatusBadge from '../ui/StatusBadge';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type ProListItem = ProProfileRow & {
  category?: Pick<CategoryRow, 'slug' | 'name_fr' | 'name_ar' | 'icon' | 'booking_type'> | null;
  /** Cheapest active service, used by appointment / on-demand pros. */
  min_price_mad?: number | null;
  /** Pre-computed distance from the user, in km. */
  distance_km?: number | null;
};

type Props = {
  pro: ProListItem;
  onPress?: (pro: ProListItem) => void;
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
};

function ProCard({ pro, onPress, selected = false, style }: Props) {
  const { t, lang, mirror } = useAppLanguage();
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const engine: BookingEngine = pro.category?.booking_type ?? 'appointment';
  const categoryName = pro.category ? (lang === 'ar' ? pro.category.name_ar : pro.category.name_fr) : null;
  const waiting = Math.max(0, pro.last_issued_ticket - pro.current_queue_number);
  const rating = Number(pro.rating_avg ?? 0).toFixed(1);

  // Line 2: "Coiffure & Beauté • Maârif • 1.2 km"
  const line2 = [
    categoryName,
    pro.neighborhood,
    pro.distance_km != null ? ltr(formatDistance(pro.distance_km)) : null,
  ]
    .filter(Boolean)
    .join(' • ');

  // Line 3: live status
  let statusLabel: string;
  let tone: 'online' | 'busy' | 'offline';
  if (!pro.is_open) {
    statusLabel = t('proCard.closed');
    tone = 'offline';
  } else if (engine === 'queue') {
    statusLabel = `${t('proCard.open')} • ${
      waiting > 0 ? t('proCard.waiting', { count: waiting }) : t('proCard.noWait')
    }`;
    tone = waiting >= 5 ? 'busy' : 'online';
  } else if (pro.min_price_mad != null && pro.min_price_mad > 0) {
    statusLabel = `${t('proCard.open')} • ${t('proCard.fromPrice', { price: ltr(formatMAD(pro.min_price_mad)) })}`;
    tone = 'online';
  } else {
    statusLabel = t('proCard.open');
    tone = 'online';
  }

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={t('proCard.a11yOpen', { name: pro.business_name })}
      onPressIn={() => {
        scale.value = withTiming(motion.pressScale, { duration: motion.pressDuration });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, motion.spring.snappy);
      }}
      onPress={() => {
        triggerHaptic('light');
        onPress?.(pro);
      }}
      style={[styles.card, selected && styles.selected, pressStyle, style]}
    >
      {pro.cover_url ? (
        <Image source={{ uri: pro.cover_url }} style={styles.thumb} contentFit="cover" transition={150} />
      ) : (
        <CategoryIcon icon={pro.category?.icon} slug={pro.category?.slug} size={56} radius={16} />
      )}

      <View style={styles.body}>
        {/* Line 1 */}
        <View style={styles.row}>
          <Text
            numberOfLines={1}
            style={[styles.name, { fontFamily: getFontFamily(lang, 'bold'), lineHeight: lineHeightFor(16, lang) }]}
          >
            {pro.business_name}
          </Text>
          {pro.is_verified && (
            <BadgeCheck
              size={16}
              color={colors.background.surface}
              fill={colors.accent.DEFAULT}
              strokeWidth={2.2}
              accessibilityLabel={t('proCard.verified')}
            />
          )}
          <View style={styles.spacer} />
          <View style={styles.rating}>
            <Star size={13} color={colors.accent.DEFAULT} fill={colors.accent.DEFAULT} />
            <Text style={styles.ratingText}>{rating}</Text>
          </View>
        </View>

        {/* Line 2 */}
        {!!line2 && (
          <Text
            numberOfLines={1}
            style={[styles.meta, { fontFamily: getFontFamily(lang, 'medium'), lineHeight: lineHeightFor(13, lang) }]}
          >
            {line2}
          </Text>
        )}

        {/* Line 3 */}
        <StatusBadge label={statusLabel} tone={tone} pulse={pro.is_open && engine === 'queue'} style={styles.badge} />
      </View>

      <View style={{ transform: mirror }}>
        <ChevronRight size={18} color={colors.text.muted} />
      </View>
    </AnimatedPressable>
  );
}

export default memo(ProCard);

const styles = StyleSheet.create({
  card: {
    ...cardSurface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
  },
  selected: {
    borderColor: colors.secondary.teal,
    borderWidth: 1.5,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.background.main,
  },
  body: {
    flex: 1,
    gap: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  name: {
    flexShrink: 1,
    fontSize: 16,
    color: colors.text.primary,
  },
  spacer: {
    flex: 1,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    direction: 'ltr',
  },
  ratingText: {
    ...numericTextStyle('small', 'bold', colors.text.primary),
  },
  meta: {
    fontSize: 13,
    color: colors.text.secondary,
    textAlign: 'auto',
  },
  badge: {
    marginTop: 3,
  },
});
