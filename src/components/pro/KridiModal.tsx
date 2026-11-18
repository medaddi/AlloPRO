/**
 * ALLO LM3LM — Add an unpaid client debt (Carnet de Kridi).
 * Name, optional +212 phone (for WhatsApp reminders), amount in DH, note.
 */
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { fontFamilies, colors } from '../../constants/theme';
import { useAppLanguage } from '../../i18n';
import { supabase, type KridiRow } from '../../lib/supabase';
import { normalizeMoroccanPhone, toE164 } from '../../lib/whatsapp';
import PrimaryButton, { triggerHaptic } from '../ui/PrimaryButton';
import SheetModal from '../ui/SheetModal';
import TextField from '../ui/TextField';

type Props = {
  visible: boolean;
  proId: string;
  onClose: () => void;
  onSaved: (entry: KridiRow) => void;
};

type Errors = Partial<Record<'name' | 'phone' | 'amount' | 'form', string>>;

export default function KridiModal({ visible, proId, onClose, onSaved }: Props) {
  const { t } = useAppLanguage();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    if (!visible) return;
    setName('');
    setPhone('');
    setAmount('');
    setNote('');
    setErrors({});
  }, [visible]);

  const save = async () => {
    const amountValue = Number(amount.replace(',', '.'));
    const next: Errors = {};
    if (name.trim().length < 2) next.name = t('caisse.nameRequired');
    if (phone.trim() && !normalizeMoroccanPhone(phone)) next.phone = t('caisse.phoneInvalid');
    if (!Number.isFinite(amountValue) || amountValue <= 0 || amountValue > 1000000) next.amount = t('caisse.amountInvalid');
    setErrors(next);
    if (Object.keys(next).length) {
      triggerHaptic('warning');
      return;
    }

    setSaving(true);
    const { data, error } = await supabase
      .from('pro_kridi')
      .insert({
        pro_id: proId,
        client_name: name.trim().replace(/\s+/g, ' '),
        client_phone: phone.trim() ? toE164(phone) : null,
        amount_mad: Math.round(amountValue * 100) / 100,
        note: note.trim() || null,
      })
      .select('*')
      .single();
    setSaving(false);
    if (error || !data) {
      setErrors({ form: t('errors.generic') });
      return;
    }
    triggerHaptic('success');
    onSaved(data);
  };

  return (
    <SheetModal
      visible={visible}
      onClose={onClose}
      title={t('caisse.addKridi')}
      footer={<PrimaryButton title={t('common.save')} loading={saving} onPress={save} />}
    >
      <TextField
        label={t('caisse.clientName')}
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        maxLength={60}
        error={errors.name}
      />
      <TextField
        label={`${t('caisse.clientPhone')} (${t('common.optional')})`}
        value={phone}
        onChangeText={(v) => setPhone(v.replace(/[^\d+ ]/g, ''))}
        keyboardType="phone-pad"
        placeholder="6 12 34 56 78"
        ltr
        prefix={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 15 }}>🇲🇦</Text>
            <Text style={{ fontFamily: fontFamilies.fr.bold, fontSize: 15, color: colors.text.secondary }}>+212</Text>
          </View>
        }
        error={errors.phone}
      />
      <TextField
        label={t('caisse.amount')}
        value={amount}
        onChangeText={(v) => setAmount(v.replace(/[^0-9.,]/g, ''))}
        keyboardType="decimal-pad"
        placeholder="150"
        ltr
        suffix="DH"
        error={errors.amount}
      />
      <TextField
        label={t('caisse.note')}
        value={note}
        onChangeText={setNote}
        multiline
        maxLength={200}
        error={errors.form}
      />
    </SheetModal>
  );
}
