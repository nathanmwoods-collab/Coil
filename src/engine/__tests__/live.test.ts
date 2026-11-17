import { describe, expect, it } from 'vitest';

import { CONTESTS } from '../../data/contests';
import { payoutTable } from '../../data/payouts';
import { groupBy, isAdvancing, liveSummary, podStandings, winningAt } from '../live';

const teams = [
  { entrantId: 'a', weeklyTotals: [100, 90, 80] },
  { entrantId: 'b', weeklyTotals: [90, 120, 60] },
  { entrantId: 'c', weeklyTotals: [100, 70, 150] },
];

describe('live standings', () => {
  it('ranks through the current week only', () => {
    expect(podStandings(teams, 2).map((l) => [l.entrantId, l.points, l.rank])).toEqual([
      ['b', 210, 1],
      ['a', 190, 2],
      ['c', 170, 3],
    ]);
    expect(podStandings(teams, 3)[0]).toMatchObject({ entrantId: 'c', points: 320, rank: 1 });
    expect(podStandings(teams, 99)[0].points).toBe(320);
  });

  it('shares rank on ties and has no rank before week 1', () => {
    expect(podStandings(teams, 1).map((l) => l.rank)).toEqual([1, 1, 3]);
    expect(podStandings(teams, 0).every((l) => l.rank === null && l.points === 0)).toBe(true);
  });

  it('computes winnings and advancing from a payout table', () => {
    const t = { places: [30, 20], advance: 2 };
    expect(winningAt(1, t)).toBe(30);
    expect(winningAt(2, t)).toBe(20);
    expect(winningAt(3, t)).toBe(0);
    expect(winningAt(null, t)).toBe(0);
    expect(isAdvancing(2, t)).toBe(true);
    expect(isAdvancing(3, t)).toBe(false);
    expect(isAdvancing(1, { places: [10], advance: 0 })).toBe(false);
  });

  it('sums the overview and groups in first-seen order', () => {
    expect(liveSummary([{ fee: 10, winning: 30 }, { fee: 2.5, winning: 0 }])).toEqual({ entries: 2, atStake: 12.5, winning: 30 });
    expect(groupBy(['a1', 'b1', 'a2'], (x) => x[0]).map((g) => [g.key, g.items])).toEqual([['a', ['a1', 'a2']], ['b', ['b1']]]);
  });
});

describe('mock payout tables', () => {
  it('every contest has one that never pays more than its pool', () => {
    for (const c of CONTESTS) {
      const t = payoutTable(c);
      expect(t.places.length).toBeGreaterThan(0);
      expect(t.places.length).toBeLessThan(c.teams);
      expect(t.places.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(c.prizePool + 0.01);
      for (let i = 1; i < t.places.length; i++) expect(t.places[i]).toBeLessThanOrEqual(t.places[i - 1]);
    }
  });
  it('tournament pods advance the top 2, sit & gos split the pool', () => {
    const by = (id: string) => payoutTable(CONTESTS.find((c) => c.id === id)!);
    expect(by('c_two_minute_drill')).toEqual({ places: [30, 20], advance: 2 });
    expect(by('c_sng_huddle_12')).toEqual({ places: [162, 81, 27], advance: 0 });
    expect(by('c_sng_trifecta_3')).toEqual({ places: [8.1], advance: 0 });
  });
});
