import { describe, expect, it } from 'vitest';
import { optimalLineup, seasonTotal } from '../scoring';
import { exposure } from '../exposure';
import { mk } from './helpers';

const roster = [
  mk('qb1', 'QB', 1), mk('qb2', 'QB', 2),
  mk('rb1', 'RB', 3), mk('rb2', 'RB', 4), mk('rb3', 'RB', 5),
  mk('wr1', 'WR', 6), mk('wr2', 'WR', 7), mk('wr3', 'WR', 8), mk('wr4', 'WR', 9),
  mk('te1', 'TE', 10), mk('te2', 'TE', 11),
];

describe('optimalLineup', () => {
  it('starts the best player at each slot and fills FLEX from RB/WR/TE leftovers', () => {
    const w = { qb1: 10, qb2: 30, rb1: 5, rb2: 20, rb3: 15, wr1: 8, wr2: 12, wr3: 3, wr4: 11, te1: 2, te2: 9 };
    const lu = optimalLineup(roster, w);
    const bySlot = (slot: string) => lu.starters.filter((s) => s.slot === slot).map((s) => s.playerId).sort();
    expect(bySlot('QB')).toEqual(['qb2']); // backup QB never used as FLEX
    expect(bySlot('RB')).toEqual(['rb2', 'rb3']);
    expect(bySlot('WR')).toEqual(['wr1', 'wr2', 'wr4']);
    expect(bySlot('TE')).toEqual(['te2']);
    expect(bySlot('FLEX')).toEqual(['rb1']); // rb1 5 > wr3 3, te1 2
    expect(lu.starters).toHaveLength(8);
    expect(lu.total).toBe(30 + 20 + 15 + 12 + 11 + 8 + 9 + 5);
  });

  it('FLEX can be a TE', () => {
    const w = { qb1: 1, rb1: 1, rb2: 1, rb3: 0, wr1: 1, wr2: 1, wr3: 1, wr4: 0, te1: 25, te2: 18 };
    const lu = optimalLineup(roster, w);
    expect(lu.starters.find((s) => s.slot === 'FLEX')?.playerId).toBe('te2');
    expect(lu.starters.find((s) => s.slot === 'TE')?.playerId).toBe('te1');
  });

  it('treats missing points as 0 and handles short rosters', () => {
    const lu = optimalLineup([mk('a', 'WR', 1)], {});
    expect(lu.total).toBe(0);
    expect(lu.starters).toHaveLength(1);
  });

  it('seasonTotal sums weekly optimal totals', () => {
    const weeks: Record<string, number>[] = [{ qb1: 20, rb1: 10 }, { qb2: 15, te1: 5 }];
    const res = seasonTotal(roster, weeks);
    expect(res.perWeek.map((w) => w.total)).toEqual([30, 20]);
    expect(res.total).toBe(50);
  });
});

describe('exposure', () => {
  it('computes counts, pct and average pick', () => {
    const players = new Map([mk('a', 'WR', 1), mk('b', 'RB', 2), mk('c', 'TE', 3)].map((p) => [p.id, p]));
    const teams = [
      [{ playerId: 'a', overall: 3 }, { playerId: 'b', overall: 22 }],
      [{ playerId: 'a', overall: 5 }],
      [{ playerId: 'c', overall: 100 }, { playerId: 'zz', overall: 1 }],
    ];
    const rows = exposure(teams, players);
    expect(rows.map((r) => r.player.id)).toEqual(['a', 'b', 'c']);
    expect(rows[0]).toMatchObject({ count: 2, pct: 66.7, avgPick: 4 });
    expect(rows[1]).toMatchObject({ count: 1, pct: 33.3, avgPick: 22 });
    expect(exposure([], players)).toEqual([]);
  });
});
