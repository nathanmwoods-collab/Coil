import { memo, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { useReducedMotion } from '../theme/motion';
import { useColors } from '../theme/useTheme';
import { RATTLER_VIEWBOX, rattleOnly, rattlerShapes, type RattlerFrame, type RattlerInk, type RattlerPose, type Shape } from './rattlerShapes';

export type { RattlerPose };

/** Rattle shake timings (round-2 doc §2.3): 6 swings of 70ms, then a rest that shortens as the clock runs down. */
export const RATTLE = { swingMs: 70, swings: 6, swingDeg: 14 } as const;

/** Rest between rattle bursts for a given time left. 0 = continuous. */
export function rattleRestMs(msLeft: number) {
  if (msLeft < 5_000) return 0;
  if (msLeft < 10_000) return 250;
  return 500;
}

function Draw({ s }: { s: Shape }) {
  switch (s.t) {
    case 'g':
      return (
        <G transform={s.transform}>
          {s.children.map((c, i) => (
            <Draw key={i} s={c} />
          ))}
        </G>
      );
    case 'path':
      return (
        <Path
          d={s.d}
          fill={s.fill ?? 'none'}
          stroke={s.stroke}
          strokeWidth={s.strokeWidth}
          strokeLinecap={s.cap}
          opacity={s.opacity}
          transform={s.transform}
        />
      );
    case 'rect':
      return <Rect x={s.x} y={s.y} width={s.w} height={s.h} rx={s.rx} fill={s.fill} transform={s.transform} />;
    case 'circle':
      return <Circle cx={s.cx} cy={s.cy} r={s.r} fill={s.fill} opacity={s.opacity} />;
  }
}

/** Time-driven frame for a pose. Runs only while the pose moves; stills never tick. */
function useFrame(pose: RattlerPose, animate: boolean, restMs: number, onLunge?: () => void, onDone?: () => void): RattlerFrame {
  const [frame, setFrame] = useState<RattlerFrame>({});
  const lunge = useRef(onLunge);
  const done = useRef(onDone);
  lunge.current = onLunge;
  done.current = onDone;
  const rest = useRef(restMs);
  rest.current = restMs;

  useEffect(() => {
    if (!animate) {
      setFrame(pose === 'strike' ? { beat: 'lunge' } : {});
      if (pose === 'strike') {
        lunge.current?.();
        done.current?.();
      }
      return;
    }
    const start = Date.now();
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (pose === 'rattle' || pose === 'sweating') {
      // Bursts of swings, then a rest. The rest follows the clock (0 = continuous).
      let swing = 0;
      const step = () => {
        if (!alive) return;
        const continuous = pose === 'sweating' || rest.current === 0;
        const inBurst = continuous || swing % (RATTLE.swings + 1) !== RATTLE.swings;
        const k = (Date.now() - start) / 900;
        setFrame({
          swing: inBurst ? (swing % 2 ? -RATTLE.swingDeg : RATTLE.swingDeg) : 0,
          buzz: inBurst,
          drop: k - Math.floor(k),
        });
        swing++;
        timer = setTimeout(step, inBurst ? RATTLE.swingMs : rest.current);
      };
      step();
    } else if (pose === 'strike') {
      // Wind (80ms), lunge (140ms, the haptic lands here), then settle back to resting.
      setFrame({ beat: 'wind' });
      timer = setTimeout(() => {
        if (!alive) return;
        setFrame({ beat: 'lunge' });
        lunge.current?.();
        timer = setTimeout(() => alive && done.current?.(), 220);
      }, 80);
    } else if (pose === 'smug') {
      // One tongue flick, then still.
      const flick = () => {
        if (!alive) return;
        const t = Date.now() - start;
        const k = t < 110 ? t / 110 : t < 220 ? 1 - (t - 110) / 110 : 0;
        setFrame({ tongue: Math.max(0, k) });
        if (t < 240) timer = setTimeout(flick, 30);
      };
      setFrame({ tongue: 0 });
      timer = setTimeout(flick, 300);
    } else if (pose === 'bust') {
      // One slow rattle twitch on arrival, then nothing.
      timer = setTimeout(() => {
        if (!alive) return;
        setFrame({ swing: -12 });
        timer = setTimeout(() => alive && setFrame({}), 160);
      }, 400);
    } else {
      setFrame({});
    }
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, [pose, animate]);

  return frame;
}

/**
 * Clutch, the Rattler. Never speaks. One per screen, at most, and never on
 * money, legal, rankings, rename or exposure screens. Built only from the
 * logo's shapes (see rattlerShapes.ts).
 *
 * - `line`: mint body on the dark background, for inline use (20-72px).
 * - `sticker`: the app icon (dark body on a mint square), for loud moments.
 * Reduced motion turns every pose into a still.
 */
export const Rattler = memo(function Rattler({
  pose = 'resting',
  size = 40,
  variant = 'line',
  animate = true,
  restMs = 500,
  opacity = 1,
  onLunge,
  onDone,
  testID,
}: {
  pose?: RattlerPose;
  size?: number;
  variant?: 'line' | 'sticker';
  animate?: boolean;
  /** Rattle pose: pause between bursts (see `rattleRestMs`). */
  restMs?: number;
  opacity?: number;
  /** Strike: the lunge frame, where the Rigid haptic belongs. */
  onLunge?: () => void;
  /** Strike: finished. */
  onDone?: () => void;
  testID?: string;
}) {
  const c = useColors();
  const reduced = useReducedMotion();
  const frame = useFrame(pose, animate && !reduced, restMs, onLunge, onDone);
  const ink: RattlerInk =
    variant === 'sticker'
      ? { body: c.bg, cut: c.accent, rattle: c.primary, muted: c.bg, tongue: '#FF5C7A', sweat: c.text }
      : { body: c.accent, cut: c.bg, rattle: c.primary, muted: c.textMuted, tongue: '#FF5C7A', sweat: c.text };
  const pad = variant === 'sticker' ? 14 : 4;
  const vb = `${-pad} ${-pad} ${RATTLER_VIEWBOX + pad * 2} ${RATTLER_VIEWBOX + pad * 2}`;
  return (
    <View testID={testID} accessible={false} style={{ width: size, height: size, opacity }} pointerEvents="none">
      <Svg width={size} height={size} viewBox={vb}>
        {variant === 'sticker' ? <Rect x={-pad} y={-pad} width={RATTLER_VIEWBOX + pad * 2} height={RATTLER_VIEWBOX + pad * 2} rx={44} fill={c.accent} /> : null}
        {rattlerShapes(pose, ink, frame).map((s, i) => (
          <Draw key={i} s={s} />
        ))}
      </Svg>
    </View>
  );
});

/** Just the rattle, shaking in bursts: the Drafts tab badge when you're on the clock. */
export const RattleBadge = memo(function RattleBadge({ size = 16, color }: { size?: number; color?: string }) {
  const c = useColors();
  const reduced = useReducedMotion();
  const frame = useFrame('rattle', !reduced, 500);
  return (
    <View accessible={false} pointerEvents="none" style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 44 44">
        {rattleOnly(color ?? c.accent, (frame.swing ?? 0) * 0.8).map((s, i) => (
          <Draw key={i} s={s} />
        ))}
      </Svg>
    </View>
  );
});
