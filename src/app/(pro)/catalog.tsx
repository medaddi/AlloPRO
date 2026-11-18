/**
 * ALLO LM3LM — Pro service & price catalog (MAD).
 * Add / edit / hide / delete services, bilingual titles, price in DH, duration.
 */
import { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ClipboardList, Clock, Plus, Trash2 } from 'lucide-react-native';

import PrimaryButton, { triggerHaptic } from '../../components/ui/PrimaryButton';
import SheetModal from '../../components/ui/SheetModal';
import TextField from '../../components/ui/TextField';
import { cardSurface, colors, getFontFamily, lineHeightFor, motion, numericTextStyle, radii } from '../../constants/theme';
import { useAppLanguage } from '../../i18n';
import { supabase, useServices, type ServiceRow } from '../../lib/supabase';
import { formatMAD } from '../../lib/whatsapp';
import { useAppStore } from '../../store/useAppStore';

const DURATIONS = [15, 30, 45, 60, 90, 120];

export default function CatalogScreen() {
  const insets = useSafeAreaInsets();
  const { t, lang } = useAppLanguage();
  const proId = useAppStore((s) => s.proProfile?.id ?? null);
  const { services, setServices, loading, refresh } = useServices(proId);

  const [editing, setEditing] = useState<ServiceRow | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const openNew = () => {
    setEditing(null);
    setSheetOpen(true);
  };
  const openEdit = (service: ServiceRow) => {
    setEditing(service);
    setSheetOpen(true);
  };

  const toggleActive = async (service: ServiceRow, value: boolean) => {
    triggerHaptic('light');
    setServices((list) => list.map((s) => (s.id === service.id ? { ...s, is_active: value } : s)));
    const { error } = await supabase.from('services').update({ is_active: value }).eq('id', service.id);
    if (error) {
      setServices((list) => list.map((s) => (s.id === service.id ? { ...s, is_active: !value } : s)));
      Alert.alert(t('common.error'), t('errors.generic'));
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { fontFamily: getFontFamily(lang, 'bold'), lineHeight: lineHeightFor(22, lang) }]}>
          {t('catalog.title')}
        </Text>
        <Text style={[styles.count, { fontFamily: getFontFamily(lang, 'medium') }]}>
          {t('catalog.count', { count: services.length })}
        </Text>
      </View>

      <FlatList
        data={services}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.list}
        refreshing={loading && services.length > 0}
        onRefresh={refresh}
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <ClipboardList size={28} color={colors.accent.DEFAULT} />
              </View>
              <Text
                style={[styles.emptyText, { fontFamily: getFontFamily(lang, 'medium'), lineHeight: lineHeightFor(15, lang) }]}
              >
                {t('catalog.empty')}
              </Text>
            </View>
          )
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 35).duration(280)}>
            <ServiceItem service={item} onPress={() => openEdit(item)} onToggle={(v) => toggleActive(item, v)} />
          </Animated.View>
        )}
      />

      <View style={styles.bottom}>
        <PrimaryButton title={t('catalog.add')} icon={Plus} onPress={openNew} />
      </View>

      <ServiceSheet
        visible={sheetOpen}
        service={editing}
        proId={proId}
        onClose={() => setSheetOpen(false)}
        onSaved={() => {
          setSheetOpen(false);
          refresh();
        }}
      />
    </View>
  );
}

/* -------------------------------------------------------------------------- */

function ServiceItem({
  service,
  onPress,
  onToggle,
}: {
  service: ServiceRow;
  onPress: () => void;
  onToggle: (value: boolean) => void;
}) {
  const { t, lang } = useAppLanguage();
  const title = (lang === 'ar' ? service.title_ar : service.title_fr) || service.title_fr || service.title_ar;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${t('catalog.edit')}: ${title}`}
      style={({ pressed }) => [
        styles.item,
        !service.is_active && styles.itemInactive,
        pressed && { transform: [{ scale: motion.pressScale }] },
      ]}
    >
      <View style={styles.itemMain}>
        <Text
          numberOfLines={1}
          style={[styles.itemTitle, { fontFamily: getFontFamily(lang, 'bold'), lineHeight: lineHeightFor(15, lang) }]}
        >
          {title}
        </Text>
        <View style={styles.itemMeta}>
          <Text style={styles.price}>{formatMAD(service.price_mad)}</Text>
          <View style={styles.duration}>
            <Clock size={13} color={colors.text.secondary} />
            <Text style={styles.durationText}>{`${service.duration_minutes} min`}</Text>
          </View>
        </View>
      </View>
      <View style={styles.switchWrap}>
        <Switch
          value={service.is_active}
          onValueChange={onToggle}
          trackColor={{ false: colors.border.strong, true: colors.secondary.teal }}
          thumbColor={service.is_active ? colors.accent.DEFAULT : colors.background.surface}
          accessibilityLabel={service.is_active ? t('catalog.active') : t('catalog.inactive')}
        />
        <Text style={[styles.switchLabel, { fontFamily: getFontFamily(lang, 'medium') }]}>
          {service.is_active ? t('catalog.active') : t('catalog.inactive')}
        </Text>
      </View>
    </Pressable>
  );
}

/* -------------------------------------------------------------------------- */

function ServiceSheet({
  visible,
  service,
  proId,
  onClose,
  onSaved,
}: {
  visible: boolean;
  service: ServiceRow | null;
  proId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t, lang } = useAppLanguage();
  const [titleFr, setTitleFr] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('30');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<'title' | 'price' | 'duration' | 'form', string>>>({});

  useEffect(() => {
    if (!visible) return;
    setTitleFr(service?.title_fr ?? '');
    setTitleAr(service?.title_ar ?? '');
    setPrice(service ? String(service.price_mad) : '');
    setDuration(String(service?.duration_minutes ?? 30));
    setErrors({});
  }, [visible, service]);

  const save = async () => {
    const priceValue = Number(price.replace(',', '.'));
    const durationValue = parseInt(duration, 10);
    const fr = titleFr.trim();
    const ar = titleAr.trim();
    const next: typeof errors = {};
    if (!fr && !ar) next.title = t('catalog.titleRequired');
    if (!Number.isFinite(priceValue) || priceValue < 0 || priceValue > 100000) next.price = t('catalog.priceInvalid');
    if (!Number.isFinite(durationValue) || durationValue < 5 || durationValue > 600) next.duration = t('catalog.durationInvalid');
    setErrors(next);
    if (Object.keys(next).length || !proId) {
      triggerHaptic('warning');
      return;
    }

    setSaving(true);
    // Both titles are NOT NULL in the schema: fall back to the other language.
    const payload = {
      title_fr: fr || ar,
      title_ar: ar || fr,
      price_mad: Math.round(priceValue * 100) / 100,
      duration_minutes: durationValue,
    };
    const { error } = service
      ? await supabase.from('services').update(payload).eq('id', service.id)
      : await supabase.from('services').insert({ ...payload, pro_id: proId });
    setSaving(false);
    if (error) {
      setErrors({ form: t('errors.generic') });
      return;
    }
    triggerHaptic('success');
    onSaved();
  };

  const remove = () => {
    if (!service) return;
    Alert.alert(t('catalog.deleteConfirm'), lang === 'ar' ? service.title_ar : service.title_fr, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('services').delete().eq('id', service.id);
          if (error) {
            Alert.alert(t('common.error'), t('errors.generic'));
            return;
          }
          triggerHaptic('warning');
          onSaved();
        },
      },
    ]);
  };

  return (
    <SheetModal
      visible={visible}
      onClose={onClose}
      title={service ? t('catalog.edit') : t('catalog.add')}
      footer={
        <>
          <PrimaryButton title={t('common.save')} loading={saving} onPress={save} />
          {!!service && (
            <PrimaryButton title={t('common.delete')} icon={Trash2} variant="ghost" compact onPress={remove} haptic="light" textStyle={{ color: colors.status.offline }} />
          )}
        </>
      }
    >
      <TextField
        label={t('catalog.titleFr')}
        value={titleFr}
        onChangeText={setTitleFr}
        placeholder="Coupe + Barbe"
        maxLength={60}
        error={errors.title}
      />
      <TextField label={t('catalog.titleAr')} value={titleAr} onChangeText={setTitleAr} placeholder="حلاقة + لحية" maxLength={60} />
      <TextField
        label={t('catalog.price')}
        value={price}
        onChangeText={(v) => setPrice(v.replace(/[^0-9.,]/g, ''))}
        keyboardType="decimal-pad"
        placeholder="50"
        ltr
        suffix="DH"
        error={errors.price}
      />
      <View>
        <Text style={[styles.sheetLabel, { fontFamily: getFontFamily(lang, 'semibold') }]}>{t('catalog.duration')}</Text>
        <View style={styles.durationChips}>
          {DURATIONS.map((d) => {
            const active = String(d) === duration;
            return (
              <Pressable
                key={d}
                onPress={() => setDuration(String(d))}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                style={[styles.durationChip, active && styles.durationChipActive]}
              >
                <Text style={[styles.durationChipText, active && { color: colors.text.inverse }]}>{`${d} min`}</Text>
              </Pressable>
            );
          })}
        </View>
        <TextField
          value={duration}
          onChangeText={(v) => setDuration(v.replace(/\D/g, ''))}
          keyboardType="number-pad"
          ltr
          suffix="min"
          error={errors.duration ?? errors.form}
          containerStyle={{ marginTop: 10 }}
        />
      </View>
    </SheetModal>
  );
}

/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background.main,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 22,
    color: colors.text.primary,
    textAlign: 'auto',
  },
  count: {
    fontSize: 13,
    color: colors.text.secondary,
    textAlign: 'auto',
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 10,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 14,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.accent.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  item: {
    ...cardSurface,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  itemInactive: {
    opacity: 0.6,
  },
  itemMain: {
    flex: 1,
    gap: 6,
  },
  itemTitle: {
    fontSize: 15,
    color: colors.text.primary,
    textAlign: 'auto',
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  price: {
    ...numericTextStyle('bodyLarge', 'bold', colors.accent.dark),
  },
  duration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  durationText: {
    ...numericTextStyle('small', 'medium', colors.text.secondary),
  },
  switchWrap: {
    alignItems: 'center',
    gap: 2,
  },
  switchLabel: {
    fontSize: 11,
    color: colors.text.secondary,
  },
  bottom: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border.DEFAULT,
    backgroundColor: colors.background.main,
  },
  sheetLabel: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: 8,
    textAlign: 'auto',
  },
  durationChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  durationChip: {
    paddingHorizontal: 14,
    height: 38,
    justifyContent: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.background.surface,
  },
  durationChipActive: {
    backgroundColor: colors.primary.DEFAULT,
    borderColor: colors.primary.DEFAULT,
  },
  durationChipText: {
    ...numericTextStyle('small', 'semibold', colors.text.primary),
  },
});
