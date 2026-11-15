/**
 * Stylized, undivided Morocco city map (no external tiles, no border lines):
 * pros projected around the user's neighborhood, pill markers (icon + price /
 * queue), radius filter (2 / 5 / 10 km) and a preview card with directions.
 */
import { useEffect, useRef, useState } from 'react';
import { CalendarCheck, Clock, Navigation, Route } from 'lucide-react';

import { useT } from '../../i18n';
import { formatDistance, formatMAD, directionsLink, ltr } from '../../lib/utils';
import { useVisiblePros } from '../../lib/useVisiblePros';
import { AVG_SERVICE_MIN, engineOf, useStore, waitingOf } from '../../store';
import { Button, CATEGORY_ICONS, ProCard } from '../ui';

const KM_PER_DEG_LAT = 110.57;

export default function MoroccoMap({ compact = false }: { compact?: boolean }) {
  const { t } = useT();
  const { pros, origin, city } = useVisiblePros();
  const radiusKm = useStore((s) => s.radiusKm);
  const setRadius = useStore((s) => s.setRadius);
  const selectedId = useStore((s) => s.ui.selectedMapProId);
  const select = useStore((s) => s.selectMapPro);
  const openPro = useStore((s) => s.openPro);
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 700 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setSize({ w: entry.contentRect.width, h: entry.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Zoom to fit the visible pros (min 1.2 km) so pins spread out; the radius ring scales with it.
  const sorted = pros.map((p) => p.distance).sort((a, b) => a - b);
  const typical = sorted.length ? sorted[Math.floor((sorted.length - 1) * 0.6)] : radiusKm;
  const fitKm = Math.max(1.2, Math.min(radiusKm, typical * 1.4));
  const kmPerPx = fitKm / (Math.min(size.w, size.h) * 0.4);
  const R = radiusKm / kmPerPx;
  const kmPerDegLng = 111.32 * Math.cos((origin.lat * Math.PI) / 180);
  const project = (lat: number, lng: number) => ({
    x: size.w / 2 + ((lng - origin.lng) * kmPerDegLng) / kmPerPx,
    y: size.h / 2 - ((lat - origin.lat) * KM_PER_DEG_LAT) / kmPerPx,
  });
  const selected = pros.find((p) => p.id === selectedId) ?? null;

  return (
    <div ref={ref} className="relative h-full min-h-[420px] w-full overflow-hidden bg-[#EEF3F2]" onClick={() => select(null)}>
      {/* Decorative base map */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 800" preserveAspectRatio="xMidYMid slice" aria-hidden>
        {city.coastal && (
          <>
            <path d="M0 0 H560 C510 100 450 170 360 230 C270 290 190 360 135 470 C90 560 45 690 0 760 Z" fill="#C9DEDE" />
            <path d="M560 0 C510 100 450 170 360 230 C270 290 190 360 135 470 C90 560 45 690 0 760" fill="none" stroke="#A5C4C4" strokeWidth={3} />
          </>
        )}
        <g fill="none" strokeLinecap="round">
          <path d="M120 470 C320 420 560 400 1000 330" stroke="#FBE3D4" strokeWidth={16} />
          <path d="M400 240 C450 420 500 620 560 800" stroke="#FFFFFF" strokeWidth={11} />
          <path d="M230 600 C440 560 680 540 1000 560" stroke="#FFFFFF" strokeWidth={9} />
          <path d="M650 0 C670 220 710 460 760 800" stroke="#FFFFFF" strokeWidth={9} />
          <path d="M300 760 C520 700 740 720 1000 690" stroke="#FFFFFF" strokeWidth={7} />
          <path d="M840 110 C820 320 900 540 940 800" stroke="#FFFFFF" strokeWidth={7} />
        </g>
        <ellipse cx={720} cy={430} rx={80} ry={52} fill="#DCEAEA" />
        <ellipse cx={300} cy={680} rx={60} ry={38} fill="#DCEAEA" />
      </svg>

      {/* Radius */}
      <div
        className="pointer-events-none absolute rounded-full border-2 border-dashed border-teal bg-teal/15 transition-all duration-300"
        style={{ width: R * 2, height: R * 2, left: size.w / 2 - R, top: size.h / 2 - R }}
      />
      <div className="pointer-events-none absolute" style={{ left: size.w / 2 - 9, top: size.h / 2 - 9 }} title={t('map.you')}>
        <span className="animate-ping-dot absolute h-[18px] w-[18px] rounded-full bg-blue-500/50" />
        <span className="relative block h-[18px] w-[18px] rounded-full border-[3px] border-white bg-blue-500 shadow" />
      </div>

      {/* Markers */}
      {pros.map((p) => {
        const { x, y } = project(p.lat, p.lng);
        const Icon = CATEGORY_ICONS[p.category];
        const isSel = p.id === selectedId;
        const engine = engineOf(p);
        const minPrice = Math.min(...p.services.filter((s) => s.active).map((s) => s.price));
        const label = engine === 'queue' && p.isOpen ? `${waitingOf(p)} ⏳` : formatMAD(minPrice);
        return (
          <button
            key={p.id}
            onClick={(e) => {
              e.stopPropagation();
              select(p.id);
            }}
            className="press absolute flex -translate-x-1/2 -translate-y-full flex-col items-center"
            style={{ left: x, top: y, zIndex: isSel ? 20 : p.isOpen ? 10 : 5 }}
            aria-label={p.name}
          >
            <span
              className={`flex items-center gap-1.5 rounded-[14px] border-[1.5px] px-2.5 py-1.5 text-xs font-bold shadow-card transition-transform ${
                isSel ? 'scale-110 border-accent bg-primary text-white' : 'border-teal bg-white text-primary'
              } ${p.isOpen ? '' : 'opacity-70'}`}
            >
              <Icon size={15} strokeWidth={2.4} />
              <span className="ltr">{label}</span>
              <span className={`h-2 w-2 rounded-full ${p.isOpen ? 'bg-open' : 'bg-faint'}`} />
            </span>
            <span className={`h-0 w-0 border-x-[6px] border-t-[7px] border-x-transparent ${isSel ? 'border-t-primary' : 'border-t-teal'}`} />
          </button>
        );
      })}

      {/* Radius filter */}
      <div className="absolute start-4 top-4 flex gap-1 rounded-full border border-hair bg-white p-1 shadow-card" onClick={(e) => e.stopPropagation()}>
        <span className="hidden items-center px-2 text-xs font-semibold text-muted sm:flex">{t('map.radius')}</span>
        {([2, 5, 10] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRadius(r)}
            className={`press ltr rounded-full px-3.5 py-1.5 text-[13px] font-bold ${radiusKm === r ? 'bg-primary text-white' : 'text-muted'}`}
          >
            {r} km
          </button>
        ))}
      </div>

      {/* Preview card */}
      {selected && (
        <div
          className={`animate-sheet absolute bottom-4 end-4 start-4 space-y-3 rounded-[20px] border border-hair bg-white p-4 shadow-raised ${compact ? '' : 'sm:start-auto sm:w-[390px]'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <ProCard pro={selected} distanceKm={selected.distance} onClick={() => openPro(selected.id)} />
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="chip bg-canvas">
              <Route size={14} className="text-teal-dark" />
              {t('map.distance', { d: ltr(formatDistance(selected.distance)) })}
            </span>
            {engineOf(selected) === 'queue' && selected.isOpen && (
              <span className="chip bg-canvas">
                <Clock size={14} className="text-teal-dark" />
                {t('map.wait', { min: ltr(waitingOf(selected) * AVG_SERVICE_MIN) })}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <a className="press flex h-11 items-center justify-center gap-2 rounded-btn border border-hair text-sm font-bold" href={directionsLink(selected.lat, selected.lng, 'google')} target="_blank" rel="noreferrer">
              <Navigation size={16} /> {t('map.google')}
            </a>
            <a className="press flex h-11 items-center justify-center gap-2 rounded-btn border border-hair text-sm font-bold" href={directionsLink(selected.lat, selected.lng, 'waze')} target="_blank" rel="noreferrer">
              <Navigation size={16} /> {t('map.waze')}
            </a>
          </div>
          <Button icon={CalendarCheck} onClick={() => openPro(selected.id)}>
            {t('map.book')}
          </Button>
        </div>
      )}
    </div>
  );
}
