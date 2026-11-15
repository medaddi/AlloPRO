/**
 * AlloPro — Floating live ticket widget (pinned on the client Home screen).
 *   Queue:       "Votre tour : #14 • En cours : #12 (~20 min)" — Realtime via Supabase
 *   Appointment: "RDV aujourd'hui à 15:30"
 *   On-demand:   "Recherche d'un artisan…" → "L'artisan est en route" → "Intervention en cours"
 * Vibrates when the client becomes next in line and when it is their turn.
 */
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  FadeInUp,
  FadeOutUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { CalendarClock, ChevronRight, Ticket, Wrench, type LucideIcon } from 'lucide-react-native';

import { useAppLanguage } from '../../i18n';
import { colors, getFontFamily, lineHeightFor, motion, numericTextStyle, radii, shadows } from '../../constants/theme';
import {
  estimateWaitMinutes,
  peopleAhead,
  todayISODate,
  useProLiveQueue,
  type BookingRow,
} from '../../lib/supabase';
import { formatDayLabel, formatTime, ltr } from '../../lib/whatsapp';
import { triggerHaptic } from '../ui/PrimaryButton';
import StatusBadge from '../ui/StatusBadge';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type QueueStage = 'waiting' | 'next' | 'turn';

type Props = {
  booking: BookingRow;
  proName: string;
  onPress?: (booking: BookingRow) => void;
  /** Average service time for the wait estimate (defaults to 20 min). */
  avgServiceMinutes?: number;
  style?: StyleProp<ViewStyle>;
};

export default function ActiveTicketBanner({ booking, proName, onPress, avgServiceMinutes = 20, style }: Props) {
  const { t, lang, mirror } = useAppLanguage();
  const isQueue = booking.booking_type === 'queue';
  const live = useProLiveQueue(isQueue ? booking.pro_id : null);

  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  /* ------------------------------ queue maths ----------------------------- */
  const myTicket = booking.queue_number ?? 0;
  const current = live.currentNumber ?? 0;
  const ahead = peopleAhead(myTicket, current);
  const stage: QueueStage =
    booking.status === 'in_progress' || (myTicket > 0 && current >= myTicket) ? 'turn' : ahead === 0 ? 'next' : 'waiting';
  const progress = myTicket > 0 ? Math.min(1, Math.max(0, current / myTicket)) : 0;

  // Haptic nudge when the client moves to "next" or "your turn".
  const prevStage = useRef<QueueStage | null>(null);
  useEffect(() => {
    if (!isQueue || live.loading) return;
    if (prevStage.current && prevStage.current !== stage) {
      triggerHaptic(stage === 'turn' ? 'success' : 'warning');
    }
    prevStage.current = stage;
  }, [isQueue, stage, live.loading]);

  /* --------------------------------- text --------------------------------- */
  let Icon: LucideIcon = Ticket;
  let title: string;
  let subtitle: string | null = null;

  if (isQueue) {
    title = t('ticket.yourTurn', { ticket: ltr(`#${myTicket}`) });
    if (stage === 'turn') subtitle = t('ticket.itsYourTurn');
    else if (stage === 'next')
      subtitle = `${t('ticket.nowServing', { ticket: ltr(`#${current}`) })} • ${t('ticket.youAreNext')}`;
    else
      subtitle = `${t('ticket.nowServing', { ticket: ltr(`#${current}`) })} (${t('ticket.eta', {
        minutes: ltr(estimateWaitMinutes(ahead, avgServiceMinutes)),
      })})`;
  } else if (booking.booking_type === 'appointment') {
    Icon = CalendarClock;
    const at = booking.scheduled_at ? new Date(booking.scheduled_at) : null;
    if (at) {
      const day = todayISODate(at) === todayISODate() ? t('common.today').toLowerCase() : formatDayLabel(at, lang);
      title = t('ticket.appointmentAt', { day, time: ltr(formatTime(at)) });
    } else {
      title = t('engine.appointment');
    }
    subtitle = t(`status.${booking.status}`);
  } else {
    Icon = Wrench;
    title =
      booking.status === 'pending'
        ? t('ticket.searchingArtisan')
        : booking.status === 'in_progress'
          ? t('ticket.interventionInProgress')
          : t('ticket.artisanOnTheWay');
    subtitle = t('ticket.tapToTrack');
  }

  return (
    <Animated.View entering={FadeInUp.springify().damping(16)} exiting={FadeOutUp.duration(200)} style={style}>
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={[proName, title, subtitle].filter(Boolean).join('. ')}
        accessibilityLiveRegion="polite"
        onPressIn={() => {
          scale.value = withTiming(motion.pressScale, { duration: motion.pressDuration });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, motion.spring.snappy);
        }}
        onPress={() => {
          triggerHaptic('light');
          onPress?.(booking);
        }}
        style={[styles.card, stage === 'turn' && isQueue && styles.cardTurn, pressStyle]}
      >
        <View style={styles.topRow}>
          <StatusBadge label={t('ticket.live')} tone="accent" pulse size="sm" style={styles.liveBadge} />
          <Text
            numberOfLines={1}
            style={[styles.proName, { fontFamily: getFontFamily(lang, 'semibold'), lineHeight: lineHeightFor(13, lang) }]}
          >
            {proName}
          </Text>
        </View>

        <View style={styles.mainRow}>
          <View style={styles.iconWrap}>
            {isQueue ? (
              <Text style={styles.ticketNumber} numberOfLines={1} adjustsFontSizeToFit>{`#${myTicket}`}</Text>
            ) : (
              <Icon size={22} color={colors.accent.DEFAULT} strokeWidth={2.4} />
            )}
          </View>

          <View style={styles.texts}>
            <Text
              numberOfLines={1}
              style={[styles.title, { fontFamily: getFontFamily(lang, 'bold'), lineHeight: lineHeightFor(16, lang) }]}
            >
              {title}
            </Text>
            {!!subtitle && (
              <Text
                numberOfLines={1}
                style={[
                  styles.subtitle,
                  stage === 'turn' && isQueue && styles.subtitleTurn,
                  { fontFamily: getFontFamily(lang, 'medium'), lineHeight: lineHeightFor(13, lang) },
                ]}
              >
                {subtitle}
              </Text>
            )}
          </View>

          <View style={{ transform: mirror }}>
            <ChevronRight size={20} color={colors.secondary.teal} />
          </View>
        </View>

        {isQueue && (
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
        )}
      </AnimatedPressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: radii.card,
    padding: 14,
    gap: 10,
    ...shadows.raised,
  },
  cardTurn: {
    borderWidth: 2,
    borderColor: colors.accent.DEFAULT,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveBadge: {
    backgroundColor: 'rgba(240, 138, 75, 0.18)',
  },
  proName: {
    flex: 1,
    fontSize: 13,
    color: colors.secondary.teal,
    textAlign: 'auto',
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    minWidth: 52,
    height: 52,
    paddingHorizontal: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ticketNumber: {
    ...numericTextStyle('title', 'bold', colors.accent.DEFAULT),
    fontSize: 20,
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 16,
    color: colors.text.inverse,
    textAlign: 'auto',
  },
  subtitle: {
    fontSize: 13,
    color: colors.secondary.tealLight,
    textAlign: 'auto',
  },
  subtitleTurn: {
    color: colors.accent.light,
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(165, 196, 196, 0.25)',
    overflow: 'hidden',
  },
  fill: {
    alignSelf: 'flex-start',
    height: '100%',
    borderRadius: 2,
    backgroundColor: colors.accent.DEFAULT,
  },
});
