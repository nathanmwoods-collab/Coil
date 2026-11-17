import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { G, Rect } from 'react-native-svg';

import { feel } from '../../lib/feel';
import { fonts } from '../../theme/type';
import { useColors } from '../../theme/useTheme';
import { breathMs, useReducedMotion } from '../../theme/motion';
import { SnakeFill } from '../SnakeFill';
import { formatCountdown } from '../ui';

/** Self-ticking countdown so only this small component re-renders every frame-ish. */
export function Countdown({
  endsAt,
  totalMs,
  mine,
  compact,
}: {
  endsAt: number | null;
  totalMs: number;
  mine: boolean;
  compact?: boolean;
}) {
  const c = useColors();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (endsAt === null) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [endsAt]);

  const left = endsAt === null ? 0 : Math.max(0, endsAt - now);
  const urgentAt = Math.min(10_000, totalMs * 0.34);
  const urgent = mine && endsAt !== null && left < urgentAt;
  const secs = Math.ceil(left / 1000);

  // Haptics: one warning when the clock goes urgent, then a tick for each of the last 3 seconds.
  const warned = useRef<number | null>(null);
  const ticked = useRef<number | null>(null);
  useEffect(() => {
    if (!mine || endsAt === null) return;
    if (urgent && warned.current !== endsAt) {
      warned.current = endsAt;
      feel.clockWarning();
    }
    if (left > 0 && secs <= 3 && ticked.current !== secs) {
      ticked.current = secs;
      feel.clockTick();
    }
  }, [mine, endsAt, urgent, left, secs]);

  if (endsAt === null) return null;
  const color = !mine ? c.textMuted : urgent ? c.danger : c.text;
  return (
    <View style={{ minWidth: compact ? 64 : 78 }}>
      <Text
        accessibilityLabel={`${formatCountdown(left)} left`}
        style={{ color, fontFamily: fonts.mono, fontSize: compact ? 18 : 24, fontVariant: ['tabular-nums'], textAlign: 'right' }}
      >
        {formatCountdown(left)}
      </Text>
    </View>
  );
}

/** Calm and urgent coil shapes (round-2 doc §3.1). */
const CALM = { amp: 2.5, period: 40 };
const TIGHT = { amp: 4.5, period: 22 };
const TIGHTEN_MS = 400;
const TAIL = 22;

/**
 * The pick clock as a draining coil: full at the start, the head runs back
 * toward the rattle at the tail. Under `urgentAt` it tightens (shorter
 * period, taller humps), turns red and the wave travels toward the tail.
 * In the last 3 seconds the rattle shakes on each tick. Someone else's clock
 * is a thin muted line with no rattle: bots don't get drama.
 * Reduced motion: no travel, and the two shapes swap instantly.
 */
export function ClockCoil({ endsAt, totalMs, mine }: { endsAt: number | null; totalMs: number; mine: boolean }) {
  const c = useColors();
  const reduced = useReducedMotion();
  const [now, setNow] = useState(() => Date.now());
  const left = endsAt === null ? 0 : Math.max(0, endsAt - now);
  const urgentAt = Math.min(10_000, totalMs * 0.34);
  const urgent = mine && endsAt !== null && left < urgentAt;
  useEffect(() => {
    if (endsAt === null) return;
    // Smooth while it's travelling, cheap while it's calm.
    const t = setInterval(() => setNow(Date.now()), urgent && !reduced ? 50 : 250);
    return () => clearInterval(t);
  }, [endsAt, urgent, reduced]);
  if (endsAt === null) return null;

  const frac = totalMs > 0 ? Math.min(1, left / totalMs) : 0;
  const k = !urgent ? 0 : reduced ? 1 : Math.min(1, (urgentAt - left) / TIGHTEN_MS);
  const amp = CALM.amp + (TIGHT.amp - CALM.amp) * k;
  const period = CALM.period + (TIGHT.period - CALM.period) * k;
  const phase = urgent && !reduced ? -((urgentAt - left) / breathMs(left)) : 0;
  const secs = Math.ceil(left / 1000);
  const shake = mine && secs <= 3 && left > 0 && !reduced ? (secs % 2 ? 14 : -14) : 0;
  const color = !mine ? c.textMuted : urgent ? c.danger : c.text;

  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" testID={mine ? 'clock-coil' : undefined}>
      <SnakeFill
        value={frac}
        color={color}
        track={c.border}
        height={18}
        amp={mine ? amp : 2}
        period={mine ? period : 40}
        phase={phase}
        strokeWidth={mine ? 2.6 : 1.6}
        inset={mine ? TAIL : 0}
      >
        {mine
          ? (_w, pts) => {
              const [x0, y0] = pts[0];
              return (
                <G transform={`translate(${x0 - 4} ${y0}) rotate(${shake - 30})`}>
                  <Rect x={-16} y={-3} width={6} height={6} rx={2.5} fill={c.primary} />
                  <Rect x={-10.5} y={-2.7} width={5.4} height={5.4} rx={2.3} fill={c.primary} />
                  <Rect x={-5.5} y={-2.4} width={4.8} height={4.8} rx={2} fill={c.primary} />
                </G>
              );
            }
          : undefined}
      </SnakeFill>
    </View>
  );
}
