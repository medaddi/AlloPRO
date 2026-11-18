/**
 * ALLO LM3LM — shared vector shapes for animations (gear, location pin, star).
 * Pure geometry + static SVG components; motion lives in the animation components.
 */
import Svg, { Circle, Path } from 'react-native-svg';
import { colors } from '../../constants/theme';

const pt = (cx: number, cy: number, r: number, angle: number): string =>
  `${(cx + r * Math.cos(angle)).toFixed(2)} ${(cy + r * Math.sin(angle)).toFixed(2)}`;

/**
 * Mechanical gear outline with flat-topped teeth and an optional center hole
 * (use fillRule="evenodd" so the hole is cut out).
 */
export function gearPath(
  cx: number,
  cy: number,
  outerR: number,
  rootR: number,
  teeth: number,
  holeR = 0,
): string {
  const step = (Math.PI * 2) / teeth;
  let d = '';
  for (let i = 0; i < teeth; i++) {
    const a = i * step - Math.PI / 2;
    const riseEnd = a + step * 0.12;
    const topEnd = a + step * 0.42;
    const fallEnd = a + step * 0.54;
    const next = a + step;
    if (i === 0) d += `M ${pt(cx, cy, rootR, a)} `;
    d += `L ${pt(cx, cy, outerR, riseEnd)} `;
    d += `A ${outerR} ${outerR} 0 0 1 ${pt(cx, cy, outerR, topEnd)} `;
    d += `L ${pt(cx, cy, rootR, fallEnd)} `;
    d += `A ${rootR} ${rootR} 0 0 1 ${pt(cx, cy, rootR, next)} `;
  }
  d += 'Z';
  if (holeR > 0) {
    d += ` M ${cx + holeR} ${cy} A ${holeR} ${holeR} 0 1 0 ${cx - holeR} ${cy} A ${holeR} ${holeR} 0 1 0 ${cx + holeR} ${cy} Z`;
  }
  return d;
}

/** Five-point (or n-point) star centered on (cx, cy). */
export function starPath(cx: number, cy: number, outerR: number, innerR: number, points = 5): string {
  const step = Math.PI / points;
  let d = '';
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = i * step - Math.PI / 2;
    d += `${i === 0 ? 'M' : 'L'} ${pt(cx, cy, r, a)} `;
  }
  return `${d}Z`;
}

/* -------------------------------------------------------------------------- */

const GEAR_ICON_PATH = gearPath(50, 50, 48, 38, 8, 15);

type GearIconProps = { size?: number; color?: string };

/** Solid 8-tooth gear (used by GearLoadingProgress & PrimaryButton loading state). */
export function GearIcon({ size = 24, color = colors.accent.DEFAULT }: GearIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d={GEAR_ICON_PATH} fill={color} fillRule="evenodd" />
    </Svg>
  );
}

/** viewBox 0 0 64 80 — tip of the pin is at (32, 78). */
export const PIN_PATH = 'M32 2 C16.5 2 4 14.5 4 30 C4 50 32 78 32 78 C32 78 60 50 60 30 C60 14.5 47.5 2 32 2 Z';
export const PIN_CHECK_PATH = 'M23.5 30.5 L29.5 36.5 L41 24.5';
export const PIN_ASPECT = 80 / 64;

type PinProps = {
  width?: number;
  pinColor?: string;
  checkColor?: string;
  innerColor?: string;
};

/** Deep-blue location pin with an orange checkmark (ALLO LM3LM brand mark for "found / confirmed"). */
export function LocationPinCheck({
  width = 64,
  pinColor = colors.primary.DEFAULT,
  checkColor = colors.accent.DEFAULT,
  innerColor = colors.background.surface,
}: PinProps) {
  return (
    <Svg width={width} height={width * PIN_ASPECT} viewBox="0 0 64 80">
      <Path d={PIN_PATH} fill={pinColor} />
      <Circle cx={32} cy={30} r={16} fill={innerColor} />
      <Path
        d={PIN_CHECK_PATH}
        stroke={checkColor}
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
