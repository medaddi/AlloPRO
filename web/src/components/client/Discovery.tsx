/**
 * Client discovery panel: greeting, search, category pills, live banners,
 * and "Pros ouverts près de vous".
 */
import { useMemo } from 'react';
import { LayoutGrid, Search, SearchX, X } from 'lucide-react';

import { CATEGORIES } from '../../data/seed';
import { useT } from '../../i18n';
import { useVisiblePros } from '../../lib/useVisiblePros';
import { useStore } from '../../store';
import { CATEGORY_ICONS, CategoryPill, LiveQueueBanner, ProCard } from '../ui';

export default function Discovery() {
  const { t, lang } = useT();
  const me = useStore((s) => s.me);
  const query = useStore((s) => s.query);
  const setQuery = useStore((s) => s.setQuery);
  const category = useStore((s) => s.category);
  const setCategory = useStore((s) => s.setCategory);
  const openPro = useStore((s) => s.openPro);
  const selectMapPro = useStore((s) => s.selectMapPro);
  const selected = useStore((s) => s.ui.selectedMapProId);
  const setClientTab = useStore((s) => s.setClientTab);
  const bookings = useStore((s) => s.bookings);
  const active = useMemo(() => bookings.filter((b) => b.mine && ['pending', 'confirmed', 'in_progress'].includes(b.status)), [bookings]);
  const { pros } = useVisiblePros();

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <h1 className="text-[22px] font-bold">{t('home.hello', { name: me.name })}</h1>

      <label className="flex h-[52px] items-center gap-2.5 rounded-btn border border-hair bg-white px-3.5 shadow-card focus-within:border-teal-dark">
        <Search size={18} className="text-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('home.search')}
          className="h-full flex-1 bg-transparent text-[15px] outline-none placeholder:text-faint"
          aria-label={t('home.search')}
        />
        {query && (
          <button onClick={() => setQuery('')} aria-label={t('common.close')}>
            <X size={18} className="text-faint" />
          </button>
        )}
      </label>

      <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0">
        <CategoryPill icon={LayoutGrid} label={t('home.all')} active={!category} onClick={() => setCategory(null)} />
        {CATEGORIES.map((c) => (
          <CategoryPill
            key={c.slug}
            icon={CATEGORY_ICONS[c.slug]}
            label={lang === 'ar' ? c.name_ar : c.name_fr}
            active={category === c.slug}
            onClick={() => setCategory(category === c.slug ? null : c.slug)}
          />
        ))}
      </div>

      {active.slice(0, 2).map((b) => (
        <LiveQueueBanner key={b.id} booking={b} onClick={() => setClientTab('bookings')} />
      ))}

      <div className="flex items-baseline justify-between pt-1">
        <h2 className="text-[17px] font-bold">{t('home.nearby')}</h2>
        <span className="text-[13px] text-muted">{t('home.results', { n: pros.length })}</span>
      </div>

      {pros.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 px-6 py-10 text-center">
          <SearchX size={30} className="text-teal-dark" />
          <p className="text-sm text-muted">{t('home.noResults')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pros.map((p) => (
            <div key={p.id} onMouseEnter={() => selectMapPro(p.id)}>
              <ProCard pro={p} distanceKm={p.distance} selected={selected === p.id} onClick={() => openPro(p.id)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
