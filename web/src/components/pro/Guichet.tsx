/**
 * Pro "Live Guichet": giant OUVERT/FERMÉ toggle, queue controller
 * (CLIENT SUIVANT + walk-in) and today's appointment / SOS requests.
 */
import { useMemo, useState } from 'react';
import { ArrowRight, CalendarClock, Check, CheckCheck, MapPin, MessageCircle, Navigation, Phone, Play, Power, UserPlus, Wrench, X } from 'lucide-react';

import type { Booking, Pro } from '../../data/seed';
import { useT } from '../../i18n';
import { dayLabel, directionsLink, formatMAD, formatTime, haptic, ltr, waLink } from '../../lib/utils';
import { engineOf, useStore, waitingOf } from '../../store';
import { Button, Field, Sheet, StatusPill, inputClass } from '../ui';

export default function Guichet({ pro }: { pro: Pro }) {
  const { t, lang } = useT();
  const bookings = useStore((s) => s.bookings);
  const toggleOpen = useStore((s) => s.toggleOpen);
  const nextClient = useStore((s) => s.nextClient);
  const showToast = useStore((s) => s.showToast);
  const [walkin, setWalkin] = useState(false);
  const engine = engineOf(pro);
  const waiting = waitingOf(pro);

  const queue = useMemo(() => bookings.filter((b) => b.proId === pro.id && b.type === 'queue'), [bookings, pro.id]);
  const served = queue.filter((b) => b.status === 'completed').length;
  const upNext = queue.filter((b) => (b.ticket ?? 0) > pro.currentQueue && ['confirmed', 'pending'].includes(b.status)).sort((a, b) => (a.ticket ?? 0) - (b.ticket ?? 0)).slice(0, 4);
  const requests = useMemo(
    () =>
      bookings
        .filter((b) => b.proId === pro.id && b.type !== 'queue' && ['pending', 'confirmed', 'in_progress'].includes(b.status))
        .sort((a, b) => (a.scheduledAt ?? a.createdAt).localeCompare(b.scheduledAt ?? b.createdAt)),
    [bookings, pro.id],
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-bold">{pro.name}</h1>
        <p className="text-[13px] capitalize text-muted">{dayLabel(new Date(), lang)}</p>
      </div>

      {/* Giant status switch */}
      <button
        onClick={() => {
          haptic(pro.isOpen ? 20 : 40);
          toggleOpen(pro.id);
        }}
        role="switch"
        aria-checked={pro.isOpen}
        className={`press relative flex h-16 w-full items-center rounded-full p-1.5 transition-colors duration-300 ${pro.isOpen ? 'bg-open' : 'bg-closed'}`}
      >
        <span className={`absolute inset-0 grid place-items-center text-xl font-bold tracking-wider text-white ${pro.isOpen ? 'pe-14' : 'ps-14'}`}>
          {pro.isOpen ? `${t('pro.open')} / مفتوح` : `${t('pro.closed')} / مغلق`}
        </span>
        <span
          className={`relative z-10 grid h-[52px] w-[52px] place-items-center rounded-full bg-white shadow transition-[margin] duration-300 ${pro.isOpen ? 'ms-auto' : 'me-auto'}`}
        >
          <Power size={24} strokeWidth={2.6} className={pro.isOpen ? 'text-open' : 'text-closed'} />
        </span>
      </button>
      <p className="-mt-3 text-center text-xs text-faint">{t('pro.toggleHint')}</p>

      {engine === 'queue' ? (
        <section className="card space-y-4 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-muted">{t('pro.nowServing')}</span>
            <StatusPill tone={waiting === 0 ? 'neutral' : waiting >= 5 ? 'wait' : 'open'} pulse={waiting > 0 && pro.isOpen}>
              {waiting > 0 ? t('pro.waiting', { n: waiting }) : t('pro.emptyQueue')}
            </StatusPill>
          </div>
          <p key={pro.currentQueue} className="animate-ticket ltr text-center text-[80px] font-bold leading-none tracking-tight" aria-live="polite">
            {pro.currentQueue > 0 ? `#${pro.currentQueue}` : '—'}
          </p>
          <div className="flex justify-between border-t border-hair pt-3 text-[13px] text-muted">
            <span>{t('pro.lastTicket', { t: ltr(pro.lastTicket > 0 ? `#${pro.lastTicket}` : '—') })}</span>
            <span>{t('pro.served', { n: ltr(served) })}</span>
          </div>
          {upNext.length > 0 && (
            <div>
              <p className="mb-2 text-[13px] font-semibold text-muted">{t('pro.upNext')}</p>
              <div className="flex flex-wrap gap-2">
                {upNext.map((b) => (
                  <span key={b.id} className="inline-flex items-center gap-1.5 rounded-full border border-hair bg-canvas px-2.5 py-1 text-xs">
                    <span className="ltr font-bold text-accent-dark">#{b.ticket}</span>
                    <span className="font-medium">{b.walkin ? t('pro.walkinDefault') : b.clientName}</span>
                    {b.mine && <span className="rounded-full bg-accent px-1.5 text-[10px] font-bold text-white">AlloPro</span>}
                  </span>
                ))}
              </div>
            </div>
          )}
          {!pro.isOpen && <p className="text-center text-sm font-semibold text-closed">{t('pro.openFirst')}</p>}
          <Button
            icon={ArrowRight}
            iconEnd
            directional
            disabled={!pro.isOpen || waiting === 0}
            sub={t('pro.nextAr')}
            className="text-[17px] tracking-wide"
            onClick={() => {
              haptic(35);
              const n = nextClient(pro.id);
              if (n != null) showToast(t('pro.advanced', { t: ltr(`#${n}`) }));
            }}
          >
            {t('pro.next')}
          </Button>
          <Button variant="outline" icon={UserPlus} disabled={!pro.isOpen} sub={t('pro.walkinAr')} onClick={() => setWalkin(true)}>
            {t('pro.walkin')}
          </Button>
        </section>
      ) : (
        <p className="rounded-card bg-primary-soft px-4 py-3 text-sm font-medium">{t('pro.noQueue')}</p>
      )}

      <section className="space-y-3">
        <h2 className="text-[17px] font-bold">{t('pro.requests')}</h2>
        {requests.length === 0 ? (
          <div className="card flex flex-col items-center gap-2 py-8 text-sm text-muted">
            <CalendarClock size={26} className="text-teal-dark" />
            {t('pro.noRequests')}
          </div>
        ) : (
          requests.map((b) => <RequestCard key={b.id} booking={b} pro={pro} />)
        )}
      </section>

      <WalkinSheet open={walkin} onClose={() => setWalkin(false)} pro={pro} />
    </div>
  );
}

function RequestCard({ booking, pro }: { booking: Booking; pro: Pro }) {
  const { t, lang } = useT();
  const setStatus = useStore((s) => s.setBookingStatus);
  const isSos = booking.type === 'ondemand';
  const service = pro.services.find((s) => s.id === booking.serviceId);
  const when = booking.scheduledAt ? new Date(booking.scheduledAt) : null;
  const statusLabel = isSos && booking.status === 'in_progress' ? t('status.on_the_way') : t(`status.${booking.status}`);
  const tone = booking.status === 'pending' ? 'wait' : booking.status === 'confirmed' ? 'open' : 'accent';
  const confirmMsg =
    lang === 'ar'
      ? `السلام عليكم ${booking.clientName} 👋\n${pro.name} أكد الطلب ديالك ✅${when ? `\nالموعد: ${dayLabel(when, 'ar')} ${ltr(formatTime(when))}` : ''}\nشكرا على الثقة — AlloPro`
      : `Bonjour ${booking.clientName} 👋\n${pro.name} a confirmé votre demande ✅${when ? `\nRDV : ${dayLabel(when, 'fr')} à ${formatTime(when)}` : ''}\nMerci pour votre confiance — AlloPro`;

  const act = (status: Booking['status']) => {
    haptic(status === 'cancelled' ? 30 : 15);
    setStatus(booking.id, status);
  };

  return (
    <article className="card animate-sheet space-y-3 p-4">
      <div className="flex items-start gap-3">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-[13px] ${isSos ? 'bg-accent-soft text-accent-dark' : 'bg-teal-soft text-primary'}`}>
          {isSos ? <Wrench size={20} /> : <CalendarClock size={20} />}
        </span>
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="ltr font-bold text-accent-dark">{when ? formatTime(when) : 'SOS'}</span>
            <span className="truncate font-bold">{booking.clientName}</span>
            {booking.mine && <span className="rounded-full bg-accent px-1.5 text-[10px] font-bold text-white">AlloPro</span>}
          </div>
          <p className="text-[13px] text-muted">
            {service ? (lang === 'ar' ? service.title_ar : service.title_fr) : ''} • <span className="ltr">{formatMAD(booking.price)}</span>
            {when && <> • {dayLabel(when, lang)}</>}
          </p>
          {booking.address && (
            <p className="flex items-start gap-1 text-[13px] text-muted">
              <MapPin size={14} className="mt-0.5 shrink-0" /> {booking.address}
            </p>
          )}
        </div>
        <StatusPill tone={tone}>{statusLabel}</StatusPill>
      </div>
      {booking.notes && <p className="rounded-xl bg-canvas p-2.5 text-[13px]">{booking.notes}</p>}
      {booking.photo && <img src={booking.photo} alt="" className="h-36 w-full rounded-xl object-cover" />}
      <div className="flex flex-wrap gap-2">
        {booking.status === 'pending' ? (
          <>
            <Chip icon={Check} label={t('pro.accept')} tone="primary" onClick={() => act('confirmed')} />
            <Chip icon={X} label={t('pro.decline')} tone="danger" onClick={() => act('cancelled')} />
          </>
        ) : (
          <>
            {booking.clientPhone && (
              <>
                <a href={waLink(booking.clientPhone, confirmMsg)} target="_blank" rel="noreferrer" className="press inline-flex h-10 items-center gap-1.5 rounded-xl bg-whatsapp-soft px-3.5 text-[13px] font-bold text-whatsapp-ink">
                  <MessageCircle size={16} /> {t('common.whatsapp')}
                </a>
                <a href={`tel:${booking.clientPhone}`} className="press inline-flex h-10 items-center gap-1.5 rounded-xl bg-canvas px-3.5 text-[13px] font-bold">
                  <Phone size={16} /> {t('common.call')}
                </a>
              </>
            )}
            {isSos && booking.lat != null && booking.lng != null && (
              <a href={directionsLink(booking.lat, booking.lng, 'google')} target="_blank" rel="noreferrer" className="press inline-flex h-10 items-center gap-1.5 rounded-xl bg-canvas px-3.5 text-[13px] font-bold">
                <Navigation size={16} /> {t('common.directions')}
              </a>
            )}
            {isSos && booking.status === 'confirmed' ? (
              <Chip icon={Play} label={t('pro.start')} tone="primary" onClick={() => act('in_progress')} />
            ) : (
              <Chip icon={CheckCheck} label={t('pro.finish')} tone="primary" onClick={() => act('completed')} />
            )}
          </>
        )}
      </div>
    </article>
  );
}

function Chip({ icon: Icon, label, tone, onClick }: { icon: typeof Check; label: string; tone: 'primary' | 'danger'; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`press inline-flex h-10 items-center gap-1.5 rounded-xl px-3.5 text-[13px] font-bold ${tone === 'primary' ? 'bg-accent text-white' : 'bg-closed-soft text-closed-ink'}`}>
      <Icon size={16} strokeWidth={2.6} /> {label}
    </button>
  );
}

function WalkinSheet({ open, onClose, pro }: { open: boolean; onClose: () => void; pro: Pro }) {
  const { t, lang } = useT();
  const addWalkin = useStore((s) => s.addWalkin);
  const showToast = useStore((s) => s.showToast);
  const [name, setName] = useState('');
  const [serviceId, setServiceId] = useState<string | null>(null);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('pro.walkinTitle')}
      footer={
        <Button
          icon={UserPlus}
          onClick={() => {
            const n = addWalkin(pro.id, name.trim() || t('pro.walkinDefault'), serviceId);
            showToast(t('pro.ticketGiven', { t: ltr(`#${n}`) }));
            setName('');
            setServiceId(null);
            onClose();
          }}
        >
          {t('pro.walkinAdd')}
        </Button>
      }
    >
      <div className="space-y-4">
        <Field label={t('pro.walkinName')}>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <div className="flex flex-wrap gap-2">
          {pro.services.filter((s) => s.active).map((s) => (
            <button
              key={s.id}
              onClick={() => setServiceId(s.id === serviceId ? null : s.id)}
              className={`press rounded-full border px-3.5 py-2 text-[13px] font-semibold ${serviceId === s.id ? 'border-primary bg-primary text-white' : 'border-hair'}`}
            >
              {lang === 'ar' ? s.title_ar : s.title_fr} • <span className="ltr">{formatMAD(s.price)}</span>
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  );
}
