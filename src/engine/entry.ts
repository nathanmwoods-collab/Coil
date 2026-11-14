import type { Contest } from './types';

export interface EntryLimit {
  /** How many more entries the user can make right now. */
  max: number;
  /** What stops them going higher. */
  boundBy: 'perUser' | 'seats' | 'balance';
  perUserLeft: number;
  seatsLeft: number;
  affordable: number;
}

/** How many entries a user can add: bounded by the per-user cap, open seats and balance. */
export function entryLimit(
  c: Pick<Contest, 'maxPerUser' | 'maxEntries' | 'filled' | 'entryFee'>,
  mine: number,
  balance: number,
): EntryLimit {
  const perUserLeft = Math.max(0, c.maxPerUser - mine);
  const seatsLeft = Math.max(0, c.maxEntries - c.filled - mine);
  const affordable = c.entryFee > 0 ? Math.max(0, Math.floor((balance + 1e-9) / c.entryFee)) : Infinity;
  const max = Math.min(perUserLeft, seatsLeft, affordable);
  const boundBy = max === perUserLeft ? 'perUser' : max === seatsLeft ? 'seats' : 'balance';
  return { max, boundBy, perUserLeft, seatsLeft, affordable };
}

export function clampEntries(n: number, limit: EntryLimit): number {
  if (limit.max < 1) return 1;
  return Math.max(1, Math.min(limit.max, Math.round(n) || 1));
}

/** Total fee for n entries, rounded to cents. */
export function entryTotal(fee: number, n: number): number {
  return Math.round(fee * n * 100) / 100;
}
