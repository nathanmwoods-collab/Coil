import { memo, useMemo, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

/**
 * The coil: Coil's progress language. A wavy line means something is filling
 * or running out over time. Comparisons between items stay straight bars.
 */
export interface Bead {
  /** 0..1 along the line. */
  at: number;
  color: string;
  /** Solid dot (made) or hollow ring (still to come). */
  solid?: boolean;
  /** A slightly larger ring: "next". */
  big?: boolean;
}

export interface WaveOpts {
  amp?: number;
  /** Wavelength in px. */
  period?: number;
  /** Number of humps across the width (overrides `period`). */
  humps?: number;
  /** Phase shift in wavelengths, for travel. */
  phase?: number;
  /** Left inset, e.g. room for a tail. */
  inset?: number;
}

/** Points along a sine across `w`, centred vertically in `h`. */
export function wavePoints(w: number, h: number, o: WaveOpts = {}): [number, number][] {
  const amp = o.amp ?? 3.5;
  const left = 3 + (o.inset ?? 0);
  const right = w - 3;
  const period = o.humps ? (right - left) / o.humps : o.period ?? 46;
  const phase = (o.phase ?? 0) * Math.PI * 2;
  const pts: [number, number][] = [];
  for (let x = left; x <= right + 0.01; x += 1.5) {
    // `humps` puts a whole number of humps (half waves up) across the line.
    const k = o.humps ? ((x - left) / period) * Math.PI : ((x - left) / period) * Math.PI * 2;
    pts.push([x, h / 2 - amp * Math.sin(k + phase)]);
  }
  return pts;
}

function toPath(pts: [number, number][]) {
  return pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
}

/** A snaking line that fills along its path, in place of a flat progress bar. */
export const SnakeFill = memo(function SnakeFill({
  value,
  color,
  track,
  height = 14,
  amp,
  period,
  humps,
  phase,
  strokeWidth = 2.4,
  beads,
  head = 'dot',
  inset,
  children,
}: {
  value: number;
  color: string;
  track: string;
  height?: number;
  amp?: number;
  period?: number;
  humps?: number;
  phase?: number;
  strokeWidth?: number;
  beads?: Bead[];
  head?: 'dot' | 'none';
  inset?: number;
  /** Extra SVG drawn on top (in the same coordinate space), e.g. the rattle at the tail. */
  children?: (w: number, pts: [number, number][]) => ReactNode;
}) {
  const [w, setW] = useState(0);
  const pct = Math.max(0, Math.min(1, value));
  const geo = useMemo(() => {
    if (w <= 0) return null;
    const pts = wavePoints(w, height, { amp, period, humps, phase, inset });
    const lens = [0];
    for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return { pts, lens, len: lens[lens.length - 1], d: toPath(pts) };
  }, [w, height, amp, period, humps, phase, inset]);
  const at = (f: number) => (geo ? geo.pts[Math.min(geo.pts.length - 1, Math.max(0, Math.round(f * (geo.pts.length - 1))))] : [0, 0]);
  const end = at(pct);
  return (
    <View style={{ height }} onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width))}>
      {geo ? (
        <Svg width={w} height={height}>
          <Path d={geo.d} stroke={track} strokeWidth={Math.max(1.4, strokeWidth - 0.4)} strokeLinecap="round" fill="none" />
          {pct > 0 ? (
            <Path d={geo.d} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" fill="none" strokeDasharray={`${geo.len * pct} ${geo.len + 2}`} />
          ) : null}
          {beads?.map((b, i) => {
            const [x, y] = at(b.at);
            return b.solid ? (
              <Circle key={i} cx={x} cy={y} r={3} fill={b.color} />
            ) : (
              <Circle key={i} cx={x} cy={y} r={b.big ? 3.2 : 2.2} fill="none" stroke={b.color} strokeWidth={b.big ? 1.6 : 1.1} />
            );
          })}
          {head === 'dot' && pct > 0 ? <Circle cx={end[0]} cy={end[1]} r={strokeWidth + 0.8} fill={color} /> : null}
          {children?.(w, geo.pts)}
        </Svg>
      ) : null}
    </View>
  );
});
