/**
 * "Animations & Assets" tab — the 4 signature animations, replayable.
 */
import { useState, type ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';

import { useT } from '../i18n';
import { GearLoadingProgress, RadarSearchingAnimation, SplashLogoAnimation, SuccessBurst } from './anim';

export default function AnimationsShowcase() {
  const { t } = useT();
  const [k, setK] = useState(0);
  return (
    <div className="mx-auto max-w-[1440px] space-y-6 p-4 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('anim.title')}</h1>
          <p className="text-sm text-muted">{t('anim.subtitle')}</p>
        </div>
        <button onClick={() => setK((x) => x + 1)} className="press inline-flex h-11 items-center gap-2 rounded-btn bg-primary px-4 text-sm font-bold text-white">
          <RotateCcw size={16} /> {t('anim.replay')}
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile title="SplashLogoAnimation" desc={t('anim.splash')}>
          <SplashLogoAnimation size={170} replayKey={k} />
        </Tile>
        <Tile title="RadarSearchingAnimation" desc={t('anim.radar')}>
          <RadarSearchingAnimation size={230} />
        </Tile>
        <Tile title="GearLoadingProgress" desc={t('anim.gear')}>
          <div className="w-full px-4">
            <GearLoadingProgress label={t('app.tagline')} replayKey={k} />
          </div>
        </Tile>
        <Tile title="SuccessConfettiPopup" desc={t('anim.confetti')}>
          <SuccessBurst replayKey={k} />
        </Tile>
      </div>
    </div>
  );
}

function Tile({ title, desc, children }: { title: string; desc: string; children: ReactNode }) {
  return (
    <article className="card overflow-hidden">
      <div className="grid h-64 place-items-center bg-canvas">{children}</div>
      <div className="space-y-1 p-4">
        <h2 className="ltr text-start font-bold">{title}</h2>
        <p className="text-[13px] text-muted">{desc}</p>
      </div>
    </article>
  );
}
