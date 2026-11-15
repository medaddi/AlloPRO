/**
 * Mini-Caisse (daily / monthly revenue from completed bookings) and
 * Carnet de Kridi (unpaid client debts, WhatsApp reminders, mark as paid).
 */
import { useMemo, useState } from 'react';
import { BookOpen, CalendarDays, CheckCircle2, MessageCircle, Plus, Sun } from 'lucide-react';

import type { Pro } from '../../data/seed';
import { useT } from '../../i18n';
import { dayLabel, formatMAD, formatPhone, haptic, kridiReminder, ltr, normalizePhone, waLink } from '../../lib/utils';
import { useStore } from '../../store';
import { Button, Field, Sheet, inputClass } from '../ui';

export default function Caisse({ pro }: { pro: Pro }) {
  const { t, lang } = useT();
  const bookings = useStore((s) => s.bookings);
  const allKridi = useStore((s) => s.kridi);
  const markPaid = useStore((s) => s.markKridiPaid);
  const [adding, setAdding] = useState(false);

  const { today, todayJobs } = useMemo(() => {
    const done = bookings.filter((b) => b.proId === pro.id && b.status === 'completed');
    return { today: done.reduce((s, b) => s + b.price, 0), todayJobs: done.length };
  }, [bookings, pro.id]);
  const kridi = allKridi.filter((k) => k.proId === pro.id);
  const unpaid = kridi.filter((k) => !k.paid);
  const paid = kridi.filter((k) => k.paid).slice(0, 5);
  const total = unpaid.reduce((s, k) => s + k.amount, 0);

  return (
    <div className="space-y-5">
      <h1 className="text-[22px] font-bold">{t('pro.caisse')}</h1>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-card bg-primary p-4 text-white shadow-card">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-teal-soft">
            <Sun size={16} className="text-accent" /> {t('caisse.today')}
          </p>
          <p className="ltr mt-1 text-2xl font-bold sm:text-3xl">{formatMAD(today)}</p>
          <p className="mt-0.5 text-xs text-teal-soft">{t('caisse.jobs', { n: ltr(todayJobs) })}</p>
        </div>
        <div className="card p-4">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-muted">
            <CalendarDays size={16} /> {t('caisse.month')}
          </p>
          <p className="ltr mt-1 text-2xl font-bold sm:text-3xl">{formatMAD(pro.monthBase + today)}</p>
          <p className="mt-0.5 text-xs text-muted">{t('caisse.jobs', { n: ltr(todayJobs + Math.round(pro.monthBase / 45)) })}</p>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <BookOpen size={20} />
          <h2 className="flex-1 text-[17px] font-bold">
            {t('caisse.kridi')} <span className="font-ar text-muted">/ كناش الكريدي</span>
          </h2>
        </div>
        <div className="flex items-center justify-between rounded-card bg-closed-soft px-4 py-3.5">
          <span className="text-[13px] font-semibold text-closed-ink">
            {t('caisse.total')} • {t('caisse.openCount', { n: ltr(unpaid.length) })}
          </span>
          <span className="ltr text-lg font-bold text-closed">{formatMAD(total)}</span>
        </div>
        {unpaid.length === 0 ? (
          <div className="card flex flex-col items-center gap-2 py-8 text-sm text-muted">
            <CheckCircle2 size={26} className="text-open" /> {t('caisse.empty')}
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {unpaid.map((k) => (
              <article key={k.id} className="card animate-sheet space-y-3 p-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-teal-soft font-bold">{k.name.charAt(0)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{k.name}</p>
                    <p className="ltr text-xs text-muted">{formatPhone(k.phone)}</p>
                    <p className="text-[11px] text-faint">{t('caisse.since', { date: dayLabel(new Date(k.createdAt), lang) })}</p>
                  </div>
                  <span className="ltr text-lg font-bold text-closed">{formatMAD(k.amount)}</span>
                </div>
                {k.note && <p className="rounded-xl bg-canvas p-2.5 text-[13px]">{k.note}</p>}
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={waLink(k.phone, kridiReminder(lang, k.name, pro.name, k.amount, new Date(k.createdAt)))}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => haptic(10)}
                    className="press inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-whatsapp-soft text-[13px] font-bold text-whatsapp-ink"
                  >
                    <MessageCircle size={16} /> {t('caisse.remind')}
                  </a>
                  <button
                    onClick={() => {
                      haptic(25);
                      markPaid(k.id);
                    }}
                    className="press inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-open-soft text-[13px] font-bold text-open-ink"
                  >
                    <CheckCircle2 size={16} /> {t('caisse.markPaid')}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
        {paid.length > 0 && (
          <div>
            <p className="mb-1 text-[13px] font-semibold text-muted">{t('caisse.recentlyPaid')}</p>
            {paid.map((k) => (
              <div key={k.id} className="flex items-center gap-2 border-b border-hair py-2.5 text-sm text-muted">
                <CheckCircle2 size={16} className="text-open" />
                <span className="flex-1">{k.name}</span>
                <span className="ltr font-semibold">{formatMAD(k.amount)}</span>
              </div>
            ))}
          </div>
        )}
        <Button icon={Plus} onClick={() => setAdding(true)}>
          {t('caisse.add')}
        </Button>
      </section>

      <AddKridiSheet open={adding} onClose={() => setAdding(false)} proId={pro.id} />
    </div>
  );
}

function AddKridiSheet({ open, onClose, proId }: { open: boolean; onClose: () => void; proId: string }) {
  const { t } = useT();
  const addKridi = useStore((s) => s.addKridi);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState(false);

  const save = () => {
    const value = Number(amount.replace(',', '.'));
    const normalized = phone.trim() ? normalizePhone(phone) : '';
    if (name.trim().length < 2 || !Number.isFinite(value) || value <= 0 || normalized === null) {
      setError(true);
      haptic(30);
      return;
    }
    addKridi({ proId, name: name.trim(), phone: normalized ?? '', amount: value, note: note.trim() });
    setName('');
    setPhone('');
    setAmount('');
    setNote('');
    setError(false);
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title={t('caisse.add')} footer={<Button onClick={save}>{t('common.save')}</Button>}>
      <div className="space-y-4">
        {error && <p className="text-sm font-semibold text-closed">{t('caisse.invalid')}</p>}
        <Field label={t('caisse.name')}>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <Field label={t('caisse.phone')}>
          <div className="flex overflow-hidden rounded-btn border-[1.5px] border-hair bg-white" dir="ltr">
            <span className="grid place-items-center bg-canvas px-3 text-sm font-bold text-muted">🇲🇦 +212</span>
            <input className="h-[52px] flex-1 px-3 outline-none" inputMode="tel" placeholder="6 61 12 34 56" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </Field>
        <Field label={t('caisse.amount')}>
          <div className="flex overflow-hidden rounded-btn border-[1.5px] border-hair bg-white" dir="ltr">
            <input className="h-[52px] flex-1 px-3 outline-none" inputMode="decimal" placeholder="80" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.,]/g, ''))} />
            <span className="grid place-items-center bg-canvas px-3 text-sm font-bold text-muted">DH</span>
          </div>
        </Field>
        <Field label={t('caisse.note')}>
          <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
    </Sheet>
  );
}
