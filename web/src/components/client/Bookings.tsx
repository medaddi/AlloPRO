/**
 * My bookings & live tracker: status stepper, WhatsApp/Call unlocked once
 * confirmed, cancel, live queue banner for active tickets.
 */
import { useMemo, useState } from 'react';
import { CalendarX2, Check, Lock, MessageCircle, Phone, X } from 'lucide-react';

import type { Booking, BookingStatus } from '../../data/seed';
import { useT } from '../../i18n';
import { clientToProMessage, formatMAD, haptic, ltr, waLink, whenLabel } from '../../lib/utils';
import { useStore } from '../../store';
import { CATEGORY_ICONS, LiveQueueBanner, StatusPill } from '../ui';

const ACTIVE: BookingStatus[] = ['pending', 'confirmed', 'in_progress'];
const TONE: Record<BookingStatus, 'wait' | 'open' | 'accent' | 'primary' | 'closed'> = {
  pending: 'wait',
  confirmed: 'open',
  in_progress: 'accent',
  completed: 'primary',
  cancelled: 'closed',
};

export default function Bookings() {
  const { t } = useT();
  const bookings = useStore((s) => s.bookings);
  const [tab, setTab] = useState<'active' | 'past'>('active');
  const mine = useMemo(() => bookings.filter((b) => b.mine).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [bookings]);
  const active = mine.filter((b) => ACTIVE.includes(b.status));
  const past = mine.filter((b) => !ACTIVE.includes(b.status));
  const list = tab === 'active' ? active : past;

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <h1 className="text-[22px] font-bold">{t('home.bookings')}</h1>
      <div className="flex rounded-btn border border-hair bg-white p-1">
        {(['active', 'past'] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`press flex h-10 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-semibold ${tab === k ? 'bg-primary text-white' : 'text-muted'}`}
          >
            {k === 'active' ? t('bookings.active') : t('bookings.past')}
            <span className={`ltr grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold text-white ${tab === k ? 'bg-accent' : 'bg-teal'}`}>
              {k === 'active' ? active.length : past.length}
            </span>
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 px-6 py-12 text-center">
          <CalendarX2 size={30} className="text-accent" />
          <p className="text-sm text-muted">{t('bookings.empty')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((b) => (
            <BookingCard key={b.id} booking={b} />
          ))}
        </div>
      )}
    </div>
  );
}

function BookingCard({ booking }: { booking: Booking }) {
  const { t, lang } = useT();
  const pro = useStore((s) => s.pros.find((p) => p.id === booking.proId));
  const me = useStore((s) => s.me);
  const cancel = useStore((s) => s.cancelBooking);
  const openPro = useStore((s) => s.openPro);
  if (!pro) return null;
  const Icon = CATEGORY_ICONS[pro.category];
  const service = pro.services.find((s) => s.id === booking.serviceId);
  const isActive = ACTIVE.includes(booking.status);
  const isSos = booking.type === 'ondemand';
  const steps: BookingStatus[] = booking.type === 'queue' ? ['confirmed', 'in_progress', 'completed'] : ['pending', 'confirmed', 'in_progress', 'completed'];
  const current = steps.indexOf(booking.status);
  const label = (s: BookingStatus) => (isSos && s === 'in_progress' ? t('status.on_the_way') : t(`status.${s}`));
  const unlocked = booking.status === 'confirmed' || booking.status === 'in_progress';

  return (
    <div className="card space-y-3 p-4">
      {isActive && booking.type === 'queue' && <LiveQueueBanner booking={booking} />}
      <button onClick={() => openPro(pro.id)} className="flex w-full items-center gap-3 text-start">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-teal-soft">
          <Icon size={22} className="text-primary" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-bold">{pro.name}</span>
          <span className="block truncate text-[13px] text-muted">
            {service ? (lang === 'ar' ? service.title_ar : service.title_fr) : ''}
            {booking.price > 0 && <> • <span className="ltr">{formatMAD(booking.price)}</span></>}
          </span>
        </span>
        <StatusPill tone={TONE[booking.status]}>{label(booking.status)}</StatusPill>
      </button>
      <div className="text-sm font-semibold text-primary">
        {booking.ticket != null && <span>{t('bookings.ticket', { t: ltr(`#${booking.ticket}`) })}</span>}
        {booking.scheduledAt && <span>{whenLabel(new Date(booking.scheduledAt), lang, t('common.today'), t('common.tomorrow'))}</span>}
        {isSos && booking.address && <span className="font-medium text-muted">{booking.address}</span>}
      </div>

      {isActive && (
        <ol className="flex" aria-label="progress">
          {steps.map((s, i) => {
            const done = i <= current;
            return (
              <li key={s} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex w-full items-center">
                  <span className={`h-[3px] flex-1 ${i === 0 ? 'opacity-0' : done ? 'bg-accent' : 'bg-hair'}`} />
                  <span className={`grid h-[18px] w-[18px] place-items-center rounded-full ${done ? 'bg-accent' : 'bg-hair'} ${i === current ? 'ring-4 ring-accent-soft' : ''}`}>
                    {done && <Check size={10} strokeWidth={4} className="text-white" />}
                  </span>
                  <span className={`h-[3px] flex-1 ${i === steps.length - 1 ? 'opacity-0' : i < current ? 'bg-accent' : 'bg-hair'}`} />
                </div>
                <span className={`text-center text-[11px] ${done ? 'font-semibold text-primary' : 'text-faint'}`}>{label(s)}</span>
              </li>
            );
          })}
        </ol>
      )}

      {isActive && (
        <div className="flex flex-wrap gap-2">
          {unlocked ? (
            <>
              <a
                href={waLink(pro.phone, clientToProMessage(lang, pro, booking, me.name))}
                target="_blank"
                rel="noreferrer"
                onClick={() => haptic(10)}
                className="press inline-flex h-10 items-center gap-1.5 rounded-xl bg-whatsapp-soft px-3.5 text-[13px] font-bold text-whatsapp-ink"
              >
                <MessageCircle size={16} /> {t('common.whatsapp')}
              </a>
              <a href={`tel:${pro.phone}`} className="press inline-flex h-10 items-center gap-1.5 rounded-xl bg-canvas px-3.5 text-[13px] font-bold">
                <Phone size={16} /> {t('common.call')}
              </a>
            </>
          ) : (
            <span className="flex basis-full items-center gap-1.5 text-xs text-faint">
              <Lock size={13} /> {t('bookings.locked')}
            </span>
          )}
          {(booking.status === 'pending' || booking.status === 'confirmed') && (
            <button
              onClick={() => {
                haptic(20);
                cancel(booking.id);
              }}
              className="press inline-flex h-10 items-center gap-1.5 rounded-xl bg-closed-soft px-3.5 text-[13px] font-bold text-closed-ink"
            >
              <X size={16} /> {t('bookings.cancel')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
