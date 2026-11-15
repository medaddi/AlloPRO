/**
 * AlloPro — Pro queue controller (barbers, car wash…).
 * Giant "now serving" ticket, waiting count, next clients,
 * "CLIENT SUIVANT ➔" and "+ Client sur place" (walk-in).
 */
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { ArrowRight, UserPlus } from 'lucide-react-native';

import { cardSurface, colors, getFontFamily, lineHeightFor, numericTextStyle, radii } from '../../constants/theme';
import { useAppLanguage } from '../../i18n';
import { ltr } from '../../lib/whatsapp';
import PrimaryButton from '../ui/PrimaryButton';
import StatusBadge from '../ui/StatusBadge';

export type UpNextItem = { ticket: number; name: string };

type Props = {
  isOpen: boolean;
  currentNumber: number;
  lastIssued: number;
  waitingCount: number;
  servedCount: number;
  upNext: UpNextItem[];
  advancing: boolean;
  onNext: () => void;
  onWalkin: () => void;
};

export default function QueueControllerCard({
  isOpen,
  currentNumber,
  lastIssued,
  waitingCount,
  servedCount,
  upNext,
  advancing,
  onNext,
  onWalkin,
}: Props) {
  const { t, lang } = useAppLanguage();
  const fontSemi = getFontFamily(lang, 'semibold');
  const fontMedium = getFontFamily(lang, 'medium');

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={[styles.caption, { fontFamily: fontSemi }]}>{t('guichet.nowServing')}</Text>
        <StatusBadge
          label={waitingCount > 0 ? t('guichet.waiting', { count: waitingCount }) : t('guichet.emptyQueue')}
          tone={waitingCount === 0 ? 'neutral' : waitingCount >= 5 ? 'busy' : 'online'}
          pulse={waitingCount > 0 && isOpen}
        />
      </View>

      <View style={styles.ticketWrap} accessibilityLiveRegion="polite">
        <Animated.Text
          key={currentNumber}
          entering={FadeInDown.springify().damping(14)}
          exiting={FadeOutUp.duration(160)}
          style={styles.ticket}
          accessibilityLabel={`${t('guichet.nowServing')} ${currentNumber}`}
        >
          {currentNumber > 0 ? `#${currentNumber}` : '—'}
        </Animated.Text>
      </View>

      <View style={styles.statsRow}>
        <Text style={[styles.stat, { fontFamily: fontMedium }]}>
          {t('guichet.lastIssued', { ticket: ltr(lastIssued > 0 ? `#${lastIssued}` : '—') })}
        </Text>
        <Text style={[styles.stat, { fontFamily: fontMedium }]}>{t('guichet.served', { count: servedCount })}</Text>
      </View>

      {upNext.length > 0 && (
        <View style={styles.upNext}>
          <Text style={[styles.upNextTitle, { fontFamily: fontSemi }]}>{t('guichet.upNext')}</Text>
          <View style={styles.upNextRow}>
            {upNext.map((item) => (
              <View key={item.ticket} style={styles.upNextChip}>
                <Text style={styles.upNextTicket}>{`#${item.ticket}`}</Text>
                <Text
                  numberOfLines={1}
                  style={[styles.upNextName, { fontFamily: fontMedium, lineHeight: lineHeightFor(12, lang) }]}
                >
                  {item.name}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {!isOpen && (
        <Text style={[styles.closedHint, { fontFamily: fontMedium, lineHeight: lineHeightFor(13, lang) }]}>
          {t('guichet.openFirst')}
        </Text>
      )}

      <View style={styles.actions}>
        <PrimaryButton
          title={t('guichet.next')}
          icon={ArrowRight}
          iconPosition="end"
          directionalIcon
          haptic="heavy"
          loading={advancing}
          disabled={!isOpen || waitingCount === 0}
          onPress={onNext}
          textStyle={styles.nextLabel}
        />
        <PrimaryButton
          title={t('guichet.walkin')}
          icon={UserPlus}
          variant="outline"
          haptic="light"
          disabled={!isOpen}
          onPress={onWalkin}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...cardSurface,
    padding: 18,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  caption: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  ticketWrap: {
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
  },
  ticket: {
    ...numericTextStyle('ticket', 'bold', colors.primary.DEFAULT),
    fontSize: 80,
    lineHeight: 92,
    letterSpacing: -2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border.DEFAULT,
  },
  stat: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  upNext: {
    marginTop: 14,
  },
  upNextTitle: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: 8,
    textAlign: 'auto',
  },
  upNextRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  upNextChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '48%',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.background.main,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  upNextTicket: {
    ...numericTextStyle('small', 'bold', colors.accent.dark),
  },
  upNextName: {
    flexShrink: 1,
    fontSize: 12,
    color: colors.text.primary,
  },
  closedHint: {
    marginTop: 14,
    fontSize: 13,
    color: colors.status.offline,
    textAlign: 'center',
  },
  actions: {
    marginTop: 16,
    gap: 10,
  },
  nextLabel: {
    fontSize: 17,
    letterSpacing: 0.5,
  },
});
