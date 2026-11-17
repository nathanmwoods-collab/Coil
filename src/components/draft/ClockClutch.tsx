import { useEffect, useState } from 'react';

import { Rattler, rattleRestMs } from '../Rattler';

/**
 * Clutch in the "You're up." banner: rattling while you're on the clock,
 * sweating under `urgentAt`, the bursts closing up as time runs out.
 * Ticks on its own so the room doesn't re-render.
 */
export function ClockClutch({ endsAt, totalMs, size = 44 }: { endsAt: number | null; totalMs: number; size?: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (endsAt === null) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [endsAt]);
  const left = endsAt === null ? Infinity : Math.max(0, endsAt - now);
  const urgentAt = Math.min(10_000, totalMs * 0.34);
  const sweating = left < urgentAt;
  return <Rattler pose={sweating ? 'sweating' : 'rattle'} size={size} restMs={rattleRestMs(left)} testID={sweating ? 'clutch-sweating' : 'clutch-rattle'} />;
}
