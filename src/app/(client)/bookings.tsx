/**
 * ALLO LM3LM — My bookings & live tracker.
 * Status stepper (En attente → Confirmé → En route / En cours → Terminé),
 * WhatsApp / Call unlocked once confirmed, cancel, and 1-5 star reviews.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { CalendarX2, Check, Lock, MapPin, MessageCircle, Navigation, Phone, Star, X } from 'lucide-react-native';

import ActiveTicketBanner from '../../components/client/ActiveTicketBanner';
import ReviewModal from '../../components/client/ReviewModal';
import CategoryIcon from '../../components/ui/CategoryIcon';
import PrimaryButton, { triggerHaptic } from '../../components/ui/PrimaryButton';
import StatusBadge, { bookingStatusTone } from '../../components/ui/StatusBadge';
import { cardSurface, colors, getFontFamily, lineHeightFor, numericTextStyle, radii } from '../../constants/theme';
import { useAppLanguage } from '../../i18n';
import { cancelBooking, useClientBookings, type ClientBooking } from '../../lib/clientData';
import { openDirections } from '../../lib/maps';
import type { BookingStatus } from '../../lib/supabase';
import {
  buildClientToProMessage,
  callPhone,
  formatDayLabel,
  formatMAD,
  formatTime,
  ltr,
  openWhatsApp,
} from '../../lib/whatsapp';
import { useAppStore } from '../../store/useAppStore';

type Tab = 'active' | 'past';
const STEPS: BookingStatus[] = ['pending', 'confirmed', 'in_progress', 'completed'];
const REVIEW_PROMPT_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;

export default function BookingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, lang } = useAppLanguage();
  const user = useAppStore((s) => s.user);
  const { active, past, loading, refresh } = useClientBookings(user?.id);

  const [tab, setTab] = useState<Tab>('active');
  const [reviewFor, setReviewFor] = useState<ClientBooking | null>(null);
  const prompted = useRef(new Set<string>());

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  // Ask for a review once, right after a booking is completed.
  useEffect(() => {
    if (reviewFor) return;
    const candidate = past.find(
      (b) =>
        b.status === 'completed' &&
        !b.review &&
        b.pro &&
        !prompted.current.has(b.id) &&
        Date.now() - new Date(b.created_at).getTime() < REVIEW_PROMPT_WINDOW_MS,
    );
    if (candidate) {
      prompted.current.add(candidate.id);
      setReviewFor(candidate);
    }
  }, [past, reviewFor]);

  const data = tab === 'active' ? active : past;
  const fontSemi = getFontFamily(lang, 'semibold');

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Text style={[styles.title, { fontFamily: getFontFamily(lang, 'bold'), lineHeight: lineHeightFor(22, lang) }]}>
        {t('bookings.title')}
      </Text>

      <View style={styles.segment} accessibilityRole="tablist">
        {(['active', 'past'] as Tab[]).map((key) => {
          const selected = tab === key;
          const count = key === 'active' ? active.length : past.length;
          return (
            <Pressable
              key={key}
              onPress={() => {
                triggerHaptic('light');
                setTab(key);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              style={[styles.segmentItem, selected && styles.segmentItemActive]}
            >
              <Text style={[styles.segmentText, { fontFamily: fontSemi }, selected && { color: colors.text.inverse }]}>
                {key === 'active' ? t('bookings.active') : t('bookings.past')}
              </Text>
              {count > 0 && (
                <View style={[styles.count, selected && { backgroundColor: colors.accent.DEFAULT }]}>
                  <Text style={styles.countText}>{count}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={data}
        keyExtractor={(b) => b.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        refreshControl={
          <RefreshControl refreshing={loading && data.length > 0} onRefresh={refresh} tintColor={colors.accent.DEFAULT} colors={[colors.accent.DEFAULT]} />
        }
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <CalendarX2 size={28} color={colors.accent.DEFAULT} />
              </View>
              <Text style={[styles.emptyTitle, { fontFamily: fontSemi }]}>
                {tab === 'active' ? t('bookings.empty') : t('bookings.noPast')}
              </Text>
              {tab === 'active' && (
                <>
                  <Text style={[styles.emptyHint, { fontFamily: getFontFamily(lang, 'medium'), lineHeight: lineHeightFor(14, lang) }]}>
                    {t('bookings.emptyHint')}
                  </Text>
                  <PrimaryButton title={t('common.search')} fullWidth={false} onPress={() => router.navigate('/(client)')} />
                </>
              )}
            </View>
          )
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(Math.min(index, 6) * 40).duration(280)}>
            <BookingCard booking={item} onReview={() => setReviewFor(item)} onOpenPro={() => item.pro && router.push({ pathname: '/pro/[id]', params: { id: item.pro.id } })} />
          </Animated.View>
        )}
      />

      {reviewFor && user && reviewFor.pro && (
        <ReviewModal
          visible
          bookingId={reviewFor.id}
          clientId={user.id}
          proId={reviewFor.pro.id}
          proName={reviewFor.pro.business_name}
          onClose={() => setReviewFor(null)}
          onSubmitted={() => {
            setReviewFor(null);
            refresh();
          }}
        />
      )}
    </View>
  );
}

/* -------------------------------------------------------------------------- */

function BookingCard({
  booking,
  onReview,
  onOpenPro,
}: {
  booking: ClientBooking;
  onReview: () => void;
  onOpenPro: () => void;
}) {
  const { t, lang } = useAppLanguage();
  const user = useAppStore((s) => s.user);
  const fontSemi = getFontFamily(lang, 'semibold');
  const fontMedium = getFontFamily(lang, 'medium');

  const isActive = ['pending', 'confirmed', 'in_progress'].includes(booking.status);
  const isSOS = booking.booking_type === 'ondemand';
  const proName = booking.pro?.business_name ?? '';
  const serviceTitle = booking.service ? (lang === 'ar' ? booking.service.title_ar : booking.service.title_fr) : null;
  const statusLabel = (s: BookingStatus) => (isSOS && s === 'in_progress' ? t('status.onTheWay') : t(`status.${s}`));
  const phone = booking.pro?.owner?.phone ?? null;
  const contactUnlocked = booking.status === 'confirmed' || booking.status === 'in_progress';
  const canCancel = booking.status === 'pending' || booking.status === 'confirmed';
  const scheduled = booking.scheduled_at ? new Date(booking.scheduled_at) : null;

  const contactWhatsApp = async () => {
    if (!phone) return;
    const ok = await openWhatsApp(
      phone,
      buildClientToProMessage({
        lang,
        businessName: proName,
        clientName: user?.full_name ?? '',
        engine: booking.booking_type,
        serviceName: serviceTitle,
        ticketNumber: booking.queue_number,
        scheduledAt: scheduled,
        address: booking.client_address,
        issueNotes: booking.issue_notes,
      }),
    );
    if (!ok) Alert.alert(t('common.error'), t('errors.whatsappUnavailable'));
  };

  const confirmCancel = () => {
    Alert.alert(t('bookings.cancel'), t('bookings.cancelConfirm'), [
      { text: t('common.no'), style: 'cancel' },
      {
        text: t('common.yes'),
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelBooking(booking.id);
            triggerHaptic('warning');
          } catch {
            Alert.alert(t('common.error'), t('errors.generic'));
          }
        },
      },
    ]);
  };

  // Queue tickets start "confirmed"; SOS/appointments start "pending".
  const steps = booking.booking_type === 'queue' ? STEPS.slice(1) : STEPS;
  const currentStep = steps.indexOf(booking.status);

  return (
    <View style={styles.card}>
      {isActive && booking.booking_type === 'queue' && (
        <ActiveTicketBanner booking={booking} proName={proName} style={{ marginBottom: 12 }} onPress={onOpenPro} />
      )}

      <Pressable onPress={onOpenPro} style={styles.cardTop} accessibilityRole="button">
        <CategoryIcon icon={booking.pro?.category?.icon} slug={booking.pro?.category?.slug} size={44} radius={14} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text numberOfLines={1} style={[styles.proName, { fontFamily: getFontFamily(lang, 'bold'), lineHeight: lineHeightFor(15, lang) }]}>
            {proName}
          </Text>
          <Text numberOfLines={1} style={[styles.meta, { fontFamily: fontMedium }]}>
            {[serviceTitle, booking.total_price_mad > 0 ? ltr(formatMAD(booking.total_price_mad)) : null].filter(Boolean).join(' • ') ||
              t(`engine.${booking.booking_type}`)}
          </Text>
        </View>
        <StatusBadge label={statusLabel(booking.status)} tone={bookingStatusTone[booking.status]} />
      </Pressable>

      <View style={styles.details}>
        {booking.booking_type === 'queue' && booking.queue_number != null && (
          <Text style={[styles.detail, { fontFamily: fontSemi }]}>{t('bookings.ticketNumber', { ticket: ltr(`#${booking.queue_number}`) })}</Text>
        )}
        {scheduled && (
          <Text style={[styles.detail, { fontFamily: fontSemi }]}>
            {`${formatDayLabel(scheduled, lang)} • ${ltr(formatTime(scheduled))}`}
          </Text>
        )}
        {isSOS && !!booking.client_address && (
          <View style={styles.inline}>
            <MapPin size={14} color={colors.text.secondary} />
            <Text numberOfLines={2} style={[styles.meta, { fontFamily: fontMedium, flex: 1 }]}>
              {booking.client_address}
            </Text>
          </View>
        )}
        {!isActive && (
          <Text style={[styles.metaMuted, { fontFamily: fontMedium }]}>{formatDayLabel(new Date(booking.created_at), lang)}</Text>
        )}
      </View>

      {isActive && booking.status !== 'cancelled' && (
        <View style={styles.stepper}>
          {steps.map((s, i) => {
            const done = i <= currentStep;
            return (
              <View key={s} style={styles.step}>
                <View style={styles.stepLineRow}>
                  <View style={[styles.stepLine, i === 0 && styles.invisible, i <= currentStep && styles.stepLineDone]} />
                  <View style={[styles.stepDot, done && styles.stepDotDone, i === currentStep && styles.stepDotCurrent]}>
                    {done && <Check size={10} color={colors.text.inverse} strokeWidth={3.5} />}
                  </View>
                  <View
                    style={[styles.stepLine, i === steps.length - 1 && styles.invisible, i < currentStep && styles.stepLineDone]}
                  />
                </View>
                <Text
                  numberOfLines={1}
                  style={[styles.stepLabel, { fontFamily: i === currentStep ? fontSemi : fontMedium }, done && { color: colors.text.primary }]}
                >
                  {statusLabel(s)}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {isActive && (
        <View style={styles.actions}>
          {contactUnlocked && phone ? (
            <>
              <Action Icon={MessageCircle} label={t('common.whatsapp')} tone="whatsapp" onPress={contactWhatsApp} />
              <Action Icon={Phone} label={t('common.call')} onPress={() => callPhone(phone)} />
            </>
          ) : (
            <View style={styles.locked}>
              <Lock size={13} color={colors.text.muted} />
              <Text style={[styles.lockedText, { fontFamily: fontMedium, lineHeight: lineHeightFor(12, lang) }]}>
                {t('bookings.callUnlock')}
              </Text>
            </View>
          )}
          {!isSOS && booking.pro && (
            <Action
              Icon={Navigation}
              label={t('common.directions')}
              onPress={() => booking.pro && openDirections(booking.pro.latitude, booking.pro.longitude)}
            />
          )}
          {canCancel && <Action Icon={X} label={t('common.cancel')} tone="danger" onPress={confirmCancel} />}
        </View>
      )}

      {booking.status === 'completed' && (
        <View style={styles.reviewRow}>
          {booking.review ? (
            <View style={styles.inline}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  size={16}
                  color={n <= (booking.review?.rating ?? 0) ? colors.accent.DEFAULT : colors.border.strong}
                  fill={n <= (booking.review?.rating ?? 0) ? colors.accent.DEFAULT : 'transparent'}
                />
              ))}
              <Text style={[styles.metaMuted, { fontFamily: fontMedium }]}>{t('bookings.rated')}</Text>
            </View>
          ) : (
            <Action Icon={Star} label={t('bookings.rate')} tone="primary" onPress={onReview} />
          )}
        </View>
      )}
    </View>
  );
}

function Action({
  Icon,
  label,
  onPress,
  tone = 'neutral',
}: {
  Icon: typeof Star;
  label: string;
  onPress: () => void;
  tone?: 'neutral' | 'primary' | 'danger' | 'whatsapp';
}) {
  const { lang } = useAppLanguage();
  const palette = {
    neutral: { bg: colors.background.main, fg: colors.primary.DEFAULT },
    primary: { bg: colors.accent.DEFAULT, fg: colors.text.inverse },
    danger: { bg: colors.status.offlineSoft, fg: colors.status.offline },
    whatsapp: { bg: '#E8F8EE', fg: '#128C4B' },
  }[tone];
  return (
    <Pressable
      onPress={() => {
        triggerHaptic('light');
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.action, { backgroundColor: palette.bg }, pressed && { transform: [{ scale: 0.98 }] }]}
    >
      <Icon size={16} color={palette.fg} strokeWidth={2.4} />
      <Text style={[styles.actionText, { color: palette.fg, fontFamily: getFontFamily(lang, 'bold') }]}>{label}</Text>
    </Pressable>
  );
}

/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background.main,
  },
  title: {
    paddingHorizontal: 20,
    paddingTop: 16,
    fontSize: 22,
    color: colors.text.primary,
    textAlign: 'auto',
  },
  segment: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 14,
    marginBottom: 6,
    padding: 4,
    borderRadius: radii.btn,
    backgroundColor: colors.background.surface,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  segmentItem: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  segmentItemActive: {
    backgroundColor: colors.primary.DEFAULT,
  },
  segmentText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  count: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: colors.secondary.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    ...numericTextStyle('caption', 'bold', colors.text.inverse),
  },
  list: {
    padding: 20,
    paddingTop: 12,
  },
  empty: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 48,
    paddingHorizontal: 16,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.accent.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    color: colors.text.primary,
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 6,
  },
  card: {
    ...cardSurface,
    padding: 14,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  proName: {
    fontSize: 15,
    color: colors.text.primary,
    textAlign: 'auto',
  },
  meta: {
    fontSize: 13,
    color: colors.text.secondary,
    textAlign: 'auto',
  },
  metaMuted: {
    fontSize: 12,
    color: colors.text.muted,
    textAlign: 'auto',
  },
  details: {
    marginTop: 10,
    gap: 4,
  },
  detail: {
    fontSize: 14,
    color: colors.primary.DEFAULT,
    textAlign: 'auto',
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stepper: {
    flexDirection: 'row',
    marginTop: 14,
  },
  step: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  stepLineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  stepLine: {
    flex: 1,
    height: 3,
    backgroundColor: colors.border.DEFAULT,
  },
  stepLineDone: {
    backgroundColor: colors.accent.DEFAULT,
  },
  invisible: {
    opacity: 0,
  },
  stepDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.border.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotDone: {
    backgroundColor: colors.accent.DEFAULT,
  },
  stepDotCurrent: {
    transform: [{ scale: 1.2 }],
    borderWidth: 2,
    borderColor: colors.accent.soft,
  },
  stepLabel: {
    fontSize: 11,
    color: colors.text.muted,
    textAlign: 'center',
  },
  actions: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  actionText: {
    fontSize: 13,
  },
  locked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexBasis: '100%',
  },
  lockedText: {
    flex: 1,
    fontSize: 12,
    color: colors.text.muted,
    textAlign: 'auto',
  },
  reviewRow: {
    marginTop: 12,
    flexDirection: 'row',
  },
});
