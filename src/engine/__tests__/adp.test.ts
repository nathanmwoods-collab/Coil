import { describe, expect, it } from 'vitest';

import { adpMove, adpValue, emptyAdp, updateAdp, type AdpDraft } from '../adp';

const DAY = 86_400_000;
const T0 = 1_800_000_000_000;
const human = (playerId: string, overall: number) => ({ playerId, overall, byBot: false });
const bot = (playerId: string, overall: number) => ({ playerId, overall, byBot: true });
const draft = (at: number, picks: AdpDraft['picks'], totalPicks = 216): AdpDraft => ({ at, totalPicks, picks });
const read = { priorWeight: 4, minSamples: 1 };

describe('updateAdp', () => {
  it('does not mutate the prior and counts drafts', () => {
    const prior = emptyAdp(T0);
    const next = updateAdp(prior, [draft(T0, [human('a', 3)])]);
    expect(prior).toEqual(emptyAdp(T0));
    expect(next.drafts).toBe(1);
    expect(next.players.a).toEqual({ w: 1, wp: 3, n: 1 });
  });

  it('blends with the seed and converges as real picks accumulate', () => {
    let t = emptyAdp(T0);
    const seed = 20;
    const seen: number[] = [];
    for (let i = 0; i < 60; i++) {
      t = updateAdp(t, [draft(T0, [human('a', 10)])], { now: T0 });
      seen.push(adpValue(t, 'a', seed, read));
    }
    // (4*20 + 10) / 5 = 18 after one pick; then monotonically toward 10.
    expect(seen[0]).toBe(18);
    for (let i = 1; i < seen.length; i++) expect(seen[i]).toBeLessThanOrEqual(seen[i - 1]);
    expect(seen[59]).toBeLessThan(10.7);
    expect(seen[59]).toBeGreaterThanOrEqual(10);
  });

  it('a bigger prior weight moves slower', () => {
    const t = updateAdp(emptyAdp(T0), [draft(T0, [human('a', 10)])]);
    expect(adpValue(t, 'a', 20, { priorWeight: 1, minSamples: 1 })).toBe(15);
    expect(adpValue(t, 'a', 20, { priorWeight: 9, minSamples: 1 })).toBe(19);
  });

  it('holds the seed until the minimum sample is met', () => {
    let t = updateAdp(emptyAdp(T0), [draft(T0, [human('a', 10)])]);
    expect(adpValue(t, 'a', 20, { priorWeight: 4, minSamples: 2 })).toBe(20);
    t = updateAdp(t, [draft(T0, [human('a', 10)])]);
    expect(adpValue(t, 'a', 20, { priorWeight: 4, minSamples: 2 })).toBeCloseTo(16.7, 1);
    expect(adpValue(t, 'never-seen', 55, read)).toBe(55);
    expect(adpValue(undefined, 'a', 20)).toBe(20);
  });

  it('down-weights bot picks, or excludes them at weight 0', () => {
    const d = [draft(T0, [bot('a', 10)])];
    const quarter = updateAdp(emptyAdp(T0), d, { botWeight: 0.25 });
    expect(quarter.players.a.w).toBe(0.25);
    expect(adpValue(quarter, 'a', 20, read)).toBeGreaterThan(adpValue(updateAdp(emptyAdp(T0), [draft(T0, [human('a', 10)])]), 'a', 20, read));
    const none = updateAdp(emptyAdp(T0), d, { botWeight: 0 });
    expect(none.players.a).toBeUndefined();
    expect(adpValue(none, 'a', 20, read)).toBe(20);
  });

  it('decays old observations with a half-life', () => {
    const old = updateAdp(emptyAdp(T0), [draft(T0, [human('a', 10)])], { halfLifeDays: 14 });
    const later = updateAdp(old, [], { now: T0 + 14 * DAY, halfLifeDays: 14 });
    expect(later.players.a.w).toBeCloseTo(0.5, 6);
    expect(later.players.a.wp).toBeCloseTo(5, 6);
    expect(later.players.a.n).toBe(1);
    // A fresh pick outweighs a month-old one.
    const mixed = updateAdp(old, [draft(T0 + 28 * DAY, [human('a', 30)])], { halfLifeDays: 14 });
    expect(adpValue(mixed, 'a', 20, { priorWeight: 0, minSamples: 1 })).toBe(26);
    // A draft that arrives late is weighted by its own age, and time never runs backwards.
    const late = updateAdp(later, [draft(T0, [human('b', 5)])], { halfLifeDays: 14 });
    expect(late.asOf).toBe(T0 + 14 * DAY);
    expect(late.players.b.w).toBeCloseTo(0.5, 6);
  });

  it('observes undrafted players at total picks + 1', () => {
    const t = updateAdp(emptyAdp(T0), [draft(T0, [human('a', 1), human('b', 2)], 2)], { universe: ['a', 'b', 'c'] });
    expect(t.players.c).toEqual({ w: 1, wp: 3, n: 1 });
    expect(adpValue(t, 'c', 2.5, { priorWeight: 1, minSamples: 1 })).toBe(2.8);
    // Without a universe nothing is assumed about players who were not picked.
    expect(updateAdp(emptyAdp(T0), [draft(T0, [human('a', 1)], 2)]).players.c).toBeUndefined();
    // Undrafted weight follows the draft's mix of humans and bots.
    const mixed = updateAdp(emptyAdp(T0), [draft(T0, [human('a', 1), bot('b', 2)], 2)], { universe: ['a', 'b', 'c'], botWeight: 0.5 });
    expect(mixed.players.c.w).toBe(0.75);
  });

  it('ignores empty drafts and flags movers outside the dead band', () => {
    expect(updateAdp(emptyAdp(T0), [draft(T0, [])]).drafts).toBe(0);
    expect(adpMove(20, 18)).toBe('up');
    expect(adpMove(20, 22.4)).toBe('down');
    expect(adpMove(20, 20.3)).toBeNull();
  });
});
