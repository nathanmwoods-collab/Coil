import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { useColors } from '../../theme/useTheme';
import { formatCountdown } from '../ui';

/** Self-ticking countdown bar so only this small component re-renders every frame-ish. */
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
  if (endsAt === null) return null;
  const left = Math.max(0, endsAt - now);
  const frac = totalMs > 0 ? left / totalMs : 0;
  const urgent = mine && left < Math.min(10_000, totalMs * 0.34);
  const color = !mine ? c.textMuted : urgent ? c.danger : frac < 0.5 ? c.warning : c.success;
  return (
    <View style={{ gap: 4, minWidth: compact ? 64 : undefined }}>
      <Text
        accessibilityLabel={`${formatCountdown(left)} left`}
        style={{ color, fontSize: compact ? 18 : 22, fontWeight: '900', fontVariant: ['tabular-nums'], textAlign: 'right' }}
      >
        {formatCountdown(left)}
      </Text>
      <View style={{ height: 4, borderRadius: 2, backgroundColor: c.surfaceAlt, overflow: 'hidden' }}>
        <View style={{ width: `${Math.min(1, frac) * 100}%`, height: '100%', backgroundColor: color }} />
      </View>
    </View>
  );
}
