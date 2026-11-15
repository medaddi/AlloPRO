/**
 * Service catalog (FR/AR titles, price in DH, duration, availability) and
 * subscription status (90-day free trial).
 */
import { useState } from 'react';
import { BadgeCheck, Clock, Pencil, Plus, Trash2 } from 'lucide-react';

import type { Pro, Service } from '../../data/seed';
import { useT } from '../../i18n';
import { dayLabel, formatMAD, haptic, ltr } from '../../lib/utils';
import { useStore } from '../../store';
import { Button, Field, Sheet, inputClass } from '../ui';

export default function Catalog({ pro }: { pro: Pro }) {
  const { t, lang } = useT();
  const upsert = useStore((s) => s.upsertService);
  const [editing, setEditing] = useState<Service | null | 'new'>(null);
  const end = new Date(pro.subscriptionEnd);
  const daysLeft = Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86_400_000));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-bold">{t('catalog.title')}</h1>
        <p className="text-[13px] text-muted">{pro.services.length} services</p>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {pro.services.map((s) => (
          <article key={s.id} className={`card flex items-center gap-3 p-4 ${s.active ? '' : 'opacity-60'}`}>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="truncate font-bold">{s.title_fr}</p>
              <p className="truncate font-ar text-[13px] font-semibold text-muted">{s.title_ar}</p>
              <p className="flex items-center gap-2.5 text-sm">
                <span className="ltr font-bold text-accent">{formatMAD(s.price)}</span>
                <span className="inline-flex items-center gap-1 text-xs text-muted">
                  <Clock size={13} /> <span className="ltr">{s.duration} min</span>
                </span>
              </p>
            </div>
            <button
              role="switch"
              aria-checked={s.active}
              aria-label={s.active ? t('catalog.active') : t('catalog.hidden')}
              onClick={() => {
                haptic(10);
                upsert(pro.id, { ...s, active: !s.active });
              }}
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${s.active ? 'bg-teal' : 'bg-hair'}`}
              dir="ltr"
            >
              <span className={`absolute top-[3px] h-[22px] w-[22px] rounded-full shadow transition-all ${s.active ? 'left-[23px] bg-accent' : 'left-[3px] bg-white'}`} />
            </button>
            <button onClick={() => setEditing(s)} className="press grid h-9 w-9 place-items-center rounded-full bg-canvas" aria-label={t('catalog.edit')}>
              <Pencil size={15} />
            </button>
          </article>
        ))}
      </div>
      <Button icon={Plus} onClick={() => setEditing('new')}>
        {t('catalog.add')}
      </Button>

      <section className="card space-y-2 border-open p-5">
        <p className="text-[13px] font-semibold text-muted">{t('catalog.subscription')}</p>
        <p className="flex items-center gap-2 font-bold">
          <BadgeCheck size={22} className="text-open" /> {t('catalog.subActive', { date: dayLabel(end, lang) })}
        </p>
        <p className="text-sm font-semibold text-open">{t('catalog.trial', { n: ltr(daysLeft) })}</p>
        <p className="text-xs text-muted">{t('catalog.renew')}</p>
      </section>

      <ServiceSheet pro={pro} service={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

function ServiceSheet({ pro, service, onClose }: { pro: Pro; service: Service | null | 'new'; onClose: () => void }) {
  const { t } = useT();
  const upsert = useStore((s) => s.upsertService);
  const remove = useStore((s) => s.deleteService);
  const editing = service && service !== 'new' ? service : null;
  const [form, setForm] = useState({ fr: '', ar: '', price: '', duration: '30' });
  const [error, setError] = useState(false);
  const [lastId, setLastId] = useState<string | null>(null);

  const key = service === 'new' ? 'new' : (service?.id ?? null);
  if (key !== lastId) {
    setLastId(key);
    setError(false);
    setForm(editing ? { fr: editing.title_fr, ar: editing.title_ar, price: String(editing.price), duration: String(editing.duration) } : { fr: '', ar: '', price: '', duration: '30' });
  }

  const save = () => {
    const price = Number(form.price.replace(',', '.'));
    const duration = parseInt(form.duration, 10);
    if ((!form.fr.trim() && !form.ar.trim()) || !Number.isFinite(price) || price <= 0 || !Number.isFinite(duration) || duration < 5) {
      setError(true);
      haptic(30);
      return;
    }
    upsert(pro.id, {
      id: editing?.id ?? `s-${Date.now().toString(36)}`,
      title_fr: form.fr.trim() || form.ar.trim(),
      title_ar: form.ar.trim() || form.fr.trim(),
      price,
      duration,
      active: editing?.active ?? true,
    });
    onClose();
  };

  return (
    <Sheet
      open={service !== null}
      onClose={onClose}
      title={editing ? t('catalog.edit') : t('catalog.add')}
      footer={
        <div className="space-y-1.5">
          <Button onClick={save}>{t('common.save')}</Button>
          {editing && (
            <Button
              variant="danger"
              compact
              icon={Trash2}
              onClick={() => {
                remove(pro.id, editing.id);
                onClose();
              }}
            >
              {t('common.delete')}
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {error && <p className="text-sm font-semibold text-closed">{t('catalog.invalid')}</p>}
        <Field label={t('catalog.titleFr')}>
          <input className={inputClass} value={form.fr} onChange={(e) => setForm({ ...form, fr: e.target.value })} placeholder="Coupe + Barbe" />
        </Field>
        <Field label={t('catalog.titleAr')}>
          <input className={`${inputClass} font-ar`} dir="rtl" value={form.ar} onChange={(e) => setForm({ ...form, ar: e.target.value })} placeholder="حلاقة + لحية" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('catalog.price')}>
            <input className={`${inputClass} ltr`} inputMode="decimal" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value.replace(/[^0-9.,]/g, '') })} placeholder="50" />
          </Field>
          <Field label={t('catalog.duration')}>
            <input className={`${inputClass} ltr`} inputMode="numeric" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value.replace(/\D/g, '') })} />
          </Field>
        </div>
      </div>
    </Sheet>
  );
}
