import { describe, expect, it } from 'vitest';

import { clampEntries, entryLimit, entryTotal } from '../entry';

const c = { maxPerUser: 20, maxEntries: 100, filled: 60, entryFee: 10 };

describe('entryLimit', () => {
  it('is bounded by the per-user cap', () => {
    expect(entryLimit(c, 15, 1000)).toMatchObject({ max: 5, boundBy: 'perUser' });
    expect(entryLimit(c, 20, 1000).max).toBe(0);
  });
  it('is bounded by open seats', () => {
    expect(entryLimit({ ...c, filled: 97 }, 1, 1000)).toMatchObject({ max: 2, boundBy: 'seats' });
  });
  it('is bounded by balance', () => {
    expect(entryLimit(c, 0, 35)).toMatchObject({ max: 3, boundBy: 'balance' });
    expect(entryLimit(c, 0, 9.99).max).toBe(0);
    expect(entryLimit({ ...c, entryFee: 0.1 }, 0, 0.3).max).toBe(3);
  });
  it('clamps a requested count and totals fees to cents', () => {
    const l = entryLimit(c, 0, 35);
    expect(clampEntries(9, l)).toBe(3);
    expect(clampEntries(0, l)).toBe(1);
    expect(entryTotal(2.5, 3)).toBe(7.5);
    expect(entryTotal(0.1, 3)).toBe(0.3);
  });
});
