/**
 * ALLO LM3LM web — TopNavShell: logo (rotating gear), Moroccan city pill,
 * Mode Client ⇄ Mode Pro switcher, FR | ع toggle, Animations, reset.
 */
import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, MapPin, RotateCcw, Sparkles } from 'lucide-react';

import { CITIES, cityById } from '../data/seed';
import { useT } from '../i18n';
import { haptic } from '../lib/utils';
import { useStore } from '../store';
import { GearIcon } from './anim';

export default function TopNav() {
  const { t, lang } = useT();
  const mode = useStore((s) => s.mode);
  const view = useStore((s) => s.view);
  const setMode = useStore((s) => s.setMode);
  const setLang = useStore((s) => s.setLang);
  const setView = useStore((s) => s.setView);
  const resetDemo = useStore((s) => s.resetDemo);
  const cityId = useStore((s) => s.cityId);
  const neighborhoodId = useStore((s) => s.neighborhoodId);
  const city = cityById(cityId);
  const hood = city.neighborhoods.find((n) => n.id === neighborhoodId) ?? city.neighborhoods[0];
  const label = lang === 'ar' ? `${city.name_ar} - ${hood.name_ar}` : `${city.name_fr} - ${hood.name_fr}`;

  return (
    <header className="sticky top-0 z-30 border-b border-hair bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 sm:h-16 sm:flex-nowrap sm:py-0 lg:h-[72px] lg:px-8">
        <button onClick={() => setView('app')} className="flex shrink-0 items-center gap-2" aria-label="ALLO LM3LM">
          <GearIcon className="h-7 w-7" spin />
          <span className="ltr hidden text-xl font-bold min-[420px]:inline">
            ALLO <span className="text-accent">LM3LM</span>
          </span>
        </button>

        {mode === 'client' && view === 'app' && <CityPill label={label} />}

        <div className="ms-auto flex items-center gap-2 lg:gap-3">
          <div className="flex rounded-full bg-canvas p-1" role="tablist" aria-label="Mode">
            {(['client', 'pro'] as const).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                onClick={() => {
                  haptic(10);
                  setMode(m);
                }}
                className={`press rounded-full px-3 py-2 text-xs font-bold sm:px-3.5 sm:text-[13px] ${mode === m && view === 'app' ? 'bg-primary text-white' : 'text-muted'}`}
              >
                {m === 'client' ? t('nav.client') : t('nav.pro')}
              </button>
            ))}
          </div>

          <button
            onClick={() => setView(view === 'animations' ? 'app' : 'animations')}
            className={`press hidden h-10 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-bold sm:inline-flex ${view === 'animations' ? 'border-accent bg-accent-soft text-accent-dark' : 'border-hair text-primary'}`}
          >
            <Sparkles size={16} />
            {t('nav.animations')}
          </button>

          <div className="flex rounded-full border border-hair bg-white p-[3px]" dir="ltr" role="radiogroup" aria-label="Langue">
            {(['fr', 'ar'] as const).map((l) => (
              <button
                key={l}
                role="radio"
                aria-checked={lang === l}
                onClick={() => {
                  haptic(8);
                  setLang(l);
                }}
                className={`press min-w-[40px] rounded-full px-3 py-1.5 text-[13px] font-bold ${lang === l ? 'bg-primary text-white' : 'text-muted'} ${l === 'ar' ? 'font-ar' : ''}`}
              >
                {l === 'fr' ? 'FR' : 'ع'}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              if (window.confirm(t('nav.reset'))) resetDemo();
            }}
            className="press hidden h-10 w-10 place-items-center rounded-full border border-hair text-muted lg:grid"
            title={t('nav.reset')}
            aria-label={t('nav.reset')}
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}

function CityPill({ label }: { label: string }) {
  const { lang } = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const cityId = useStore((s) => s.cityId);
  const neighborhoodId = useStore((s) => s.neighborhoodId);
  const setCity = useStore((s) => s.setCity);
  const setNeighborhood = useStore((s) => s.setNeighborhood);
  const city = cityById(cityId);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div className="relative order-last min-w-0 basis-full sm:order-none sm:basis-auto" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="press flex max-w-full items-center gap-1.5 rounded-full bg-canvas px-3 py-2 text-sm font-semibold"
        aria-expanded={open}
      >
        <MapPin size={16} className="shrink-0 text-accent" />
        <span className="truncate">{label}</span>
        <ChevronDown size={16} className="shrink-0 text-muted" />
      </button>
      {open && (
        <div className="animate-sheet absolute start-0 top-12 z-40 w-[min(92vw,380px)] rounded-card border border-hair bg-white p-4 shadow-raised">
          <div className="mb-3 flex flex-wrap gap-2">
            {CITIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setCity(c.id)}
                className={`press rounded-full border px-3 py-1.5 text-sm font-semibold ${c.id === cityId ? 'border-primary bg-primary text-white' : 'border-hair'}`}
              >
                {lang === 'ar' ? c.name_ar : c.name_fr}
              </button>
            ))}
          </div>
          <div className="space-y-1">
            {city.neighborhoods.map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  setNeighborhood(n.id);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-start text-sm font-semibold hover:bg-canvas"
              >
                <MapPin size={15} className={n.id === neighborhoodId ? 'text-accent' : 'text-faint'} />
                <span className="flex-1">{lang === 'ar' ? n.name_ar : n.name_fr}</span>
                {n.id === neighborhoodId && <Check size={16} className="text-accent" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
