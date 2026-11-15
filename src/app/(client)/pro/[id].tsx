/**
 * AlloPro — Pro profile & 3-engine booking.
 *   queue       → "Prendre mon tour (#15)" with live queue count
 *   appointment → date strip + time slots → "Confirmer le RDV"
 *   ondemand    → GPS + address + issue + photo → "Demander l'intervention" + radar
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import {
  BadgeCheck,
  Camera,
  Check,
  ChevronLeft,
  Clock,
  ImagePlus,
  LocateFixed,
  MapPin,
  Navigation,
  Siren,
  Star,
  Ticket,
  X,
} from 'lucide-react-native';

import RadarSearchingAnimation from '../../../components/animations/RadarSearchingAnimation';
import SuccessConfettiPopup from '../../../components/animations/SuccessConfettiPopup';
import CategoryIcon from '../../../components/ui/CategoryIcon';
import PrimaryButton, { triggerHaptic } from '../../../components/ui/PrimaryButton';
import StatusBadge from '../../../components/ui/StatusBadge';
import TextField from '../../../components/ui/TextField';
import { formatDistance } from '../../../constants/moroccoCities';
import {
  cardSurface,
  colors,
  getFontFamily,
  lineHeightFor,
  numericTextStyle,
  radii,
  shadows,
} from '../../../constants/theme';
import { useAppLanguage } from '../../../i18n';
import {
  bookingErrorKey,
  cancelBooking,
  createAppointment,
  createSosRequest,
  getBookedSlots,
  uploadIssuePhoto,
  useProDetails,
  type BookedSlot,
} from '../../../lib/clientData';
import { openDirections } from '../../../lib/maps';
import {
  estimateWaitMinutes,
  takeQueueTicket,
  todayISODate,
  useBookingLive,
  useProLiveQueue,
  useServices,
  type ServiceRow,
} from '../../../lib/supabase';
import { formatDayLabel, formatMAD, formatTime, ltr, shortDayName } from '../../../lib/whatsapp';
import { useAppStore } from '../../../store/useAppStore';

/** Default opening hours used to build appointment slots. */
const OPEN_HOUR = 9;
const CLOSE_HOUR = 20;
const SLOT_STEP_MIN = 30;
const DAYS_AHEAD = 14;
const MIN_LEAD_MIN = 15;

type Slot = { time: Date; available: boolean };

function buildSlots(day: Date, durationMin: number, booked: BookedSlot[]): Slot[] {
  const start = new Date(day);
  start.setHours(OPEN_HOUR, 0, 0, 0);
  const end = new Date(day);
  end.setHours(CLOSE_HOUR, 0, 0, 0);
  const minStart = Date.now() + MIN_LEAD_MIN * 60_000;
  const slots: Slot[] = [];
  for (let t = start.getTime(); t + durationMin * 60_000 <= end.getTime(); t += SLOT_STEP_MIN * 60_000) {
    if (t < minStart) continue;
    const slotEnd = t + durationMin * 60_000;
    const clash = booked.some((b) => t < b.start.getTime() + b.minutes * 60_000 && b.start.getTime() < slotEnd);
    slots.push({ time: new Date(t), available: !clash });
  }
  return slots;
}

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

type SuccessState = { visible: boolean; ticket?: number | null; highlight?: string | null; title?: string; subtitle?: string };

export default function ProDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, lang, mirror } = useAppLanguage();

  const user = useAppStore((s) => s.user);
  const userLocation = useAppStore((s) => s.userLocation);

  const { pro, reviews, loading } = useProDetails(id, userLocation);
  const { services } = useServices(id, { onlyActive: true });
  const engine = pro?.category?.booking_type ?? null;
  const live = useProLiveQueue(engine === 'queue' ? id : null);

  const [serviceId, setServiceId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<SuccessState>({ visible: false });

  useEffect(() => {
    if (!serviceId && services.length) setServiceId(services[0].id);
  }, [services, serviceId]);
  const service = services.find((s) => s.id === serviceId) ?? null;

  /* ---------------------------- appointment state --------------------------- */
  const days = useMemo(() => {
    const today = startOfDay(new Date());
    return Array.from({ length: DAYS_AHEAD }, (_, i) => new Date(today.getTime() + i * 86_400_000));
  }, []);
  const [day, setDay] = useState<Date>(days[0]);
  const [booked, setBooked] = useState<BookedSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slot, setSlot] = useState<Date | null>(null);

  const loadSlots = useCallback(async () => {
    if (!id || engine !== 'appointment') return;
    setSlotsLoading(true);
    try {
      setBooked(await getBookedSlots(id, day));
    } catch {
      setBooked([]);
    } finally {
      setSlotsLoading(false);
    }
  }, [id, engine, day]);

  useEffect(() => {
    setSlot(null);
    loadSlots();
  }, [loadSlots]);

  const slots = useMemo(
    () => buildSlots(day, service?.duration_minutes ?? SLOT_STEP_MIN, booked),
    [day, service?.duration_minutes, booked],
  );

  /* ------------------------------ on-demand state --------------------------- */
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(userLocation);
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<{ uri: string; mimeType: string } | null>(null);
  const [locating, setLocating] = useState(false);
  const [formErrors, setFormErrors] = useState<Partial<Record<'address' | 'notes' | 'location', string>>>({});
  const [sosBookingId, setSosBookingId] = useState<string | null>(null);
  const sos = useBookingLive(sosBookingId);

  const locate = useCallback(async () => {
    setLocating(true);
    try {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) {
        setFormErrors((e) => ({ ...e, location: t('errors.locationDenied') }));
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const next = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      setCoords(next);
      setFormErrors((e) => ({ ...e, location: undefined }));
      const [place] = await Location.reverseGeocodeAsync(next).catch(() => []);
      if (place) {
        const line = [place.streetNumber, place.street, place.district ?? place.subregion, place.city]
          .filter(Boolean)
          .join(', ');
        if (line) setAddress((current) => current || line);
      }
    } catch {
      setFormErrors((e) => ({ ...e, location: t('errors.generic') }));
    } finally {
      setLocating(false);
    }
  }, [t]);

  useEffect(() => {
    if (engine === 'ondemand' && !coords) locate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine]);

  // Radar → success when the pro accepts, alert when declined.
  useEffect(() => {
    const b = sos.booking;
    if (!b || !sosBookingId) return;
    if (b.status === 'confirmed' || b.status === 'in_progress') {
      setSosBookingId(null);
      setSuccess({
        visible: true,
        title: t('radar.found'),
        subtitle: t('ondemand.accepted', { name: pro?.business_name ?? '' }),
      });
    } else if (b.status === 'cancelled') {
      setSosBookingId(null);
      triggerHaptic('warning');
      Alert.alert(t('status.cancelled'), t('ondemand.declined'));
    }
  }, [sos.booking, sosBookingId, pro?.business_name, t]);

  const pickPhoto = () => {
    const launch = async (camera: boolean) => {
      const perm = camera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6, allowsEditing: true };
      const res = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (!res.canceled && res.assets[0]) {
        setPhoto({ uri: res.assets[0].uri, mimeType: res.assets[0].mimeType ?? 'image/jpeg' });
      }
    };
    Alert.alert(t('ondemand.addPhoto'), undefined, [
      { text: t('ondemand.camera'), onPress: () => launch(true) },
      { text: t('ondemand.gallery'), onPress: () => launch(false) },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  /* --------------------------------- actions -------------------------------- */
  const showError = (err: unknown) => {
    triggerHaptic('warning');
    Alert.alert(t('common.error'), t(bookingErrorKey(err, engine ?? 'appointment')));
  };

  const takeTurn = async () => {
    if (!user || !id) return;
    setSubmitting(true);
    try {
      const booking = await takeQueueTicket({ proId: id, clientId: user.id, serviceId });
      live.refresh();
      setSuccess({ visible: true, ticket: booking.queue_number });
    } catch (err) {
      showError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmAppointment = async () => {
    if (!user || !id || !slot) return;
    setSubmitting(true);
    try {
      await createAppointment({ clientId: user.id, proId: id, serviceId, scheduledAt: slot });
      setSuccess({
        visible: true,
        highlight: `${formatDayLabel(slot, lang)} • ${ltr(formatTime(slot))}`,
      });
    } catch (err) {
      showError(err);
      loadSlots();
    } finally {
      setSubmitting(false);
    }
  };

  const requestIntervention = async () => {
    if (!user || !id) return;
    const errors: typeof formErrors = {};
    if (!coords) errors.location = t('proSetup.locationRequired');
    if (address.trim().length < 4) errors.address = t('ondemand.addressRequired');
    if (notes.trim().length < 4) errors.notes = t('ondemand.issueRequired');
    setFormErrors(errors);
    if (Object.keys(errors).length || !coords) {
      triggerHaptic('warning');
      return;
    }
    setSubmitting(true);
    try {
      let photoUrl: string | null = null;
      if (photo) {
        try {
          photoUrl = await uploadIssuePhoto(user.id, photo.uri, photo.mimeType);
        } catch {
          Alert.alert(t('common.error'), t('errors.uploadFailed'));
          return;
        }
      }
      const booking = await createSosRequest({
        clientId: user.id,
        proId: id,
        serviceId,
        latitude: coords.latitude,
        longitude: coords.longitude,
        address: address.trim(),
        notes: notes.trim(),
        photoUrl,
      });
      triggerHaptic('medium');
      setSosBookingId(booking.id);
    } catch (err) {
      showError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const cancelSos = () => {
    if (!sosBookingId) return;
    Alert.alert(t('radar.cancel'), t('bookings.cancelConfirm'), [
      { text: t('common.no'), style: 'cancel' },
      {
        text: t('common.yes'),
        style: 'destructive',
        onPress: async () => {
          const bookingId = sosBookingId;
          setSosBookingId(null);
          await cancelBooking(bookingId).catch(() => undefined);
        },
      },
    ]);
  };

  /* --------------------------------- render --------------------------------- */
  const fontBold = getFontFamily(lang, 'bold');
  const fontSemi = getFontFamily(lang, 'semibold');
  const fontMedium = getFontFamily(lang, 'medium');

  if (!pro) {
    return (
      <View style={[styles.screen, styles.center]}>
        {loading ? (
          <RadarSearchingAnimation size={180} showOrbit={false} showCaption={false} />
        ) : (
          <>
            <Text style={[styles.muted, { fontFamily: fontSemi }]}>{t('errors.notFound')}</Text>
            <PrimaryButton title={t('common.back')} variant="ghost" fullWidth={false} onPress={() => router.back()} />
          </>
        )}
      </View>
    );
  }

  const isOpen = live.isOpen ?? pro.is_open;
  const waiting = live.waitingCount ?? Math.max(0, pro.last_issued_ticket - pro.current_queue_number);
  const nextTicket = (live.lastIssued ?? pro.last_issued_ticket) + 1;
  const description = (lang === 'ar' ? pro.description_ar : pro.description_fr) || pro.description_fr || pro.description_ar;
  const categoryName = pro.category ? (lang === 'ar' ? pro.category.name_ar : pro.category.name_fr) : null;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
        {/* Cover */}
        <View style={styles.cover}>
          {pro.cover_url ? (
            <Image source={{ uri: pro.cover_url }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.coverFallback]}>
              <CategoryIcon icon={pro.category?.icon} slug={pro.category?.slug} size={88} radius={28} />
            </View>
          )}
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(client)'))}
            style={[styles.backButton, { top: insets.top + 8 }]}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
          >
            <View style={{ transform: mirror }}>
              <ChevronLeft size={22} color={colors.primary.DEFAULT} />
            </View>
          </Pressable>
        </View>

        {/* Identity */}
        <Animated.View entering={FadeInDown.duration(350)} style={styles.identity}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { fontFamily: fontBold, lineHeight: lineHeightFor(22, lang) }]}>{pro.business_name}</Text>
            {pro.is_verified && <BadgeCheck size={20} color={colors.background.surface} fill={colors.accent.DEFAULT} />}
          </View>
          <View style={styles.metaRow}>
            <View style={styles.rating}>
              <Star size={14} color={colors.accent.DEFAULT} fill={colors.accent.DEFAULT} />
              <Text style={styles.ratingText}>{Number(pro.rating_avg).toFixed(1)}</Text>
            </View>
            <Text style={[styles.meta, { fontFamily: fontMedium }]}>
              {t('proCard.reviews', { count: pro.rating_count })}
              {categoryName ? ` • ${categoryName}` : ''}
            </Text>
          </View>
          <View style={styles.badges}>
            <StatusBadge
              label={isOpen ? t('proCard.open') : t('proCard.closed')}
              tone={isOpen ? 'online' : 'offline'}
              pulse={isOpen}
              size="md"
            />
            {engine && <StatusBadge label={t(`engine.${engine}`)} tone="primary" dot={false} size="md" />}
          </View>

          {(pro.address || pro.neighborhood) && (
            <Pressable
              onPress={() => openDirections(pro.latitude, pro.longitude)}
              style={styles.addressRow}
              accessibilityRole="button"
              accessibilityLabel={t('common.directions')}
            >
              <MapPin size={16} color={colors.secondary.tealDark} />
              <Text style={[styles.address, { fontFamily: fontMedium, lineHeight: lineHeightFor(13, lang) }]}>
                {[pro.address, pro.neighborhood, pro.city].filter(Boolean).join(', ')}
                {pro.distance_km != null ? ` • ${ltr(formatDistance(pro.distance_km))}` : ''}
              </Text>
              <Navigation size={16} color={colors.accent.DEFAULT} />
            </Pressable>
          )}
          {!!description && (
            <Text style={[styles.description, { fontFamily: fontMedium, lineHeight: lineHeightFor(14, lang) }]}>
              {description}
            </Text>
          )}
        </Animated.View>

        {/* Services */}
        <Section title={engine === 'ondemand' ? t('proProfile.selectService') : t('proProfile.services')}>
          {services.length === 0 ? (
            <Text style={[styles.muted, { fontFamily: fontMedium }]}>{t('proProfile.noServices')}</Text>
          ) : (
            services.map((s) => (
              <ServiceOption key={s.id} service={s} selected={s.id === serviceId} onPress={() => setServiceId(s.id)} />
            ))
          )}
        </Section>

        {/* Appointment: date strip + slots */}
        {engine === 'appointment' && (
          <Section title={t('appointment.chooseDate')}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateStrip}>
              {days.map((d) => {
                const active = d.getTime() === day.getTime();
                const isToday = todayISODate(d) === todayISODate();
                return (
                  <Pressable
                    key={d.toISOString()}
                    onPress={() => {
                      triggerHaptic('light');
                      setDay(d);
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active }}
                    style={[styles.dateChip, active && styles.dateChipActive]}
                  >
                    <Text style={[styles.dateDay, { fontFamily: fontSemi }, active && styles.dateTextActive]} numberOfLines={1}>
                      {isToday ? t('common.today') : shortDayName(d, lang)}
                    </Text>
                    <Text style={[styles.dateNum, active && styles.dateTextActive]}>{d.getDate()}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={[styles.subTitle, { fontFamily: fontSemi }]}>{t('appointment.chooseTime')}</Text>
            {slotsLoading ? (
              <Text style={[styles.muted, { fontFamily: fontMedium }]}>{t('common.loading')}</Text>
            ) : slots.filter((s) => s.available).length === 0 ? (
              <Text style={[styles.muted, { fontFamily: fontMedium }]}>{t('appointment.noSlots')}</Text>
            ) : (
              <View style={styles.slots}>
                {slots.map((s) => {
                  const active = slot?.getTime() === s.time.getTime();
                  return (
                    <Pressable
                      key={s.time.toISOString()}
                      disabled={!s.available}
                      onPress={() => {
                        triggerHaptic('light');
                        setSlot(s.time);
                      }}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: active, disabled: !s.available }}
                      style={[styles.slot, active && styles.slotActive, !s.available && styles.slotDisabled]}
                    >
                      <Text style={[styles.slotText, active && { color: colors.text.inverse }, !s.available && styles.slotTextDisabled]}>
                        {formatTime(s.time)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </Section>
        )}

        {/* On-demand: location, issue, photo */}
        {engine === 'ondemand' && (
          <Section title={t('ondemand.confirmLocation')}>
            <Pressable
              onPress={locate}
              disabled={locating}
              accessibilityRole="button"
              style={[styles.gpsCard, !!coords && styles.gpsCardDone, !!formErrors.location && styles.gpsCardError]}
            >
              <View style={[styles.gpsIcon, !!coords && { backgroundColor: colors.status.online }]}>
                {coords ? <MapPin size={18} color={colors.text.inverse} /> : <LocateFixed size={18} color={colors.primary.DEFAULT} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.gpsTitle, { fontFamily: fontSemi }]}>
                  {locating ? t('proSetup.locating') : coords ? t('proSetup.located') : t('ondemand.useMyLocation')}
                </Text>
                {!!coords && <Text style={styles.coords}>{`${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`}</Text>}
              </View>
              {!!coords && <Text style={[styles.gpsRefresh, { fontFamily: fontSemi }]}>{t('ondemand.useMyLocation')}</Text>}
            </Pressable>
            {!!formErrors.location && <Text style={[styles.error, { fontFamily: fontMedium }]}>{formErrors.location}</Text>}

            <TextField
              label={t('settings.address')}
              value={address}
              onChangeText={(v) => {
                setAddress(v);
                if (formErrors.address) setFormErrors((e) => ({ ...e, address: undefined }));
              }}
              maxLength={160}
              error={formErrors.address}
            />
            <TextField
              label={t('ondemand.describeIssue')}
              value={notes}
              onChangeText={(v) => {
                setNotes(v);
                if (formErrors.notes) setFormErrors((e) => ({ ...e, notes: undefined }));
              }}
              placeholder={t('ondemand.issuePlaceholder')}
              multiline
              maxLength={500}
              error={formErrors.notes}
            />

            {photo ? (
              <View style={styles.photoWrap}>
                <Image source={{ uri: photo.uri }} style={styles.photo} contentFit="cover" />
                <Pressable
                  onPress={() => setPhoto(null)}
                  style={styles.photoRemove}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.delete')}
                >
                  <X size={16} color={colors.text.inverse} />
                </Pressable>
                <Pressable onPress={pickPhoto} style={styles.photoChange} accessibilityRole="button">
                  <Camera size={14} color={colors.primary.DEFAULT} />
                  <Text style={[styles.photoChangeText, { fontFamily: fontSemi }]}>{t('ondemand.changePhoto')}</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={pickPhoto} style={styles.photoAdd} accessibilityRole="button">
                <ImagePlus size={22} color={colors.secondary.tealDark} />
                <Text style={[styles.photoAddText, { fontFamily: fontSemi }]}>
                  {t('ondemand.addPhoto')} ({t('common.optional')})
                </Text>
              </Pressable>
            )}
          </Section>
        )}

        {/* Reviews */}
        <Section title={t('proProfile.reviews')}>
          {reviews.length === 0 ? (
            <Text style={[styles.muted, { fontFamily: fontMedium }]}>{t('proProfile.noReviews')}</Text>
          ) : (
            reviews.map((r) => (
              <View key={r.id} style={styles.review}>
                <View style={styles.reviewTop}>
                  <View style={styles.reviewStars}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        size={13}
                        color={n <= r.rating ? colors.accent.DEFAULT : colors.border.strong}
                        fill={n <= r.rating ? colors.accent.DEFAULT : 'transparent'}
                      />
                    ))}
                  </View>
                  <Text style={[styles.reviewDate, { fontFamily: fontMedium }]}>{formatDayLabel(new Date(r.created_at), lang)}</Text>
                </View>
                {!!r.comment && (
                  <Text style={[styles.reviewText, { fontFamily: fontMedium, lineHeight: lineHeightFor(14, lang) }]}>{r.comment}</Text>
                )}
              </View>
            ))
          )}
        </Section>
      </ScrollView>

      {/* Sticky engine bar (thumb zone) */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        {engine === 'queue' && (
          <>
            <View style={styles.queueInfo}>
              <Ticket size={18} color={colors.accent.DEFAULT} />
              <Text style={[styles.queueText, { fontFamily: fontSemi }]}>
                {waiting > 0 ? t('queue.peopleAhead', { count: waiting }) : t('queue.nobodyAhead')}
              </Text>
              {waiting > 0 && (
                <View style={styles.queueEta}>
                  <Clock size={13} color={colors.text.secondary} />
                  <Text style={styles.queueEtaText}>{`~${estimateWaitMinutes(waiting)} min`}</Text>
                </View>
              )}
            </View>
            <PrimaryButton
              title={isOpen ? t('queue.takeTurn', { ticket: ltr(`#${nextTicket}`) }) : t('queue.closedCta')}
              icon={Ticket}
              disabled={!isOpen}
              loading={submitting}
              haptic="heavy"
              onPress={takeTurn}
            />
          </>
        )}
        {engine === 'appointment' && (
          <>
            {!!slot && (
              <Animated.Text entering={FadeIn} style={[styles.selection, { fontFamily: fontSemi }]}>
                {`${formatDayLabel(slot, lang)} • ${ltr(formatTime(slot))}`}
                {service ? ` • ${ltr(formatMAD(service.price_mad))}` : ''}
              </Animated.Text>
            )}
            <PrimaryButton
              title={t('appointment.confirm')}
              icon={Check}
              disabled={!slot}
              loading={submitting}
              onPress={confirmAppointment}
            />
          </>
        )}
        {engine === 'ondemand' && (
          <PrimaryButton
            title={t('ondemand.request')}
            icon={Siren}
            disabled={!isOpen}
            loading={submitting}
            haptic="heavy"
            onPress={requestIntervention}
          />
        )}
      </View>

      {/* SOS radar while waiting for the pro */}
      <Modal visible={!!sosBookingId} animationType="fade" statusBarTranslucent onRequestClose={cancelSos}>
        <View style={[styles.radarScreen, { paddingTop: insets.top + 40, paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={styles.center}>
            <RadarSearchingAnimation
              size={280}
              title={t('radar.title')}
              subtitle={t('ondemand.waitingPro', { name: pro.business_name })}
            />
          </View>
          <View style={{ paddingHorizontal: 20 }}>
            <PrimaryButton title={t('radar.cancel')} icon={X} variant="outline" haptic="light" onPress={cancelSos} />
          </View>
        </View>
      </Modal>

      <SuccessConfettiPopup
        visible={success.visible}
        ticketNumber={success.ticket ?? null}
        highlight={success.highlight ?? null}
        title={success.title}
        subtitle={success.subtitle}
        secondaryLabel={t('success.viewBookings')}
        onSecondary={() => {
          setSuccess({ visible: false });
          router.replace('/bookings');
        }}
        onClose={() => {
          setSuccess({ visible: false });
          router.replace('/(client)');
        }}
      />
    </View>
  );
}

/* -------------------------------------------------------------------------- */

function Section({ title, children }: { title: string; children: ReactNode }) {
  const { lang } = useAppLanguage();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { fontFamily: getFontFamily(lang, 'bold'), lineHeight: lineHeightFor(17, lang) }]}>
        {title}
      </Text>
      <View style={{ gap: 10 }}>{children}</View>
    </View>
  );
}

function ServiceOption({ service, selected, onPress }: { service: ServiceRow; selected: boolean; onPress: () => void }) {
  const { t, lang } = useAppLanguage();
  const title = (lang === 'ar' ? service.title_ar : service.title_fr) || service.title_fr;
  return (
    <Pressable
      onPress={() => {
        triggerHaptic('light');
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      style={({ pressed }) => [styles.service, selected && styles.serviceSelected, pressed && { transform: [{ scale: 0.98 }] }]}
    >
      <View style={[styles.radio, selected && styles.radioOn]}>{selected && <Check size={12} color={colors.text.inverse} strokeWidth={3} />}</View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.serviceTitle, { fontFamily: getFontFamily(lang, 'semibold'), lineHeight: lineHeightFor(15, lang) }]}>
          {title}
        </Text>
        <Text style={[styles.serviceMeta, { fontFamily: getFontFamily(lang, 'medium') }]}>
          {t('proProfile.duration', { minutes: ltr(service.duration_minutes) })}
        </Text>
      </View>
      <Text style={styles.servicePrice}>{formatMAD(service.price_mad)}</Text>
    </Pressable>
  );
}

/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background.main,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  muted: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'auto',
  },
  cover: {
    height: 210,
    backgroundColor: colors.secondary.tealLight,
  },
  coverFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    start: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.raised,
  },
  identity: {
    ...cardSurface,
    marginHorizontal: 16,
    marginTop: -36,
    padding: 16,
    gap: 10,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    flexShrink: 1,
    fontSize: 22,
    color: colors.text.primary,
    textAlign: 'auto',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rating: {
    flexDirection: 'row',
    direction: 'ltr',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    ...numericTextStyle('body', 'bold', colors.text.primary),
  },
  meta: {
    flexShrink: 1,
    fontSize: 13,
    color: colors.text.secondary,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border.DEFAULT,
  },
  address: {
    flex: 1,
    fontSize: 13,
    color: colors.text.primary,
    textAlign: 'auto',
  },
  description: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'auto',
  },
  section: {
    marginTop: 22,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 17,
    color: colors.text.primary,
    marginBottom: 10,
    textAlign: 'auto',
  },
  subTitle: {
    marginTop: 8,
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'auto',
  },
  service: {
    ...cardSurface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
  },
  serviceSelected: {
    borderColor: colors.secondary.teal,
    borderWidth: 2,
    padding: 13,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border.strong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: {
    backgroundColor: colors.accent.DEFAULT,
    borderColor: colors.accent.DEFAULT,
  },
  serviceTitle: {
    fontSize: 15,
    color: colors.text.primary,
    textAlign: 'auto',
  },
  serviceMeta: {
    fontSize: 12,
    color: colors.text.secondary,
    textAlign: 'auto',
  },
  servicePrice: {
    ...numericTextStyle('bodyLarge', 'bold', colors.accent.dark),
  },
  dateStrip: {
    gap: 8,
    paddingVertical: 2,
  },
  dateChip: {
    width: 64,
    height: 70,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    backgroundColor: colors.background.surface,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  dateChipActive: {
    backgroundColor: colors.primary.DEFAULT,
    borderColor: colors.primary.DEFAULT,
  },
  dateDay: {
    fontSize: 11,
    color: colors.text.secondary,
  },
  dateNum: {
    ...numericTextStyle('title', 'bold', colors.text.primary),
  },
  dateTextActive: {
    color: colors.text.inverse,
  },
  slots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    direction: 'ltr',
    gap: 8,
  },
  slot: {
    minWidth: 72,
    height: 42,
    paddingHorizontal: 12,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.surface,
    borderWidth: 1,
    borderColor: colors.secondary.teal,
  },
  slotActive: {
    backgroundColor: colors.accent.DEFAULT,
    borderColor: colors.accent.DEFAULT,
  },
  slotDisabled: {
    backgroundColor: colors.background.main,
    borderColor: colors.border.DEFAULT,
  },
  slotText: {
    ...numericTextStyle('body', 'bold', colors.primary.DEFAULT),
  },
  slotTextDisabled: {
    color: colors.text.muted,
    textDecorationLine: 'line-through',
  },
  gpsCard: {
    ...cardSurface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderColor: colors.secondary.teal,
  },
  gpsCardDone: {
    borderStyle: 'solid',
    borderColor: colors.status.online,
  },
  gpsCardError: {
    borderColor: colors.status.offline,
  },
  gpsIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.secondary.tealLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsTitle: {
    fontSize: 14,
    color: colors.text.primary,
    textAlign: 'auto',
  },
  gpsRefresh: {
    fontSize: 12,
    color: colors.accent.dark,
  },
  coords: {
    ...numericTextStyle('small', 'medium', colors.text.secondary),
    textAlign: 'left',
  },
  error: {
    fontSize: 12,
    color: colors.status.offline,
    textAlign: 'auto',
  },
  photoAdd: {
    height: 90,
    borderRadius: radii.card,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.secondary.teal,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.background.surface,
  },
  photoAddText: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  photoWrap: {
    height: 180,
    borderRadius: radii.card,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoRemove: {
    position: 'absolute',
    top: 10,
    end: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoChange: {
    position: 'absolute',
    bottom: 10,
    start: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.background.surface,
  },
  photoChangeText: {
    fontSize: 12,
    color: colors.primary.DEFAULT,
  },
  review: {
    ...cardSurface,
    padding: 12,
    gap: 6,
  },
  reviewTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewStars: {
    flexDirection: 'row',
    direction: 'ltr',
    gap: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: colors.text.muted,
  },
  reviewText: {
    fontSize: 14,
    color: colors.text.primary,
    textAlign: 'auto',
  },
  bottomBar: {
    position: 'absolute',
    start: 0,
    end: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
    backgroundColor: colors.background.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border.DEFAULT,
    ...shadows.sheet,
  },
  queueInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  queueText: {
    flex: 1,
    fontSize: 14,
    color: colors.text.primary,
    textAlign: 'auto',
  },
  queueEta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  queueEtaText: {
    ...numericTextStyle('small', 'semibold', colors.text.secondary),
  },
  selection: {
    fontSize: 14,
    color: colors.primary.DEFAULT,
    textAlign: 'center',
  },
  radarScreen: {
    flex: 1,
    backgroundColor: colors.background.main,
  },
});
