/**
 * ALLO LM3LM — Mini-Caisse & Carnet de Kridi.
 * Today / month revenue from completed bookings, unpaid client debts with
 * WhatsApp reminders, and recently paid entries.
 */
import { useCallback, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { BookOpen, CalendarDays, CheckCircle2, MessageCircle, Plus, Sun } from 'lucide-react-native';

import KridiModal from '../../components/pro/KridiModal';
import PrimaryButton, { triggerHaptic } from '../../components/ui/PrimaryButton';
import { cardSurface, colors, getFontFamily, lineHeightFor, motion, numericTextStyle, radii } from '../../constants/theme';
import { useAppLanguage } from '../../i18n';
import { supabase, todayISODate, type KridiRow } from '../../lib/supabase';
import {
  buildKridiPaidMessage,
  formatDayLabel,
  formatMAD,
  formatMoroccanPhone,
  ltr,
  openWhatsApp,
  sendKridiReminder,
} from '../../lib/whatsapp';
import { useAppStore } from '../../store/useAppStore';

type Revenue = { today: number; todayJobs: number; month: number; monthJobs: number };

export default function CaisseScreen() {
  const insets = useSafeAreaInsets();
  const { t, lang } = useAppLanguage();
  const proProfile = useAppStore((s) => s.proProfile);
  const proId = proProfile?.id ?? null;

  const [revenue, setRevenue] = useState<Revenue>({ today: 0, todayJobs: 0, month: 0, monthJobs: 0 });
  const [kridi, setKridi] = useState<KridiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    if (!proId) return;
    setLoading(true);
    const now = new Date();
    const today = todayISODate(now);
    const monthStart = todayISODate(new Date(now.getFullYear(), now.getMonth(), 1));

    const [bookingsRes, kridiRes] = await Promise.all([
      supabase
        .from('bookings')
        .select('total_price_mad, booking_date')
        .eq('pro_id', proId)
        .eq('status', 'completed')
        .gte('booking_date', monthStart)
        .lte('booking_date', today),
      supabase.from('pro_kridi').select('*').eq('pro_id', proId).order('created_at', { ascending: false }).limit(200),
    ]);

    if (!bookingsRes.error) {
      const next: Revenue = { today: 0, todayJobs: 0, month: 0, monthJobs: 0 };
      for (const b of bookingsRes.data ?? []) {
        const amount = Number(b.total_price_mad) || 0;
        next.month += amount;
        next.monthJobs += 1;
        if (b.booking_date === today) {
          next.today += amount;
          next.todayJobs += 1;
        }
      }
      setRevenue(next);
    }
    if (!kridiRes.error) setKridi(kridiRes.data ?? []);
    setLoading(false);
  }, [proId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const unpaid = kridi.filter((k) => !k.is_paid);
  const recentlyPaid = kridi.filter((k) => k.is_paid).slice(0, 5);
  const unpaidTotal = unpaid.reduce((sum, k) => sum + (Number(k.amount_mad) || 0), 0);

  /* -------------------------------- actions ------------------------------- */
  const remind = async (entry: KridiRow) => {
    if (!entry.client_phone || !proProfile) return;
    const ok = await sendKridiReminder(entry.client_phone, {
      lang,
      businessName: proProfile.business_name,
      clientName: entry.client_name,
      amount: Number(entry.amount_mad),
      since: new Date(entry.created_at),
      note: entry.note,
    });
    if (!ok) Alert.alert(t('common.error'), t('errors.whatsappUnavailable'));
  };

  const markPaid = (entry: KridiRow) => {
    Alert.alert(
      t('caisse.markPaid'),
      t('caisse.markPaidConfirm', { amount: ltr(formatMAD(Number(entry.amount_mad))), name: entry.client_name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: async () => {
            setKridi((list) => list.map((k) => (k.id === entry.id ? { ...k, is_paid: true } : k)));
            const { error } = await supabase.from('pro_kridi').update({ is_paid: true }).eq('id', entry.id);
            if (error) {
              setKridi((list) => list.map((k) => (k.id === entry.id ? { ...k, is_paid: false } : k)));
              Alert.alert(t('common.error'), t('errors.generic'));
              return;
            }
            triggerHaptic('success');
            if (entry.client_phone && proProfile) {
              const phone = entry.client_phone;
              Alert.alert(t('caisse.paid'), t('caisse.sendThanks'), [
                { text: t('common.no'), style: 'cancel' },
                {
                  text: t('common.whatsapp'),
                  onPress: () =>
                    openWhatsApp(
                      phone,
                      buildKridiPaidMessage({
                        lang,
                        businessName: proProfile.business_name,
                        clientName: entry.client_name,
                        amount: Number(entry.amount_mad),
                      }),
                    ),
                },
              ]);
            }
          },
        },
      ],
    );
  };

  if (!proProfile) return null;

  const fontBold = getFontFamily(lang, 'bold');
  const fontSemi = getFontFamily(lang, 'semibold');
  const fontMedium = getFontFamily(lang, 'medium');

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={loading && kridi.length > 0}
            onRefresh={load}
            tintColor={colors.accent.DEFAULT}
            colors={[colors.accent.DEFAULT]}
          />
        }
      >
        <Text style={[styles.title, { fontFamily: fontBold, lineHeight: lineHeightFor(22, lang) }]}>{t('caisse.title')}</Text>

        <Text style={[styles.sectionLabel, { fontFamily: fontSemi }]}>{t('caisse.revenue')}</Text>
        <View style={styles.statsRow}>
          <StatCard
            Icon={Sun}
            label={t('caisse.today')}
            amount={revenue.today}
            caption={t('caisse.jobs', { count: revenue.todayJobs })}
            highlight
          />
          <StatCard
            Icon={CalendarDays}
            label={t('caisse.month')}
            amount={revenue.month}
            caption={t('caisse.jobs', { count: revenue.monthJobs })}
          />
        </View>

        <View style={styles.kridiHeader}>
          <View style={styles.kridiTitleRow}>
            <BookOpen size={20} color={colors.primary.DEFAULT} />
            <Text style={[styles.kridiTitle, { fontFamily: fontBold, lineHeight: lineHeightFor(17, lang) }]}>
              {t('caisse.kridi')}
            </Text>
          </View>
          <View style={styles.totalBox}>
            <Text style={[styles.totalLabel, { fontFamily: fontMedium }]}>
              {t('caisse.kridiTotal')} • {t('caisse.openCount', { count: unpaid.length })}
            </Text>
            <Text style={styles.totalAmount}>{formatMAD(unpaidTotal)}</Text>
          </View>
        </View>

        {unpaid.length === 0 && !loading ? (
          <View style={styles.empty}>
            <CheckCircle2 size={28} color={colors.status.online} />
            <Text style={[styles.emptyText, { fontFamily: fontMedium }]}>{t('caisse.emptyKridi')}</Text>
          </View>
        ) : (
          unpaid.map((entry, i) => (
            <Animated.View key={entry.id} entering={FadeInDown.delay(Math.min(i, 8) * 35).duration(260)} layout={LinearTransition.springify()}>
              <View style={styles.kridiCard}>
                <View style={styles.kridiTop}>
                  <View style={styles.avatar}>
                    <Text style={[styles.avatarText, { fontFamily: fontBold }]}>
                      {entry.client_name.trim().charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text
                      numberOfLines={1}
                      style={[styles.kridiName, { fontFamily: fontBold, lineHeight: lineHeightFor(15, lang) }]}
                    >
                      {entry.client_name}
                    </Text>
                    <Text style={[styles.kridiMeta, { fontFamily: fontMedium }]}>
                      {t('caisse.since', { date: formatDayLabel(new Date(entry.created_at), lang) })}
                    </Text>
                    {!!entry.client_phone && <Text style={styles.kridiPhone}>{formatMoroccanPhone(entry.client_phone)}</Text>}
                  </View>
                  <Text style={styles.kridiAmount}>{formatMAD(Number(entry.amount_mad))}</Text>
                </View>
                {!!entry.note && (
                  <Text style={[styles.kridiNote, { fontFamily: fontMedium, lineHeight: lineHeightFor(13, lang) }]}>
                    {entry.note}
                  </Text>
                )}
                <View style={styles.kridiActions}>
                  {!!entry.client_phone && (
                    <SmallButton
                      Icon={MessageCircle}
                      label={t('caisse.reminder')}
                      bg="#E8F8EE"
                      fg="#128C4B"
                      onPress={() => remind(entry)}
                    />
                  )}
                  <SmallButton
                    Icon={CheckCircle2}
                    label={t('caisse.markPaid')}
                    bg={colors.status.onlineSoft}
                    fg="#0B7F5A"
                    onPress={() => markPaid(entry)}
                  />
                </View>
              </View>
            </Animated.View>
          ))
        )}

        {recentlyPaid.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { fontFamily: fontSemi, marginTop: 22 }]}>{t('caisse.recentlyPaid')}</Text>
            {recentlyPaid.map((entry) => (
              <View key={entry.id} style={styles.paidRow}>
                <CheckCircle2 size={16} color={colors.status.online} />
                <Text numberOfLines={1} style={[styles.paidName, { fontFamily: fontMedium }]}>
                  {entry.client_name}
                </Text>
                <Text style={styles.paidAmount}>{formatMAD(Number(entry.amount_mad))}</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <View style={styles.bottom}>
        <PrimaryButton title={t('caisse.addKridi')} icon={Plus} onPress={() => setModalOpen(true)} />
      </View>

      <KridiModal
        visible={modalOpen}
        proId={proProfile.id}
        onClose={() => setModalOpen(false)}
        onSaved={(entry) => {
          setModalOpen(false);
          setKridi((list) => [entry, ...list]);
        }}
      />
    </View>
  );
}

/* -------------------------------------------------------------------------- */

function StatCard({
  Icon,
  label,
  amount,
  caption,
  highlight = false,
}: {
  Icon: typeof Sun;
  label: string;
  amount: number;
  caption: string;
  highlight?: boolean;
}) {
  const { lang } = useAppLanguage();
  const fg = highlight ? colors.text.inverse : colors.text.primary;
  const sub = highlight ? colors.secondary.tealLight : colors.text.secondary;
  return (
    <View style={[styles.stat, highlight && styles.statHighlight]}>
      <View style={styles.statTop}>
        <Icon size={16} color={highlight ? colors.accent.DEFAULT : colors.primary.DEFAULT} />
        <Text style={[styles.statLabel, { color: sub, fontFamily: getFontFamily(lang, 'semibold') }]}>{label}</Text>
      </View>
      <Text style={[styles.statAmount, { color: fg }]} numberOfLines={1} adjustsFontSizeToFit>
        {formatMAD(amount)}
      </Text>
      <Text style={[styles.statCaption, { color: sub, fontFamily: getFontFamily(lang, 'medium') }]}>{caption}</Text>
    </View>
  );
}

function SmallButton({
  Icon,
  label,
  bg,
  fg,
  onPress,
}: {
  Icon: typeof Sun;
  label: string;
  bg: string;
  fg: string;
  onPress: () => void;
}) {
  const { lang } = useAppLanguage();
  return (
    <Pressable
      onPress={() => {
        triggerHaptic('light');
        onPress();
      }}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.smallButton,
        { backgroundColor: bg },
        pressed && { transform: [{ scale: motion.pressScale }] },
      ]}
    >
      <Icon size={16} color={fg} strokeWidth={2.4} />
      <Text style={[styles.smallButtonText, { color: fg, fontFamily: getFontFamily(lang, 'bold') }]}>{label}</Text>
    </Pressable>
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
    paddingBottom: 28,
  },
  title: {
    fontSize: 22,
    color: colors.text.primary,
    textAlign: 'auto',
  },
  sectionLabel: {
    marginTop: 18,
    marginBottom: 10,
    fontSize: 13,
    color: colors.text.secondary,
    textAlign: 'auto',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  stat: {
    ...cardSurface,
    flex: 1,
    padding: 14,
    gap: 6,
  },
  statHighlight: {
    backgroundColor: colors.primary.DEFAULT,
    borderColor: colors.primary.DEFAULT,
  },
  statTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statLabel: {
    fontSize: 13,
  },
  statAmount: {
    ...numericTextStyle('headline', 'bold'),
  },
  statCaption: {
    fontSize: 12,
    textAlign: 'auto',
  },
  kridiHeader: {
    marginTop: 26,
    marginBottom: 12,
    gap: 10,
  },
  kridiTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  kridiTitle: {
    fontSize: 17,
    color: colors.text.primary,
  },
  totalBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: radii.card,
    backgroundColor: colors.status.offlineSoft,
  },
  totalLabel: {
    flex: 1,
    fontSize: 13,
    color: '#C02E2E',
    textAlign: 'auto',
  },
  totalAmount: {
    ...numericTextStyle('title', 'bold', colors.status.offline),
  },
  empty: {
    ...cardSurface,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  kridiCard: {
    ...cardSurface,
    padding: 14,
    marginBottom: 10,
  },
  kridiTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.secondary.tealLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    color: colors.primary.DEFAULT,
  },
  kridiName: {
    fontSize: 15,
    color: colors.text.primary,
    textAlign: 'auto',
  },
  kridiMeta: {
    fontSize: 12,
    color: colors.text.secondary,
    textAlign: 'auto',
  },
  kridiPhone: {
    ...numericTextStyle('small', 'medium', colors.text.secondary),
    textAlign: 'auto',
  },
  kridiAmount: {
    ...numericTextStyle('title', 'bold', colors.status.offline),
  },
  kridiNote: {
    marginTop: 10,
    fontSize: 13,
    color: colors.text.primary,
    backgroundColor: colors.background.main,
    borderRadius: 10,
    padding: 8,
    textAlign: 'auto',
  },
  kridiActions: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
  },
  smallButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 42,
    borderRadius: 12,
  },
  smallButtonText: {
    fontSize: 13,
  },
  paidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.DEFAULT,
  },
  paidName: {
    flex: 1,
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'auto',
  },
  paidAmount: {
    ...numericTextStyle('body', 'semibold', colors.text.secondary),
  },
  bottom: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border.DEFAULT,
    backgroundColor: colors.background.main,
  },
});
