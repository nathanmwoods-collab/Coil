import { describe, expect, it } from 'vitest';

import { SPRINGBACK_GAUGES } from '../../data/springback';
import {
  type Accrual,
  effectiveRatePct,
  gaugeFor,
  nextGauge,
  nextPayout,
  payoutsDue,
  pendingSpringback,
  settleAccruals,
  planEntries,
  rakeFor,
  springbackFor,
  springLoad,
} from '../springback';

describe('rate card', () => {
  it('is four gauges, rising, from zero, topping out at 26%', () => {
    expect(SPRINGBACK_GAUGES.map((g) => g.name)).toEqual(['Light', 'Medium', 'Heavy', 'Max Load']);
    expect(SPRINGBACK_GAUGES[0].fromRake).toBe(0);
    for (let i = 1; i < SPRINGBACK_GAUGES.length; i++) {
      expect(SPRINGBACK_GAUGES[i].fromRake).toBeGreaterThan(SPRINGBACK_GAUGES[i - 1].fromRake);
      expect(SPRINGBACK_GAUGES[i].ratePct).toBeGreaterThan(SPRINGBACK_GAUGES[i - 1].ratePct);
    }
    expect(SPRINGBACK_GAUGES[3].ratePct).toBe(26);
  });
});

describe('rakeFor', () => {
  it('is the published share of the fee', () => {
    expect(rakeFor(10, 12)).toBe(1.2);
    expect(rakeFor(3, 10)).toBe(0.3);
    expect(rakeFor(1, 12)).toBe(0.12);
    expect(rakeFor(0, 12)).toBe(0);
  });
});

describe('gaugeFor and nextGauge', () => {
  it('moves up exactly at each threshold', () => {
    expect(gaugeFor(0).key).toBe('light');
    expect(gaugeFor(24.99).key).toBe('light');
    expect(gaugeFor(25).key).toBe('medium');
    expect(gaugeFor(100).key).toBe('heavy');
    expect(gaugeFor(999.99).key).toBe('heavy');
    expect(gaugeFor(5000).key).toBe('max');
  });

  it('says how much rake is left and what it unlocks', () => {
    expect(nextGauge(0)).toMatchObject({ rakeToGo: 25, ratePct: 8, progress: 0 });
    expect(nextGauge(62.5)).toMatchObject({ rakeToGo: 37.5, ratePct: 16, progress: 0.5 });
    expect(nextGauge(62.5)?.gauge.name).toBe('Heavy');
    expect(nextGauge(1000)).toBeNull();
  });

  it('winds the spring from 0 to 1 across the card', () => {
    expect(springLoad(0)).toBe(0);
    expect(springLoad(25)).toBeCloseTo(1 / 3);
    expect(springLoad(2000)).toBe(1);
    expect(springLoad(60)).toBeGreaterThan(springLoad(30));
  });
});

describe('springbackFor', () => {
  it('pays the gauge rate inside one bracket', () => {
    expect(springbackFor(0, 1.2)).toBe(0.048);
    expect(springbackFor(30, 10)).toBe(0.8);
    expect(springbackFor(2000, 100)).toBe(26);
  });

  it('splits an entry that crosses a threshold: no cliff', () => {
    // $20 to $30 of rake: $5 at 4%, $5 at 8%.
    expect(springbackFor(20, 10)).toBe(0.6);
    // Crossing every gauge at once.
    expect(springbackFor(0, 1100)).toBe(25 * 0.04 + 75 * 0.08 + 900 * 0.16 + 100 * 0.26);
  });

  it('is additive, so splitting entries never changes the total', () => {
    const whole = springbackFor(0, 140);
    const parts = springbackFor(0, 20) + springbackFor(20, 70) + springbackFor(90, 50);
    expect(parts).toBeCloseTo(whole, 6);
  });

  it('never pays less for more rake, and the effective rate trails the marginal rate', () => {
    let prev = 0;
    for (const rake of [1, 24, 25, 26, 99, 100, 101, 999, 1000, 1001, 4000]) {
      const sb = springbackFor(0, rake);
      expect(sb).toBeGreaterThan(prev);
      prev = sb;
      expect(effectiveRatePct(rake)).toBeLessThanOrEqual(gaugeFor(rake).ratePct + 1e-9);
    }
    expect(effectiveRatePct(0)).toBe(4);
    expect(effectiveRatePct(600)).toBeCloseTo(14.5, 1);
  });
});

describe('planEntries', () => {
  const base = { entryFee: 10, rakePct: 12, seasonRake: 0, credit: 0, useCredit: true };

  it('prices cash entries and their Springback', () => {
    const p = planEntries({ ...base, count: 3 });
    expect(p).toMatchObject({ total: 30, fromCredit: 0, fromCash: 30, rake: 3.6, earningRake: 3.6, springback: 0.144 });
    expect(p.entries).toHaveLength(3);
  });

  it('walks the brackets entry by entry', () => {
    const p = planEntries({ ...base, entryFee: 25, count: 2, seasonRake: 23 });
    // Each entry is $3 of rake: 23 to 26 crosses into Medium, 26 to 29 is all Medium.
    expect(p.entries[0].springback).toBeCloseTo(2 * 0.04 + 1 * 0.08, 6);
    expect(p.entries[1].springback).toBeCloseTo(3 * 0.08, 6);
  });

  it('entries paid with credit earn nothing', () => {
    const p = planEntries({ ...base, count: 1, credit: 10 });
    expect(p).toMatchObject({ fromCredit: 10, fromCash: 0, earningRake: 0, springback: 0, rake: 1.2 });
  });

  it('a part-credit entry earns on the cash part only', () => {
    const p = planEntries({ ...base, count: 2, credit: 14.2 });
    expect(p.fromCredit).toBe(14.2);
    expect(p.fromCash).toBe(5.8);
    expect(p.entries[0]).toMatchObject({ fromCredit: 10, springback: 0 });
    expect(p.entries[1].fromCredit).toBe(4.2);
    expect(p.earningRake).toBeCloseTo(5.8 * 0.12, 6);
    expect(p.springback).toBeCloseTo(5.8 * 0.12 * 0.04, 4);
  });

  it('leaves credit alone when the toggle is off', () => {
    const p = planEntries({ ...base, count: 1, credit: 10, useCredit: false });
    expect(p).toMatchObject({ fromCredit: 0, fromCash: 10, springback: 0.048 });
  });
});

describe('weekly payout', () => {
  const at = (iso: string) => Date.parse(iso);

  it('pays on the next Wednesday, strictly after the entry', () => {
    // 2026-11-15 is a Sunday.
    expect(new Date(nextPayout(at('2026-11-15T12:00:00Z'))).toISOString()).toBe('2026-11-18T15:00:00.000Z');
    expect(new Date(nextPayout(at('2026-11-18T14:59:00Z'))).toISOString()).toBe('2026-11-18T15:00:00.000Z');
    expect(new Date(nextPayout(at('2026-11-18T15:00:00Z'))).toISOString()).toBe('2026-11-25T15:00:00.000Z');
    expect(new Date(nextPayout(at('2026-11-19T00:00:00Z'))).getUTCDay()).toBe(3);
  });

  it('adds up each week and skips what is paid or not due', () => {
    const w1 = nextPayout(at('2026-11-15T12:00:00Z'));
    const w2 = nextPayout(w1);
    const accruals = [
      { amount: 0.048, payOn: w1 },
      { amount: 0.3, payOn: w1, count: 3 },
      { amount: 1, payOn: w1, paidAt: w1 },
      { amount: 0.5, payOn: w2 },
    ];
    expect(pendingSpringback(accruals)).toBe(0.848);
    expect(payoutsDue(accruals, w1 - 1)).toEqual([]);
    expect(payoutsDue(accruals, w1)).toEqual([{ payOn: w1, amount: 0.35, entries: 4 }]);
    expect(payoutsDue(accruals, w2)).toEqual([
      { payOn: w1, amount: 0.35, entries: 4 },
      { payOn: w2, amount: 0.5, entries: 1 },
    ]);
  });

  it('marks a paid week paid and rolls a sub-cent week forward', () => {
    const w1 = nextPayout(at('2026-11-15T12:00:00Z'));
    const paid = settleAccruals<Accrual>([{ amount: 0.2, payOn: w1 }, { amount: 0.16, payOn: w1 }], w1);
    expect(paid.payouts).toEqual([{ payOn: w1, amount: 0.36, entries: 2 }]);
    expect(paid.accruals.every((a) => a.paidAt === w1)).toBe(true);
    expect(settleAccruals(paid.accruals, w1 + 1).payouts).toEqual([]);

    const tiny = settleAccruals([{ amount: 0.0048, payOn: w1 }], w1);
    expect(tiny.payouts).toEqual([]);
    expect(tiny.accruals[0]).toEqual({ amount: 0.0048, payOn: nextPayout(w1) });
    expect(pendingSpringback(tiny.accruals)).toBe(0.0048);
  });
});
