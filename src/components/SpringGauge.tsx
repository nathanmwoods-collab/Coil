import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { motion, useReducedMotion } from '../theme/motion';
import { useColors } from '../theme/useTheme';

const TURNS = 7;
const PLATE = 6;

/** Side view of a helix: back half-turns and front half-turns, so the front can sit on top. */
function coilPaths(cx: number, r: number, top: number, len: number, turns: number) {
  const halves = turns * 2;
  const back: string[] = [];
  const front: string[] = [];
  for (let h = 0; h < halves; h++) {
    let d = '';
    for (let k = 0; k <= 10; k++) {
      const u = (h + k / 10) / halves;
      const x = cx + r * Math.cos(Math.PI * (h + k / 10));
      const y = top + len * u;
      d += `${k ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    (h % 2 ? back : front).push(d);
  }
  return { back: back.join(' '), front: front.join(' ') };
}

/**
 * The spring gauge. The more rake paid this season, the tighter it's wound and
 * the heavier the wire. Violet because it's yours. When Springback pays out,
 * bump `releaseKey`: the coil winds a touch tighter, lets go past its full
 * length, the mint dot pops off the top, and it settles back to its load.
 * Reduced motion: no movement, the coil just sits at its load.
 */
export const SpringGauge = memo(function SpringGauge({
  load,
  wire = 0,
  width = 116,
  height = 196,
  releaseKey = 0,
  onRelease,
}: {
  /** 0 (nothing paid) to 1 (Max Load). */
  load: number;
  /** Gauge index, 0 to 3: heavier wire at higher gauges. */
  wire?: number;
  width?: number;
  height?: number;
  /** Change it to play the payout release. */
  releaseKey?: number;
  /** Fires at the instant the spring lets go. */
  onRelease?: () => void;
}) {
  const c = useColors();
  const reduced = useReducedMotion();
  const head = 22; // room above the free spring for the overshoot and the dot
  const free = height - head - PLATE * 2;
  const rest = free * (1 - 0.64 * Math.max(0, Math.min(1, load)));
  const [len, setLen] = useState(reduced ? rest : free);
  const [pop, setPop] = useState(0); // 0 to 1: the mint dot leaving the top plate
  const lenRef = useRef(len);
  const seenKey = useRef(releaseKey);
  const onReleaseRef = useRef(onRelease);
  onReleaseRef.current = onRelease;

  useEffect(() => {
    const release = releaseKey !== seenKey.current;
    seenKey.current = releaseKey;
    if (reduced) {
      lenRef.current = rest;
      setLen(rest);
      setPop(0);
      if (release) onReleaseRef.current?.();
      return;
    }
    const from = lenRef.current;
    const start = Date.now();
    let raf = 0;
    let fired = false;
    const WIND = 320;
    const SPRING = 1100;
    const HOLD = 350;
    const SETTLE = 700;
    const tight = Math.max(free * 0.26, rest * 0.78);
    const frame = () => {
      const t = Date.now() - start;
      let v: number;
      let done = false;
      let dot = 0;
      if (!release) {
        // Wind to the current load.
        const k = Math.min(1, t / motion.wind.duration);
        v = from + (rest - from) * motion.wind.easing(k);
        done = k >= 1;
      } else if (t < WIND) {
        v = from + (tight - from) * motion.wind.easing(t / WIND);
      } else if (t < WIND + SPRING + HOLD) {
        if (!fired) {
          fired = true;
          onReleaseRef.current?.();
        }
        // Underdamped: overshoots its free length, rings twice, rests fully extended.
        const sec = (t - WIND) / 1000;
        v = free + (tight - free) * Math.exp(-5.2 * sec) * Math.cos(17 * sec);
        dot = Math.min(1, (t - WIND) / 520);
      } else {
        const k = Math.min(1, (t - WIND - SPRING - HOLD) / SETTLE);
        v = free + (rest - free) * motion.wind.easing(k);
        dot = 1;
        done = k >= 1;
      }
      lenRef.current = v;
      setLen(v);
      setPop(done ? 0 : dot);
      if (!done) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [rest, free, releaseKey, reduced]);

  const cx = width / 2;
  const stroke = 3 + wire * 1.1;
  const r = width / 2 - 14 - stroke / 2;
  const base = height - PLATE;
  const top = base - len;
  const paths = useMemo(() => coilPaths(cx, r, top, len, TURNS), [cx, r, top, len]);
  const plateY = top - PLATE;
  // The dot rides the plate, then flies up and fades as the credit lands.
  const dotY = plateY - 7 - pop * 16;
  const dotOpacity = pop < 0.6 ? 1 : Math.max(0, 1 - (pop - 0.6) / 0.4);

  return (
    <View style={{ width, height }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={width} height={height}>
        <Path d={paths.back} stroke={c.primary} strokeOpacity={0.38} strokeWidth={stroke} strokeLinecap="round" fill="none" />
        <Path d={paths.front} stroke={c.primary} strokeWidth={stroke} strokeLinecap="round" fill="none" />
        <Rect x={10} y={plateY} width={width - 20} height={PLATE} rx={PLATE / 2} fill={c.text} />
        <Rect x={4} y={base} width={width - 8} height={PLATE} rx={PLATE / 2} fill={c.border} />
        <Circle cx={cx} cy={dotY} r={5 + pop * 2} fill={c.accent} opacity={dotOpacity} />
      </Svg>
    </View>
  );
});

/** Tiny still spring for chips and cards. */
export const SpringGlyph = memo(function SpringGlyph({ color, load = 0, size = 18 }: { color: string; load?: number; size?: number }) {
  const w = size * 0.7;
  const len = (size - 3) * (1 - 0.5 * Math.max(0, Math.min(1, load)));
  const p = coilPaths(w / 2, w / 2 - 1.5, size - 1.5 - len, len, 3);
  return (
    <Svg width={w} height={size}>
      <Path d={`${p.back} ${p.front}`} stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
});
