/**
 * ALLO LM3LM web app — Client Mode (split-view discovery + map, 3 booking engines,
 * live tracker) and Pro Mode (guichet, caisse & kridi, catalogue), bilingual
 * FR / AR with automatic LTR / RTL flipping.
 */
import { useEffect, useState } from 'react';
import { CalendarCheck, Compass, Map, Sparkles } from 'lucide-react';

import AnimationsShowcase from './components/AnimationsShowcase';
import { SplashLogoAnimation } from './components/anim';
import Bookings from './components/client/Bookings';
import Discovery from './components/client/Discovery';
import MoroccoMap from './components/client/MoroccoMap';
import ProProfile from './components/client/ProProfile';
import Overlays from './components/Overlays';
import ProDashboard from './components/pro/ProDashboard';
import TopNav from './components/TopNav';
import { useT } from './i18n';
import { haptic } from './lib/utils';
import { useStore, type ClientTab } from './store';

export default function App() {
  const { t, lang } = useT();
  const mode = useStore((s) => s.mode);
  const view = useStore((s) => s.view);
  const [splash, setSplash] = useState(true);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  useEffect(() => {
    const id = setTimeout(() => setSplash(false), 1500);
    return () => clearTimeout(id);
  }, []);

  if (splash) {
    return (
      <div className="grid h-full place-items-center bg-canvas">
        <div className="flex flex-col items-center gap-4">
          <SplashLogoAnimation size={150} />
          <p className="ltr text-3xl font-bold">
            ALLO <span className="text-accent">LM3LM</span>
          </p>
          <p className="text-sm text-muted">{t('app.tagline')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <TopNav />
      {view === 'animations' ? <AnimationsShowcase /> : mode === 'client' ? <ClientMode /> : <ProDashboard />}
      <ProProfile />
      <Overlays />
    </div>
  );
}

function ClientMode() {
  const tab = useStore((s) => s.clientTab);
  return (
    <>
      {/* Desktop: Web Split-View 1440×900 */}
      <div className="mx-auto hidden w-full max-w-[1440px] flex-1 lg:grid lg:grid-cols-[500px_1fr]">
        <div className="h-[calc(100vh-72px)] overflow-y-auto border-e border-hair">{tab === 'bookings' ? <Bookings /> : <Discovery />}</div>
        <div className="sticky top-[72px] h-[calc(100vh-72px)]">
          <MoroccoMap />
        </div>
      </div>
      {/* Mobile 390×844 */}
      <div className="flex-1 pb-20 lg:hidden">
        {tab === 'map' ? (
          <div className="h-[calc(100dvh-112px-66px)]">
            <MoroccoMap compact />
          </div>
        ) : tab === 'bookings' ? (
          <Bookings />
        ) : (
          <Discovery />
        )}
      </div>
      <ClientTabBar />
    </>
  );
}

function ClientTabBar() {
  const { t } = useT();
  const tab = useStore((s) => s.clientTab);
  const setTab = useStore((s) => s.setClientTab);
  const setView = useStore((s) => s.setView);
  const items: { id: ClientTab | 'animations'; label: string; icon: typeof Compass }[] = [
    { id: 'discover', label: t('home.discover'), icon: Compass },
    { id: 'map', label: t('home.map'), icon: Map },
    { id: 'bookings', label: t('home.bookings'), icon: CalendarCheck },
    { id: 'animations', label: t('nav.animations'), icon: Sparkles },
  ];
  return (
    <>
      {/* Desktop: discover / bookings switch floats over the list */}
      <div className="fixed bottom-5 start-5 z-20 hidden gap-1 rounded-full border border-hair bg-white p-1 shadow-raised lg:flex">
        {items.slice(0, 3).filter((i) => i.id !== 'map').map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id as ClientTab)}
            className={`press inline-flex h-10 items-center gap-2 rounded-full px-4 text-[13px] font-bold ${tab === id ? 'bg-primary text-white' : 'text-muted'}`}
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-hair bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        {items.map(({ id, label, icon: Icon }) => {
          const on = id === tab;
          return (
            <button
              key={id}
              onClick={() => {
                haptic(8);
                if (id === 'animations') setView('animations');
                else setTab(id);
              }}
              className="flex h-[66px] flex-col items-center justify-center gap-1"
            >
              <Icon size={22} className={on ? 'text-accent' : 'text-faint'} />
              <span className={`text-[11px] font-semibold ${on ? 'text-accent' : 'text-faint'}`}>{label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
