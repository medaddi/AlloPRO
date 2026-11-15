/**
 * AlloPro — Pro "Live Guichet".
 * Giant OUVERT/FERMÉ switch, queue controller (Suivant + walk-in) for queue
 * trades, and today's appointment / SOS requests with 1-tap actions.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  LayoutChangeEvent,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeOutUp,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  CalendarClock,
  Check,
  CheckCheck,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Play,
  Power,
  Wrench,
  X,
} from 'lucide-react-native';

import QueueControllerCard, { type UpNextItem } from '../../components/pro/QueueControllerCard';
import PrimaryButton, { triggerHaptic } from '../../components/ui/PrimaryButton';
import SheetModal from '../../components/ui/SheetModal';
import StatusBadge, { bookingStatusTone } from '../../components/ui/StatusBadge';
import TextField from '../../components/ui/TextField';
import {
  cardSurface,
  colors,
  getFontFamily,
  lineHeightFor,
  motion,
  numericTextStyle,
  radii,
} from '../../constants/theme';
import { useAppLanguage } from '../../i18n';
import { openDirections } from '../../lib/maps';
import {
  advanceProQueue,
  supabase,
  takeQueueTicket,
  useCategories,
  useProLiveQueue,
  useProTodayBookings,
  useServices,
  type BookingStatus,
  type BookingWithDetails,
} from '../../lib/supabase';
import {
  buildProConfirmationMessage,
  callPhone,
  formatDayLabel,
  formatMAD,
  formatTime,
  ltr,
  openWhatsApp,
} from '../../lib/whatsapp';
import { useAppStore } from '../../store/useAppStore';

export default function GuichetScreen() {
  const insets = useSafeAreaInsets();
  const { t, lang } = useAppLanguage();
  const proProfile = useAppStore((s) => s.proProfile);
  const patchProProfile = useAppStore((s) => s.patchProProfile);

  const proId = proProfile?.id ?? null;
  const { categories } = useCategories();
  const live = useProLiveQueue(proId);
  const { bookings, refresh, loading } = useProTodayBookings(proId);
  const { services } = useServices(proId, { onlyActive: true });

  const [advancing, setAdvancing] = useState(false);
  const [walkinOpen, setWalkinOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const showToast = useCallback((message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const engine = categories.find((c) => c.id === proProfile?.category_id)?.booking_type ?? 'queue';
  const isOpen = live.isOpen ?? proProfile?.is_open ?? false;
  const current = live.currentNumber ?? proProfile?.current_queue_number ?? 0;
  const lastIssued = live.lastIssued ?? proProfile?.last_issued_ticket ?? 0;
  const waiting = Math.max(0, lastIssued - current);

  const queueBookings = useMemo(() => bookings.filter((b) => b.booking_type === 'queue'), [bookings]);
  const servedCount = queueBookings.filter((b) => b.status === 'completed').length;
  const upNext: UpNextItem[] = useMemo(
    () =>
      queueBookings
        .filter((b) => (b.queue_number ?? 0) > current && b.status !== 'cancelled')
        .slice(0, 4)
        .map((b) => ({
          ticket: b.queue_number ?? 0,
          name: b.walkin_name ?? b.client?.full_name ?? t('guichet.appClient'),
        })),
    [queueBookings, current, t],
  );
  const requests = useMemo(
    () =>
      bookings.filter(
        (b) => b.booking_type !== 'queue' && b.status !== 'cancelled' && b.status !== 'completed',
      ),
    [bookings],
  );

  /* -------------------------------- actions ------------------------------- */
  const toggleOpen = async () => {
    if (!proProfile) return;
    const next = !isOpen;
    triggerHaptic(next ? 'success' : 'medium');
    patchProProfile({ is_open: next });
    const { error } = await supabase.from('pro_profiles').update({ is_open: next }).eq('id', proProfile.id);
    if (error) {
      patchProProfile({ is_open: !next });
      Alert.alert(t('common.error'), t('errors.generic'));
      return;
    }
    live.refresh();
  };

  const handleNext = async () => {
    if (!proId || advancing) return;
    setAdvancing(true);
    try {
      await advanceProQueue(proId);
      await Promise.all([live.refresh(), refresh()]);
    } catch {
      Alert.alert(t('common.error'), t('errors.generic'));
    } finally {
      setAdvancing(false);
    }
  };

  const handleWalkinAdded = (ticket: number) => {
    setWalkinOpen(false);
    triggerHaptic('success');
    showToast(t('guichet.walkinAdded', { ticket: ltr(`#${ticket}`) }));
    live.refresh();
    refresh();
  };

  const updateStatus = async (booking: BookingWithDetails, status: BookingStatus) => {
    const { error } = await supabase.from('bookings').update({ status }).eq('id', booking.id);
    if (error) {
      Alert.alert(t('common.error'), t('errors.generic'));
      return;
    }
    triggerHaptic(status === 'cancelled' ? 'warning' : 'success');
    showToast(t('guichet.statusUpdated'));
    refresh();
  };

  const confirmDecline = (booking: BookingWithDetails) => {
    Alert.alert(t('guichet.decline'), t('bookings.cancelConfirm'), [
      { text: t('common.no'), style: 'cancel' },
      { text: t('common.yes'), style: 'destructive', onPress: () => updateStatus(booking, 'cancelled') },
    ]);
  };

  const sendConfirmation = async (booking: BookingWithDetails) => {
    const phone = booking.client?.phone;
    if (!phone || !proProfile) return;
    const clientLang = booking.client?.language === 'ar' ? 'ar' : booking.client?.language === 'fr' ? 'fr' : lang;
    const svc = booking.service ? (clientLang === 'ar' ? booking.service.title_ar : booking.service.title_fr) : null;
    const ok = await openWhatsApp(
      phone,
      buildProConfirmationMessage({
        lang: clientLang,
        businessName: proProfile.business_name,
        clientName: booking.client?.full_name ?? '',
        engine: booking.booking_type,
        serviceName: svc,
        price: booking.total_price_mad,
        scheduledAt: booking.scheduled_at ? new Date(booking.scheduled_at) : null,
        address: booking.client_address,
      }),
    );
    if (!ok) Alert.alert(t('common.error'), t('errors.whatsappUnavailable'));
  };

  if (!proProfile) return null;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={loading && bookings.length > 0}
            onRefresh={() => {
              live.refresh();
              refresh();
            }}
            tintColor={colors.accent.DEFAULT}
            colors={[colors.accent.DEFAULT]}
          />
        }
      >
        <View style={styles.header}>
          <Text
            numberOfLines={1}
            style={[styles.business, { fontFamily: getFontFamily(lang, 'bold'), lineHeight: lineHeightFor(22, lang) }]}
          >
            {proProfile.business_name}
          </Text>
          <Text style={[styles.date, { fontFamily: getFontFamily(lang, 'medium') }]}>
            {formatDayLabel(new Date(), lang)}
          </Text>
        </View>

        <OpenSwitch isOpen={isOpen} onToggle={toggleOpen} />
        <Text style={[styles.hint, { fontFamily: getFontFamily(lang, 'medium') }]}>{t('guichet.toggleHint')}</Text>

        {engine === 'queue' && (
          <Animated.View entering={FadeInDown.delay(80).duration(350)} style={styles.section}>
            <QueueControllerCard
              isOpen={isOpen}
              currentNumber={current}
              lastIssued={lastIssued}
              waitingCount={waiting}
              servedCount={servedCount}
              upNext={upNext}
              advancing={advancing}
              onNext={handleNext}
              onWalkin={() => setWalkinOpen(true)}
            />
          </Animated.View>
        )}

        {(engine !== 'queue' || requests.length > 0) && (
          <View style={styles.section}>
            <Text
              style={[styles.sectionTitle, { fontFamily: getFontFamily(lang, 'bold'), lineHeight: lineHeightFor(17, lang) }]}
            >
              {t('guichet.incoming')}
            </Text>
            {requests.length === 0 ? (
              <View style={styles.empty}>
                <CalendarClock size={28} color={colors.secondary.tealDark} />
                <Text style={[styles.emptyText, { fontFamily: getFontFamily(lang, 'medium') }]}>
                  {t('guichet.noIncoming')}
                </Text>
              </View>
            ) : (
              requests.map((b, i) => (
                <Animated.View key={b.id} entering={FadeInDown.delay(i * 40).duration(300)}>
                  <RequestCard
                    booking={b}
                    onAccept={() => updateStatus(b, 'confirmed')}
                    onDecline={() => confirmDecline(b)}
                    onStart={() => updateStatus(b, 'in_progress')}
                    onFinish={() => updateStatus(b, 'completed')}
                    onWhatsApp={() => sendConfirmation(b)}
                  />
                </Animated.View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {!!toast && (
        <Animated.View
          entering={FadeInUp.duration(200)}
          exiting={FadeOutUp.duration(200)}
          style={[styles.toast, { top: insets.top + 8 }]}
          pointerEvents="none"
        >
          <Check size={16} color={colors.text.inverse} strokeWidth={3} />
          <Text style={[styles.toastText, { fontFamily: getFontFamily(lang, 'semibold') }]}>{toast}</Text>
        </Animated.View>
      )}

      <WalkinSheet
        visible={walkinOpen}
        onClose={() => setWalkinOpen(false)}
        proId={proProfile.id}
        services={services}
        onAdded={handleWalkinAdded}
      />
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 OPEN SWITCH                                */
/* -------------------------------------------------------------------------- */

const KNOB = 52;
const PAD = 6;

function OpenSwitch({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
  const { t, lang, isRTL } = useAppLanguage();
  const [width, setWidth] = useState(0);
  const progress = useSharedValue(isOpen ? 1 : 0);
  const scale = useSharedValue(1);

  useEffect(() => {
    progress.value = withSpring(isOpen ? 1 : 0, motion.spring.snappy);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const travel = Math.max(0, width - KNOB - PAD * 2);
  const dir = isRTL ? -1 : 1;

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [colors.status.offline, colors.status.online]),
    transform: [{ scale: scale.value }],
  }));
  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * travel * dir }],
  }));

  return (
    <Pressable
      onPress={onToggle}
      onPressIn={() => {
        scale.value = withTiming(motion.pressScale, { duration: motion.pressDuration });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, motion.spring.snappy);
      }}
      accessibilityRole="switch"
      accessibilityState={{ checked: isOpen }}
      accessibilityLabel={isOpen ? t('guichet.open') : t('guichet.closed')}
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
    >
      <Animated.View style={[styles.switchTrack, trackStyle]}>
        <Text
          style={[
            styles.switchLabel,
            { fontFamily: getFontFamily(lang, 'bold') },
            isOpen ? { paddingEnd: KNOB + PAD } : { paddingStart: KNOB + PAD },
          ]}
        >
          {isOpen ? t('guichet.open') : t('guichet.closed')}
        </Text>
        <Animated.View style={[styles.switchKnob, knobStyle]}>
          <Power size={24} color={isOpen ? colors.status.online : colors.status.offline} strokeWidth={2.6} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

/* -------------------------------------------------------------------------- */
/*                                REQUEST CARD                                */
/* -------------------------------------------------------------------------- */

function RequestCard({
  booking,
  onAccept,
  onDecline,
  onStart,
  onFinish,
  onWhatsApp,
}: {
  booking: BookingWithDetails;
  onAccept: () => void;
  onDecline: () => void;
  onStart: () => void;
  onFinish: () => void;
  onWhatsApp: () => void;
}) {
  const { t, lang } = useAppLanguage();
  const isSOS = booking.booking_type === 'ondemand';
  const Icon = isSOS ? Wrench : CalendarClock;
  const fontMedium = getFontFamily(lang, 'medium');

  const when = booking.scheduled_at ? formatTime(new Date(booking.scheduled_at)) : 'SOS';
  const clientName = booking.client?.full_name ?? booking.walkin_name ?? t('guichet.appClient');
  const serviceTitle = booking.service ? (lang === 'ar' ? booking.service.title_ar : booking.service.title_fr) : null;
  const statusLabel =
    isSOS && booking.status === 'in_progress' ? t('status.onTheWay') : t(`status.${booking.status}`);
  const phone = booking.client?.phone ?? null;
  const hasGps = booking.client_lat != null && booking.client_lng != null;

  return (
    <View style={styles.request}>
      <View style={styles.requestTop}>
        <View style={[styles.requestIcon, isSOS && { backgroundColor: colors.accent.soft }]}>
          <Icon size={20} color={isSOS ? colors.accent.dark : colors.primary.DEFAULT} />
        </View>
        <View style={styles.requestMain}>
          <View style={styles.requestTitleRow}>
            <Text style={styles.requestTime}>{when}</Text>
            <Text
              numberOfLines={1}
              style={[styles.requestClient, { fontFamily: getFontFamily(lang, 'bold'), lineHeight: lineHeightFor(15, lang) }]}
            >
              {clientName}
            </Text>
          </View>
          {!!serviceTitle && (
            <Text numberOfLines={1} style={[styles.requestMeta, { fontFamily: fontMedium }]}>
              {serviceTitle}
              {booking.total_price_mad > 0 ? ` • ${ltr(formatMAD(booking.total_price_mad))}` : ''}
            </Text>
          )}
          {!!booking.client_address && (
            <View style={styles.inline}>
              <MapPin size={13} color={colors.text.secondary} />
              <Text numberOfLines={2} style={[styles.requestMeta, { fontFamily: fontMedium, flex: 1 }]}>
                {booking.client_address}
              </Text>
            </View>
          )}
          {!!booking.issue_notes && (
            <Text numberOfLines={3} style={[styles.requestNotes, { fontFamily: fontMedium, lineHeight: lineHeightFor(13, lang) }]}>
              {booking.issue_notes}
            </Text>
          )}
        </View>
        <StatusBadge label={statusLabel} tone={bookingStatusTone[booking.status]} />
      </View>

      <View style={styles.requestActions}>
        {booking.status === 'pending' && (
          <>
            <ActionChip Icon={Check} label={t('guichet.accept')} tone="primary" onPress={onAccept} />
            <ActionChip Icon={X} label={t('guichet.decline')} tone="danger" onPress={onDecline} />
          </>
        )}
        {booking.status !== 'pending' && (
          <>
            {!!phone && <ActionChip Icon={MessageCircle} label={t('common.whatsapp')} tone="whatsapp" onPress={onWhatsApp} />}
            {!!phone && <ActionChip Icon={Phone} label={t('common.call')} onPress={() => callPhone(phone)} />}
            {isSOS && hasGps && (
              <ActionChip
                Icon={Navigation}
                label={t('common.directions')}
                onPress={() => openDirections(booking.client_lat as number, booking.client_lng as number)}
              />
            )}
            {isSOS && booking.status === 'confirmed' ? (
              <ActionChip Icon={Play} label={t('guichet.start')} tone="primary" onPress={onStart} />
            ) : (
              <ActionChip Icon={CheckCheck} label={t('guichet.finish')} tone="primary" onPress={onFinish} />
            )}
          </>
        )}
      </View>
    </View>
  );
}

function ActionChip({
  Icon,
  label,
  onPress,
  tone = 'neutral',
}: {
  Icon: typeof Check;
  label: string;
  onPress: () => void;
  tone?: 'neutral' | 'primary' | 'danger' | 'whatsapp';
}) {
  const { lang } = useAppLanguage();
  const palette = {
    neutral: { bg: colors.background.main, fg: colors.primary.DEFAULT, border: colors.border.DEFAULT },
    primary: { bg: colors.accent.DEFAULT, fg: colors.text.inverse, border: colors.accent.DEFAULT },
    danger: { bg: colors.status.offlineSoft, fg: colors.status.offline, border: colors.status.offlineSoft },
    whatsapp: { bg: '#E8F8EE', fg: '#128C4B', border: '#E8F8EE' },
  }[tone];

  return (
    <Pressable
      onPress={() => {
        triggerHaptic('light');
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.actionChip,
        { backgroundColor: palette.bg, borderColor: palette.border },
        pressed && { transform: [{ scale: motion.pressScale }] },
      ]}
    >
      <Icon size={16} color={palette.fg} strokeWidth={2.4} />
      <Text style={[styles.actionLabel, { color: palette.fg, fontFamily: getFontFamily(lang, 'bold') }]}>{label}</Text>
    </Pressable>
  );
}

/* -------------------------------------------------------------------------- */
/*                                WALK-IN SHEET                               */
/* -------------------------------------------------------------------------- */

function WalkinSheet({
  visible,
  onClose,
  proId,
  services,
  onAdded,
}: {
  visible: boolean;
  onClose: () => void;
  proId: string;
  services: { id: string; title_fr: string; title_ar: string; price_mad: number }[];
  onAdded: (ticket: number) => void;
}) {
  const { t, lang } = useAppLanguage();
  const [name, setName] = useState('');
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setName('');
      setServiceId(null);
      setError(null);
    }
  }, [visible]);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const booking = await takeQueueTicket({
        proId,
        clientId: null,
        serviceId,
        walkinName: name.trim() || t('guichet.walkinDefault'),
      });
      onAdded(booking.queue_number ?? 0);
    } catch {
      setError(t('errors.generic'));
      triggerHaptic('warning');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SheetModal
      visible={visible}
      onClose={onClose}
      title={t('guichet.walkinTitle')}
      footer={<PrimaryButton title={t('guichet.walkinAdd')} loading={saving} onPress={submit} haptic="medium" />}
    >
      <TextField
        value={name}
        onChangeText={setName}
        placeholder={t('guichet.walkinNamePlaceholder')}
        maxLength={40}
        autoCapitalize="words"
        returnKeyType="done"
        error={error}
      />
      {services.length > 0 && (
        <View style={styles.serviceWrap}>
          {[{ id: null as string | null, label: t('guichet.anyService'), price: 0 }]
            .concat(services.map((s) => ({ id: s.id, label: lang === 'ar' ? s.title_ar : s.title_fr, price: s.price_mad })))
            .map((opt) => {
              const active = opt.id === serviceId;
              return (
                <Pressable
                  key={opt.id ?? 'none'}
                  onPress={() => setServiceId(opt.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  style={[styles.serviceChip, active && styles.serviceChipActive]}
                >
                  <Text
                    style={[
                      styles.serviceChipText,
                      { fontFamily: getFontFamily(lang, 'semibold') },
                      active && { color: colors.text.inverse },
                    ]}
                  >
                    {opt.label}
                    {opt.price > 0 ? ` • ${ltr(formatMAD(opt.price))}` : ''}
                  </Text>
                </Pressable>
              );
            })}
        </View>
      )}
    </SheetModal>
  );
}

/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background.main,
  },
  scroll: {
    padding: 20,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 16,
  },
  business: {
    fontSize: 22,
    color: colors.text.primary,
    textAlign: 'auto',
  },
  date: {
    marginTop: 2,
    fontSize: 13,
    color: colors.text.secondary,
    textAlign: 'auto',
    textTransform: 'capitalize',
  },
  hint: {
    marginTop: 8,
    fontSize: 12,
    color: colors.text.muted,
    textAlign: 'center',
  },
  switchTrack: {
    height: KNOB + PAD * 2,
    borderRadius: radii.pill,
    padding: PAD,
    justifyContent: 'center',
  },
  switchLabel: {
    position: 'absolute',
    start: 0,
    end: 0,
    textAlign: 'center',
    fontSize: 22,
    letterSpacing: 2,
    color: colors.text.inverse,
  },
  switchKnob: {
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    backgroundColor: colors.background.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginTop: 22,
  },
  sectionTitle: {
    fontSize: 17,
    color: colors.text.primary,
    marginBottom: 10,
    textAlign: 'auto',
  },
  empty: {
    ...cardSurface,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 28,
  },
  emptyText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  request: {
    ...cardSurface,
    padding: 14,
    marginBottom: 10,
  },
  requestTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  requestIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.secondary.tealLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestMain: {
    flex: 1,
    gap: 3,
  },
  requestTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requestTime: {
    ...numericTextStyle('body', 'bold', colors.accent.dark),
  },
  requestClient: {
    flexShrink: 1,
    fontSize: 15,
    color: colors.text.primary,
  },
  requestMeta: {
    fontSize: 13,
    color: colors.text.secondary,
    textAlign: 'auto',
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  requestNotes: {
    marginTop: 4,
    fontSize: 13,
    color: colors.text.primary,
    backgroundColor: colors.background.main,
    borderRadius: 10,
    padding: 8,
    textAlign: 'auto',
  },
  requestActions: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionLabel: {
    fontSize: 13,
  },
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.primary.DEFAULT,
  },
  toastText: {
    fontSize: 14,
    color: colors.text.inverse,
  },
  serviceWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  serviceChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.background.surface,
  },
  serviceChipActive: {
    backgroundColor: colors.primary.DEFAULT,
    borderColor: colors.primary.DEFAULT,
  },
  serviceChipText: {
    fontSize: 13,
    color: colors.text.primary,
  },
});
