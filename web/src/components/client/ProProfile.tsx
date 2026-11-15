/**
 * Pro profile + 3-engine dynamic booking:
 *   queue       → "Prendre mon ticket (#15) / شد النوبة" → Success confetti
 *   appointment → 7-day strip + 30-min grid 09:00–20:00 → "Confirmer le RDV"
 *   ondemand    → GPS pin dropper + issue note + photo → Radar overlay
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { BadgeCheck, Camera, Check, Clock, ImagePlus, LocateFixed, MapPin, Navigation, Siren, Star, Ticket, X } from 'lucide-react';

import { categoryOf } from '../../data/seed';
import { useT } from '../../i18n';
import { buildSlots } from '../../lib/slots';
import { directionsLink, downscaleImage, formatMAD, formatTime, haptic, isSameDay, ltr, shortDay } from '../../lib/utils';
import { useVisiblePros } from '../../lib/useVisiblePros';
import { AVG_SERVICE_MIN, engineOf, useStore, waitingOf } from '../../store';
import { Button, CATEGORY_ICONS, Field, Sheet, StatusPill, inputClass } from '../ui';

export default function ProProfile() {
  const { t, lang } = useT();
  const openId = useStore((s) => s.ui.openProId);
  const pro = useStore((s) => s.pros.find((p) => p.id === openId));
  const bookings = useStore((s) => s.bookings);
  const openPro = useStore((s) => s.openPro);
  const takeTicket = useStore((s) => s.takeTicket);
  const bookAppointment = useStore((s) => s.bookAppointment);
  const requestSos = useStore((s) => s.requestSos);
  const showToast = useStore((s) => s.showToast);
  const { origin } = useVisiblePros();

  const [serviceId, setServiceId] = useState<string | null>(null);
  const [day, setDay] = useState(() => startOfDay(new Date()));
  const [slot, setSlot] = useState<Date | null>(null);
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!pro) return;
    setServiceId(pro.services.find((s) => s.active)?.id ?? null);
    setDay(startOfDay(new Date()));
    setSlot(null);
    setPin({ lat: pro.lat + 0.004, lng: pro.lng - 0.006 });
    setAddress('');
    setNotes('');
    setPhoto(null);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId]);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => startOfDay(new Date(Date.now() + i * 86_400_000))), []);
  const service = pro?.services.find((s) => s.id === serviceId) ?? null;
  const slots = useMemo(() => (pro ? buildSlots(day, service?.duration ?? 30, pro, bookings) : []), [pro, day, service, bookings]);

  if (!pro) return null;
  const engine = engineOf(pro);
  const cat = categoryOf(pro.category);
  const Icon = CATEGORY_ICONS[pro.category];
  const waiting = waitingOf(pro);
  const myTicket = bookings.find((b) => b.mine && b.proId === pro.id && b.type === 'queue' && ['confirmed', 'in_progress', 'pending'].includes(b.status));
  const hood = lang === 'ar' ? pro.neighborhood_ar : pro.neighborhood_fr;
  const distance = Math.hypot((pro.lat - origin.lat) * 110.57, (pro.lng - origin.lng) * 92.5);

  const onTicket = () => {
    const r = takeTicket(pro.id, serviceId);
    if (!r.ok) setError(r.error === 'closed' ? t('profile.closedNow') : t('profile.alreadyInQueue', { t: ltr(`#${myTicket?.ticket ?? ''}`) }));
  };
  const onAppointment = () => {
    if (!slot) return;
    const highlight = `${isSameDay(slot, new Date()) ? t('common.today') : shortDay(slot, lang) + ' ' + slot.getDate()} • ${ltr(formatTime(slot))}${service ? ` • ${ltr(formatMAD(service.price))}` : ''}`;
    const r = bookAppointment(pro.id, serviceId, slot, highlight);
    if (!r.ok) setError(t('profile.noSlots'));
  };
  const onSos = () => {
    if (!pin || address.trim().length < 3 || notes.trim().length < 3) {
      setError(t('profile.required'));
      haptic(30);
      return;
    }
    requestSos(pro.id, serviceId, { lat: pin.lat, lng: pin.lng, address: address.trim(), notes: notes.trim(), photo: photo ?? undefined });
  };
  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setPin({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => showToast(t('profile.pinHint')),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const footer = (
    <div className="space-y-2.5">
      {error && <p className="text-center text-sm font-semibold text-closed">{error}</p>}
      {engine === 'queue' && (
        <>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Ticket size={18} className="text-accent" />
            <span className="flex-1">{waiting === 0 ? t('profile.nobody') : waiting === 1 ? t('profile.ahead1') : t('profile.aheadN', { n: ltr(waiting) })}</span>
            {waiting > 0 && (
              <span className="inline-flex items-center gap-1 text-muted">
                <Clock size={14} />
                <span className="ltr">~{waiting * AVG_SERVICE_MIN} min</span>
              </span>
            )}
          </div>
          {myTicket ? (
            <Button variant="secondary" icon={Check} disabled>
              {t('profile.alreadyInQueue', { t: ltr(`#${myTicket.ticket}`) })}
            </Button>
          ) : (
            <Button icon={Ticket} disabled={!pro.isOpen} onClick={onTicket} sub={pro.isOpen ? t('profile.takeTicketAr') : undefined}>
              {pro.isOpen ? t('profile.takeTicket', { t: ltr(`#${pro.lastTicket + 1}`) }) : t('profile.closedNow')}
            </Button>
          )}
        </>
      )}
      {engine === 'appointment' && (
        <>
          {slot && (
            <p className="text-center text-sm font-semibold text-primary">
              {isSameDay(slot, new Date()) ? t('common.today') : `${shortDay(slot, lang)} ${slot.getDate()}`} • <span className="ltr">{formatTime(slot)}</span>
              {service && <> • <span className="ltr">{formatMAD(service.price)}</span></>}
            </p>
          )}
          <Button icon={Check} disabled={!slot} onClick={onAppointment} sub={t('profile.confirmRdvAr')}>
            {t('profile.confirmRdv')}
          </Button>
        </>
      )}
      {engine === 'ondemand' && (
        <Button icon={Siren} disabled={!pro.isOpen} onClick={onSos} sub={t('profile.requestAr')}>
          {pro.isOpen ? t('profile.request') : t('profile.closedNow')}
        </Button>
      )}
    </div>
  );

  return (
    <Sheet open onClose={() => openPro(null)} title={t(`profile.engine.${engine}`)} footer={footer} wide>
      <div className="space-y-5">
        {/* Identity */}
        <div className="flex gap-4">
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-[18px] bg-teal-soft">
            <Icon size={36} className="text-primary" />
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <h3 className="text-xl font-bold leading-tight">{pro.name}</h3>
              {pro.verified && <BadgeCheck size={20} className="shrink-0 text-accent" />}
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
              <span className="inline-flex items-center gap-1 font-bold text-primary">
                <Star size={14} className="fill-accent text-accent" />
                <span className="ltr">{pro.rating.toFixed(1)}</span>
              </span>
              <span>{t('profile.reviews', { n: pro.ratingCount })}</span>
              <span>• {lang === 'ar' ? cat.name_ar : cat.name_fr}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusPill tone={pro.isOpen ? 'open' : 'closed'} pulse={pro.isOpen}>
                {pro.isOpen ? t('card.open') : t('card.closed')}
                {engine === 'queue' && pro.isOpen && ` • ${t('card.waiting', { n: waiting })}`}
              </StatusPill>
            </div>
          </div>
        </div>
        <a href={directionsLink(pro.lat, pro.lng, 'google')} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl bg-canvas px-3 py-2.5 text-sm">
          <MapPin size={16} className="shrink-0 text-teal-dark" />
          <span className="flex-1">
            {pro.address}, {hood} • <span className="ltr">{distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`}</span>
          </span>
          <Navigation size={16} className="text-accent" />
        </a>

        {/* Services */}
        <section>
          <h4 className="mb-2.5 text-[17px] font-bold">{t('profile.services')}</h4>
          <div className="space-y-2.5">
            {pro.services.filter((s) => s.active).map((s) => {
              const on = s.id === serviceId;
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    haptic(8);
                    setServiceId(s.id);
                  }}
                  className={`press flex w-full items-center gap-3 rounded-card border bg-white p-3.5 text-start ${on ? 'border-2 border-teal p-[13px]' : 'border-hair'}`}
                  aria-pressed={on}
                >
                  <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${on ? 'border-accent bg-accent' : 'border-hair'}`}>{on && <Check size={12} className="text-white" strokeWidth={3.5} />}</span>
                  <span className="flex-1">
                    <span className="block text-[15px] font-semibold">{lang === 'ar' ? s.title_ar : s.title_fr}</span>
                    <span className="block text-xs text-muted">{t('common.min', { n: ltr(s.duration) })}</span>
                  </span>
                  <span className="ltr text-base font-bold text-accent">{formatMAD(s.price)}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Appointment engine */}
        {engine === 'appointment' && (
          <section className="space-y-3">
            <h4 className="text-[17px] font-bold">{t('profile.chooseDay')}</h4>
            <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
              {days.map((d, i) => {
                const on = d.getTime() === day.getTime();
                return (
                  <button
                    key={d.toISOString()}
                    onClick={() => {
                      setDay(d);
                      setSlot(null);
                    }}
                    className={`press flex h-[68px] w-16 shrink-0 flex-col items-center justify-center rounded-card border ${on ? 'border-primary bg-primary text-white' : 'border-hair bg-white'}`}
                  >
                    <span className={`text-[11px] font-semibold ${on ? 'text-white' : 'text-muted'}`}>{i === 0 ? t('common.today') : shortDay(d, lang)}</span>
                    <span className="ltr text-lg font-bold">{d.getDate()}</span>
                  </button>
                );
              })}
            </div>
            <h4 className="text-[17px] font-bold">{t('profile.chooseSlot')}</h4>
            {slots.every((s) => !s.available) ? (
              <p className="text-sm text-muted">{t('profile.noSlots')}</p>
            ) : (
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6" dir="ltr">
                {slots.map((s) => {
                  const on = slot?.getTime() === s.time.getTime();
                  return (
                    <button
                      key={s.time.toISOString()}
                      disabled={!s.available}
                      onClick={() => {
                        haptic(8);
                        setSlot(s.time);
                      }}
                      className={`press h-10 rounded-full border text-sm font-bold ${
                        on ? 'border-accent bg-accent text-white' : s.available ? 'border-teal bg-white text-primary' : 'border-hair bg-canvas text-faint line-through'
                      }`}
                    >
                      {formatTime(s.time)}
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* On-demand engine */}
        {engine === 'ondemand' && pin && (
          <section className="space-y-3">
            <h4 className="text-[17px] font-bold">{t('profile.sosLocation')}</h4>
            <PinDropper center={{ lat: pro.lat, lng: pro.lng }} pin={pin} onChange={setPin} />
            <div className="flex items-center justify-between gap-2 text-xs text-muted">
              <span>{t('profile.pinHint')}</span>
              <button onClick={useMyLocation} className="press inline-flex shrink-0 items-center gap-1.5 rounded-full bg-canvas px-3 py-1.5 font-bold text-primary">
                <LocateFixed size={14} /> {t('profile.useMyLocation')}
              </button>
            </div>
            <Field label={t('profile.address')}>
              <input className={inputClass} value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t('profile.addressPh')} />
            </Field>
            <Field label={t('profile.issue')}>
              <textarea className={`${inputClass} h-24 resize-none py-3`} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('profile.issuePh')} />
            </Field>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) setPhoto(await downscaleImage(f));
              }}
            />
            {photo ? (
              <div className="relative h-44 overflow-hidden rounded-card">
                <img src={photo} alt={t('profile.photo')} className="h-full w-full object-cover" />
                <button onClick={() => setPhoto(null)} className="absolute end-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-primary/60 text-white" aria-label={t('common.delete')}>
                  <X size={16} />
                </button>
                <button onClick={() => fileRef.current?.click()} className="absolute bottom-2 start-2 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold">
                  <Camera size={14} /> {t('profile.addPhoto')}
                </button>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()} className="press flex h-24 w-full flex-col items-center justify-center gap-1.5 rounded-card border-[1.5px] border-dashed border-teal bg-white text-sm font-semibold text-muted">
                <ImagePlus size={22} className="text-teal-dark" />
                {t('profile.addPhoto')} ({t('common.optional')})
              </button>
            )}
          </section>
        )}
      </div>
    </Sheet>
  );
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Small stylized map: click/tap to drop the intervention pin. */
function PinDropper({ center, pin, onChange }: { center: { lat: number; lng: number }; pin: { lat: number; lng: number }; onChange: (p: { lat: number; lng: number }) => void }) {
  const SPAN = 0.03;
  const toXY = (p: { lat: number; lng: number }) => ({ x: 50 + ((p.lng - center.lng) / SPAN) * 50, y: 50 - ((p.lat - center.lat) / SPAN) * 50 });
  const { x, y } = toXY(pin);
  return (
    <div
      className="relative h-44 cursor-crosshair overflow-hidden rounded-card border border-hair bg-[#EEF3F2]"
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const px = ((e.clientX - r.left) / r.width) * 100;
        const py = ((e.clientY - r.top) / r.height) * 100;
        haptic(8);
        onChange({ lat: center.lat - ((py - 50) / 50) * SPAN, lng: center.lng + ((px - 50) / 50) * SPAN });
      }}
    >
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 180" preserveAspectRatio="none" aria-hidden>
        <path d="M0 110 C120 90 260 80 400 60" stroke="#FBE3D4" strokeWidth={12} fill="none" />
        <path d="M150 0 C170 60 190 120 210 180" stroke="#fff" strokeWidth={9} fill="none" />
        <path d="M300 0 C290 70 310 120 330 180" stroke="#fff" strokeWidth={7} fill="none" />
        <ellipse cx={80} cy={40} rx={46} ry={24} fill="#DCEAEA" />
      </svg>
      <div className="pointer-events-none absolute -translate-x-1/2 -translate-y-full transition-all duration-200" style={{ left: `${x}%`, top: `${y}%` }}>
        <svg width={34} height={42} viewBox="0 0 64 80" className="animate-float">
          <path d="M32 2 C16.5 2 4 14.5 4 30 C4 50 32 78 32 78 C32 78 60 50 60 30 C60 14.5 47.5 2 32 2 Z" fill="#1D4355" />
          <circle cx={32} cy={30} r={16} fill="#fff" />
          <path d="M23.5 30.5 L29.5 36.5 L41 24.5" stroke="#F08A4B" strokeWidth={5} strokeLinecap="round" fill="none" />
        </svg>
      </div>
      <span className="ltr absolute bottom-2 end-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-muted">
        {pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}
      </span>
    </div>
  );
}
