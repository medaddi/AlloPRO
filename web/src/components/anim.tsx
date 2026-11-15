/**
 * AlloPro — the 4 signature animations (SVG + CSS, GPU transforms only).
 */
import { useEffect, useState, type CSSProperties } from 'react';
import { Clock, Settings, Wrench } from 'lucide-react';

function gearPath(cx: number, cy: number, o: number, r: number, n: number, h: number) {
  const s = (Math.PI * 2) / n;
  const p = (rr: number, a: number) => `${(cx + rr * Math.cos(a)).toFixed(2)} ${(cy + rr * Math.sin(a)).toFixed(2)}`;
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = i * s - Math.PI / 2;
    if (i === 0) d += `M ${p(r, a)} `;
    d += `L ${p(o, a + s * 0.12)} A ${o} ${o} 0 0 1 ${p(o, a + s * 0.42)} L ${p(r, a + s * 0.54)} A ${r} ${r} 0 0 1 ${p(r, a + s)} `;
  }
  d += 'Z';
  if (h) d += ` M ${cx + h} ${cy} A ${h} ${h} 0 1 0 ${cx - h} ${cy} A ${h} ${h} 0 1 0 ${cx + h} ${cy} Z`;
  return d;
}

const LOGO_GEAR = gearPath(100, 100, 86, 73, 12, 60);
const SMALL_GEAR = gearPath(50, 50, 48, 38, 8, 15);
const A_PATH = 'M100 34 L151 160 L125 160 L115 134 L85 134 L75 160 L49 160 Z M100 74 L112 116 L88 116 Z';

export function GearIcon({ className = '', spin = false, color = '#F08A4B' }: { className?: string; spin?: boolean; color?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <path d={SMALL_GEAR} fill={color} fillRule="evenodd" className={spin ? 'animate-gear' : undefined} />
    </svg>
  );
}

/** 1 — Splash logo: 'A' springs 0.5→1, gear rotates 4s, checkmark draws in 600ms. */
export function SplashLogoAnimation({ size = 160, replayKey = 0 }: { size?: number; replayKey?: number }) {
  return (
    <svg key={replayKey} width={size} height={size} viewBox="0 0 200 200" role="img" aria-label="AlloPro">
      <path d={LOGO_GEAR} fill="#F08A4B" fillRule="evenodd" className="animate-gear-slow" />
      <g className="animate-logo-spring">
        <path d={A_PATH} fill="#1D4355" fillRule="evenodd" stroke="#1D4355" strokeWidth={6} strokeLinejoin="round" />
        <circle cx={150} cy={150} r={27} fill="#FFFFFF" stroke="#1D4355" strokeWidth={6} />
        <path d="M150 127 v5 M173 150 h-5 M127 150 h5" stroke="#1D4355" strokeWidth={4} strokeLinecap="round" />
        <path d="M137 151 L146 160 L163 141" fill="none" stroke="#F08A4B" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" className="animate-draw" />
      </g>
    </svg>
  );
}

export function PinCheck({ width = 64 }: { width?: number }) {
  return (
    <svg width={width} height={width * 1.25} viewBox="0 0 64 80" aria-hidden>
      <path d="M32 2 C16.5 2 4 14.5 4 30 C4 50 32 78 32 78 C32 78 60 50 60 30 C60 14.5 47.5 2 32 2 Z" fill="#1D4355" />
      <circle cx={32} cy={30} r={16} fill="#FFFFFF" />
      <path d="M23.5 30.5 L29.5 36.5 L41 24.5" stroke="#F08A4B" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

/** 2 — Radar: pin floats ±5px (1.5s), 3 teal waves 0.5→2.5 fading 0.8→0 (2s staggered), orbiting tools. */
export function RadarSearchingAnimation({ size = 280 }: { size?: number }) {
  const wave = size / 2.5;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }} role="progressbar" aria-busy>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="radar-wave absolute rounded-full border-2 border-teal bg-teal/35"
          style={{ width: wave, height: wave, animationDelay: `${(i * 2) / 3}s` }}
        />
      ))}
      <span className="absolute rounded-full border border-teal bg-teal-soft" style={{ width: wave * 0.9, height: wave * 0.9 }} />
      <div className="animate-orbit pointer-events-none absolute inset-0">
        {[
          { Icon: Wrench, angle: -40, color: '#1D4355' },
          { Icon: Settings, angle: 80, color: '#F08A4B' },
          { Icon: Clock, angle: 200, color: '#7FA6A6' },
        ].map(({ Icon, angle, color }) => {
          const r = size * 0.4;
          const rad = (angle * Math.PI) / 180;
          return (
            <span
              key={angle}
              className="absolute grid h-9 w-9 place-items-center rounded-full border border-hair bg-white shadow-card"
              style={{ left: size / 2 + r * Math.cos(rad) - 18, top: size / 2 + r * Math.sin(rad) - 18 }}
            >
              <span className="animate-counter-orbit grid place-items-center">
                <Icon size={18} color={color} strokeWidth={2.2} />
              </span>
            </span>
          );
        })}
      </div>
      <div className="animate-float relative -translate-y-6">
        <PinCheck width={size * 0.22} />
      </div>
    </div>
  );
}

/** 3 — Gear loader: gear 360° in 2s + rounded teal track with orange fill 0→100%. */
export function GearLoadingProgress({ label, durationMs = 2400, replayKey = 0, onDone }: { label: string; durationMs?: number; replayKey?: number; onDone?: () => void }) {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    setPct(0);
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const x = Math.min(1, (t - start) / durationMs);
      const eased = 1 - Math.pow(1 - x, 3);
      setPct(Math.round(eased * 100));
      if (x < 1) raf = requestAnimationFrame(tick);
      else onDone?.();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replayKey, durationMs]);
  return (
    <div className="flex w-full items-center gap-3" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <GearIcon className="h-10 w-10 shrink-0" spin />
      <div className="flex-1">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-sm font-semibold">{label}</span>
          <span className="ltr text-sm font-bold text-accent-dark">{pct}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-teal">
          <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

/** 4 — Success: pin 0→1.15→1 (elastic) + 10 stars/dots bursting radially over 800ms. */
export function SuccessBurst({ replayKey = 0 }: { replayKey?: number }) {
  const particles = Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const d = i % 2 ? 70 : 88;
    return { i, dx: Math.cos(a) * d, dy: Math.sin(a) * d, star: i % 2 === 0, color: i % 4 === 0 || i % 4 === 3 ? '#F08A4B' : '#A5C4C4' };
  });
  return (
    <div key={replayKey} className="relative grid h-48 w-52 place-items-center">
      <span className="animate-pop absolute h-28 w-28 rounded-full border border-teal-soft bg-accent-soft" />
      {particles.map((p) => (
        <span
          key={p.i}
          className="particle absolute"
          style={{ ['--dx' as string]: `${p.dx}px`, ['--dy' as string]: `${p.dy}px` } as CSSProperties}
        >
          {p.star ? (
            <svg width={18} height={18} viewBox="0 0 24 24">
              <path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" fill={p.color} />
            </svg>
          ) : (
            <span className="block h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
          )}
        </span>
      ))}
      <div className="animate-pop relative">
        <PinCheck width={64} />
      </div>
    </div>
  );
}
