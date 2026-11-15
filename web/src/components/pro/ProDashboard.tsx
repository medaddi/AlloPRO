/**
 * Pro Mode shell: shop selector, Guichet / Caisse & Kridi / Catalogue tabs.
 */
import { ClipboardList, Store, Ticket, Wallet } from 'lucide-react';

import { useT } from '../../i18n';
import { haptic } from '../../lib/utils';
import { useStore, type ProTab } from '../../store';
import Caisse from './Caisse';
import Catalog from './Catalog';
import Guichet from './Guichet';

const TABS: { id: ProTab; icon: typeof Ticket }[] = [
  { id: 'guichet', icon: Ticket },
  { id: 'caisse', icon: Wallet },
  { id: 'catalog', icon: ClipboardList },
];

export default function ProDashboard() {
  const { t } = useT();
  const pros = useStore((s) => s.pros);
  const activeProId = useStore((s) => s.activeProId);
  const setActivePro = useStore((s) => s.setActivePro);
  const tab = useStore((s) => s.proTab);
  const setTab = useStore((s) => s.setProTab);
  const bookings = useStore((s) => s.bookings);
  const pro = pros.find((p) => p.id === activeProId) ?? pros[0];
  const pendingCount = bookings.filter((b) => b.proId === pro.id && b.status === 'pending').length;

  const label = (id: ProTab) => (id === 'guichet' ? t('pro.guichet') : id === 'caisse' ? t('pro.caisse') : t('pro.catalog'));

  return (
    <div className="mx-auto grid max-w-[1440px] gap-0 lg:grid-cols-[280px_1fr]">
      <aside className="border-hair bg-white lg:sticky lg:top-[72px] lg:h-[calc(100vh-72px)] lg:border-e">
        <div className="space-y-4 p-4 lg:p-5">
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted">
              <Store size={14} /> {t('pro.manage')}
            </span>
            <select
              value={pro.id}
              onChange={(e) => setActivePro(e.target.value)}
              className="h-12 w-full rounded-btn border border-hair bg-canvas px-3 text-sm font-bold outline-none focus:border-teal-dark"
            >
              {pros.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <nav className="scrollbar-none flex gap-2 overflow-x-auto lg:flex-col" aria-label="Pro">
            {TABS.map(({ id, icon: Icon }) => (
              <button
                key={id}
                onClick={() => {
                  haptic(8);
                  setTab(id);
                }}
                aria-current={tab === id}
                className={`press flex h-12 shrink-0 items-center gap-3 rounded-btn px-4 text-sm font-bold ${tab === id ? 'bg-primary text-white' : 'text-muted hover:bg-canvas'}`}
              >
                <Icon size={20} className={tab === id ? 'text-accent' : ''} />
                <span className="flex-1 text-start">{label(id)}</span>
                {id === 'guichet' && pendingCount > 0 && (
                  <span className="ltr grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1.5 text-[11px] text-white">{pendingCount}</span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </aside>
      <main className="mx-auto w-full max-w-3xl p-4 pb-24 lg:p-8">
        {tab === 'guichet' && <Guichet pro={pro} />}
        {tab === 'caisse' && <Caisse pro={pro} />}
        {tab === 'catalog' && <Catalog pro={pro} />}
      </main>
    </div>
  );
}
