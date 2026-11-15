/**
 * AlloPro web — shared UI (mirrors the Figma components: Button, CategoryPill,
 * StatusPill, ProServiceCard, LiveQueueStickyBanner).
 */
import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react';
import {
  BadgeCheck,
  Car,
  ChevronRight,
  Clock,
  MapPin,
  MessageCircle,
  Scissors,
  Star,
  Stethoscope,
  Ticket,
  Trophy,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react';

import { categoryOf, type Booking, type CategorySlug, type Pro } from '../data/seed';
import { useT } from '../i18n';
import { nextAvailableSlot } from '../lib/slots';
import { clientToProMessage, formatDistance, formatMAD, haptic, ltr, waLink, whenLabel } from '../lib/utils';
import { AVG_SERVICE_MIN, engineOf, useStore, waitingOf } from '../store';

export const CATEGORY_ICONS: Record<CategorySlug, LucideIcon> = {
  coiffure: Scissors,
  sante: Stethoscope,
  bricolage: Wrench,
  auto: Car,
  sport: Trophy,
};

/* --------------------------------- Button -------------------------------- */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  icon?: LucideIcon;
  iconEnd?: boolean;
  /** Mirror arrows/chevrons in Arabic. */
  directional?: boolean;
  compact?: boolean;
  sub?: string;
};

const VARIANTS = {
  primary: 'bg-accent text-white shadow-cta hover:bg-accent-dark',
  secondary: 'bg-primary text-white hover:bg-primary-light',
  outline: 'border border-hair bg-white text-primary hover:bg-canvas',
  ghost: 'bg-transparent text-primary hover:bg-primary-soft',
  danger: 'bg-closed-soft text-closed-ink hover:bg-closed/15',
  success: 'bg-open text-white',
};

export function Button({ variant = 'primary', icon: Icon, iconEnd, directional, compact, sub, className = '', children, onClick, disabled, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled}
      onClick={(e) => {
        haptic(variant === 'primary' ? 18 : 10);
        onClick?.(e);
      }}
      className={`press inline-flex w-full items-center justify-center gap-2.5 rounded-btn px-5 font-bold disabled:pointer-events-none disabled:opacity-50 ${
        compact ? 'h-11 text-sm' : 'h-btn text-base'
      } ${VARIANTS[variant]} ${className}`}
    >
      {Icon && !iconEnd && <Icon size={20} strokeWidth={2.4} className={directional ? 'rtl:-scale-x-100' : ''} />}
      <span className="truncate">
        {children}
        {sub && <span className="ms-1.5 font-ar opacity-90"> / {sub}</span>}
      </span>
      {Icon && iconEnd && <Icon size={20} strokeWidth={2.4} className={directional ? 'rtl:-scale-x-100' : ''} />}
    </button>
  );
}

/* ------------------------------- StatusPill ------------------------------ */

export function StatusPill({ tone, children, pulse = false }: { tone: 'open' | 'wait' | 'closed' | 'neutral' | 'accent' | 'primary'; children: ReactNode; pulse?: boolean }) {
  const map = {
    open: ['bg-open-soft text-open-ink', 'bg-open'],
    wait: ['bg-wait-soft text-wait-ink', 'bg-wait'],
    closed: ['bg-closed-soft text-closed-ink', 'bg-closed'],
    neutral: ['bg-canvas text-muted', 'bg-faint'],
    accent: ['bg-accent-soft text-accent-dark', 'bg-accent'],
    primary: ['bg-primary-soft text-primary', 'bg-primary'],
  }[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${map[0]}`}>
      <span className="relative flex h-2 w-2">
        {pulse && <span className={`animate-ping-dot absolute inline-flex h-full w-full rounded-full ${map[1]}`} />}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${map[1]}`} />
      </span>
      {children}
    </span>
  );
}

/* ------------------------------ CategoryPill ----------------------------- */

export function CategoryPill({ icon: Icon, label, active, onClick }: { icon: LucideIcon; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={() => {
        haptic(8);
        onClick();
      }}
      aria-pressed={active}
      className={`press inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold ${
        active ? 'border-primary bg-primary text-white' : 'border-hair bg-white text-primary hover:border-teal'
      }`}
    >
      <Icon size={18} strokeWidth={2.2} className={active ? 'text-accent' : 'text-primary'} />
      {label}
    </button>
  );
}

/* ------------------------------ ProServiceCard ---------------------------- */

export function ProCard({ pro, distanceKm, selected, onClick }: { pro: Pro; distanceKm: number | null; selected?: boolean; onClick: () => void }) {
  const { t, lang } = useT();
  const bookings = useStore((s) => s.bookings);
  const engine = engineOf(pro);
  const Icon = CATEGORY_ICONS[pro.category];
  const minPrice = Math.min(...pro.services.filter((s) => s.active).map((s) => s.price));
  const waiting = waitingOf(pro);
  const hood = lang === 'ar' ? pro.neighborhood_ar : pro.neighborhood_fr;

  let engineLine: string;
  let EngineIcon: LucideIcon = Ticket;
  if (engine === 'queue') {
    engineLine = waiting > 0 ? t('card.queue', { cur: ltr(`#${pro.currentQueue}`), min: ltr(waiting * AVG_SERVICE_MIN) }) : t('card.queueEmpty');
  } else if (engine === 'appointment') {
    EngineIcon = Clock;
    const next = nextAvailableSlot(pro, bookings);
    engineLine = next ? t('card.appointment', { when: whenLabel(next, lang, t('common.today'), t('common.tomorrow')) }) : t('card.appointmentNone');
  } else {
    EngineIcon = MapPin;
    engineLine = t('card.ondemand', { d: ltr(formatDistance(distanceKm ?? 1.4)) });
  }

  return (
    <button
      onClick={() => {
        haptic(8);
        onClick();
      }}
      className={`press card flex w-full items-center gap-3 p-4 text-start ${selected ? 'border-2 border-teal p-[15px]' : ''}`}
    >
      <div className="relative grid h-[60px] w-[60px] shrink-0 place-items-center rounded-[14px] bg-teal-soft">
        <Icon size={28} className="text-primary" strokeWidth={2} />
        <span className={`absolute -end-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-white ${pro.isOpen ? 'bg-open' : 'bg-closed'}`} />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-1">
          <span className="truncate text-[15px] font-bold">{pro.name}</span>
          {pro.verified && <BadgeCheck size={16} className="shrink-0 text-accent" aria-label={t('card.verified')} />}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted">
          <span className="truncate">
            {hood}
            {distanceKm != null && <> • <span className="ltr">{formatDistance(distanceKm)}</span></>}
          </span>
          <span className="ms-auto inline-flex shrink-0 items-center gap-1 font-bold text-primary">
            <Star size={13} className="fill-accent text-accent" />
            <span className="ltr">
              {pro.rating.toFixed(1)} ({pro.ratingCount})
            </span>
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <EngineIcon size={14} className="shrink-0 text-accent" />
          <span className="truncate">{pro.isOpen ? engineLine : t('card.closed')}</span>
          <span className="ms-auto shrink-0 text-[13px] font-bold text-accent">{t('card.from', { price: ltr(formatMAD(minPrice)) })}</span>
        </div>
      </div>
      <ChevronRight size={18} className="shrink-0 text-faint rtl:-scale-x-100" />
    </button>
  );
}

/* --------------------------- LiveQueueStickyBanner ------------------------- */

export function LiveQueueBanner({ booking, onClick }: { booking: Booking; onClick?: () => void }) {
  const { t, lang } = useT();
  const pro = useStore((s) => s.pros.find((p) => p.id === booking.proId));
  const me = useStore((s) => s.me);
  if (!pro) return null;

  let badge = '';
  let title = '';
  let subtitle = '';
  let highlight = false;

  if (booking.type === 'queue') {
    const ticket = booking.ticket ?? 0;
    const ahead = Math.max(0, ticket - pro.currentQueue - 1);
    badge = `#${ticket}`;
    title = t('banner.yourTurn', { t: ltr(`#${ticket}`) });
    if (booking.status === 'in_progress' || pro.currentQueue >= ticket) {
      subtitle = t('banner.now');
      highlight = true;
    } else if (ahead === 0) {
      subtitle = `${t('banner.serving', { t: ltr(`#${pro.currentQueue}`) })} • ${t('banner.next')}`;
    } else {
      subtitle = `${t('banner.serving', { t: ltr(`#${pro.currentQueue}`) })} • ${ahead === 1 ? t('banner.ahead1') : t('banner.aheadN', { n: ltr(ahead) })} • ${t('banner.eta', { min: ltr(ahead * AVG_SERVICE_MIN) })}`;
    }
  } else if (booking.type === 'appointment' && booking.scheduledAt) {
    const at = new Date(booking.scheduledAt);
    badge = ltr(at.toTimeString().slice(0, 5));
    title = t('banner.rdv', { when: whenLabel(at, lang, t('common.today'), t('common.tomorrow')) });
    subtitle = booking.status === 'pending' ? t('banner.pending') : t('banner.confirmed');
  } else {
    badge = 'SOS';
    title = booking.status === 'pending' ? t('banner.sosSearching') : booking.status === 'in_progress' ? t('banner.sosInProgress') : t('banner.sosOnTheWay');
    subtitle = categoryOf(pro.category)[lang === 'ar' ? 'name_ar' : 'name_fr'];
  }

  const canContact = booking.status === 'confirmed' || booking.status === 'in_progress';

  return (
    <div
      className={`animate-sheet flex items-center gap-3 rounded-card bg-primary p-3.5 text-white shadow-raised ${highlight ? 'ring-2 ring-accent' : ''}`}
      role="status"
      aria-live="polite"
    >
      <button onClick={onClick} className="press flex min-w-0 flex-1 items-center gap-3 text-start">
        <span key={badge} className="animate-ticket ltr grid h-14 min-w-[64px] place-items-center rounded-[14px] bg-accent px-2 text-lg font-bold">
          {badge}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[11px] font-bold uppercase tracking-wide text-accent">
            {t('banner.live')} • {pro.name}
          </span>
          <span className="block truncate text-base font-bold">{title}</span>
          <span className={`block text-xs ${highlight ? 'font-semibold text-accent-soft' : 'text-teal-soft'}`}>{subtitle}</span>
        </span>
      </button>
      {canContact && (
        <a
          href={waLink(pro.phone, clientToProMessage(lang, pro, booking, me.name))}
          target="_blank"
          rel="noreferrer"
          onClick={() => haptic(10)}
          className="press grid h-11 w-11 shrink-0 place-items-center rounded-full bg-whatsapp"
          aria-label={t('common.whatsapp')}
        >
          <MessageCircle size={22} className="text-white" />
        </a>
      )}
    </div>
  );
}

/* ---------------------------------- Sheet --------------------------------- */

export function Sheet({ open, onClose, title, children, footer, wide = false }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const { t } = useT();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center" role="dialog" aria-modal aria-label={title}>
      <button className="animate-fade absolute inset-0 bg-primary/45" onClick={onClose} aria-label={t('common.close')} />
      <div className={`animate-sheet relative flex max-h-[92vh] w-full flex-col rounded-t-sheet bg-white shadow-raised sm:rounded-sheet ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'}`}>
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-hair sm:hidden" />
        <div className="flex items-start gap-3 px-5 pb-2 pt-4">
          <h2 className="flex-1 text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="press grid h-9 w-9 place-items-center rounded-full bg-canvas" aria-label={t('common.close')}>
            <X size={18} className="text-muted" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-4">{children}</div>
        {footer && <div className="border-t border-hair px-5 pb-5 pt-3">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------------------------------- Field --------------------------------- */

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-muted">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  'h-[52px] w-full rounded-btn border-[1.5px] border-hair bg-white px-3.5 text-[15px] text-primary outline-none placeholder:text-faint focus:border-teal-dark';
