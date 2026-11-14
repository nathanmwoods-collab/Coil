import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { feel } from '../../lib/feel';
import { fonts } from '../../theme/type';
import { useColors } from '../../theme/useTheme';
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
  const frac = totalMs > 0 ? left / totalMs : 0;
  const color = !mine ? c.textMuted : urgent ? c.danger : c.text;
  return (
    <View style={{ gap: 5, minWidth: compact ? 64 : 78 }}>
      <Text
        accessibilityLabel={`${formatCountdown(left)} left`}
        style={{ color, fontFamily: fonts.mono, fontSize: compact ? 18 : 24, fontVariant: ['tabular-nums'], textAlign: 'right' }}
      >
        {formatCountdown(left)}
      </Text>
      <View style={{ height: 3, borderRadius: 2, backgroundColor: c.border, overflow: 'hidden' }}>
        <View style={{ width: `${Math.min(1, frac) * 100}%`, height: '100%', backgroundColor: urgent ? c.danger : c.accent }} />
      </View>
    </View>
  );
}
