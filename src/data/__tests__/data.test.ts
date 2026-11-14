import { describe, expect, it } from 'vitest';
import { CONTESTS, PLAYERS, PLAYER_MAP, isSitAndGo, simulateSeason, simulateTournament } from '..';
import { runBotDraft } from '../../engine/__tests__/helpers';

describe('player pool', () => {
  it('has ~260 unique, well-formed players sorted by ADP', () => {
    expect(PLAYERS.length).toBeGreaterThanOrEqual(240);
    expect(PLAYER_MAP.size).toBe(PLAYERS.length);
    for (let i = 1; i < PLAYERS.length; i++) expect(PLAYERS[i].adp).toBeGreaterThan(PLAYERS[i - 1].adp);
    for (const p of PLAYERS) {
      expect(p.id).toMatch(/^p_[a-z]+(_[a-z]+)+$/);
      expect(p.bye).toBeGreaterThanOrEqual(5);
      expect(p.bye).toBeLessThanOrEqual(14);
      expect(p.projPoints).toBeGreaterThan(0);
    }
    // one bye per team
    const byes = new Map<string, number>();
    for (const p of PLAYERS) {
      expect(byes.get(p.team) ?? p.bye).toBe(p.bye);
      byes.set(p.team, p.bye);
    }
    expect(byes.size).toBe(32);
  });

  it('has enough depth at each position for 12x18', () => {
    const c = { QB: 0, RB: 0, WR: 0, TE: 0 };
    for (const p of PLAYERS) c[p.position]++;
    expect(c.QB).toBeGreaterThanOrEqual(30);
    expect(c.TE).toBeGreaterThanOrEqual(30);
    expect(c.RB).toBeGreaterThanOrEqual(70);
    expect(c.WR).toBeGreaterThanOrEqual(90);
  });
});

describe('contests', () => {
  it('has one flagship, multiple Sit & Go sizes, fast and slow clocks', () => {
    expect(CONTESTS.filter((c) => c.tag === 'flagship')).toHaveLength(1);
    const sng = CONTESTS.filter(isSitAndGo).map((c) => c.teams).sort((a, b) => a - b);
    expect(sng).toEqual([3, 6, 10, 12]);
    expect(CONTESTS.some((c) => c.pickClockSec === 30)).toBe(true);
    expect(CONTESTS.some((c) => c.pickClockSec === 8 * 3600)).toBe(true);
    expect(CONTESTS.some((c) => c.tag === 'beginner' && c.maxPerUser === 1)).toBe(true);
    expect(new Set(CONTESTS.map((c) => c.id)).size).toBe(CONTESTS.length);
    for (const c of CONTESTS) expect(c.filled).toBeLessThanOrEqual(c.maxEntries);
  });
});

describe('simulateSeason', () => {
  it('is deterministic and order-independent', () => {
    const a = simulateSeason(PLAYERS, 123);
    const b = simulateSeason([...PLAYERS].reverse(), 123);
    expect(b).toEqual(a);
    expect(simulateSeason(PLAYERS, 124)).not.toEqual(a);
    expect(a).toHaveLength(17);
    expect(simulateSeason(PLAYERS, 1, 14)).toHaveLength(14);
  });

  it('zeros bye weeks and never goes negative', () => {
    const s = simulateSeason(PLAYERS, 5);
    for (const p of PLAYERS) {
      expect(s[p.bye - 1][p.id]).toBe(0);
      for (const w of s) expect(w[p.id]).toBeGreaterThanOrEqual(0);
    }
  });

  it('season sums track projections on average, with real variance', () => {
    const seeds = Array.from({ length: 60 }, (_, i) => i + 1);
    // pool-wide: total simulated points vs total projection
    let simTotal = 0;
    for (const seed of seeds) for (const w of simulateSeason(PLAYERS, seed)) for (const v of Object.values(w)) simTotal += v;
    const projTotal = PLAYERS.reduce((s, p) => s + p.projPoints, 0) * seeds.length;
    expect(simTotal / projTotal).toBeGreaterThan(0.92);
    expect(simTotal / projTotal).toBeLessThan(1.08);

    // individual: a top player's mean tracks projection; outcomes vary
    const p = PLAYERS[0];
    const seasons = seeds.map((seed) => simulateSeason([p], seed).reduce((s, w) => s + w[p.id], 0));
    const mean = seasons.reduce((s, x) => s + x, 0) / seasons.length;
    expect(Math.abs(mean / p.projPoints - 1)).toBeLessThan(0.1);
    expect(Math.max(...seasons) - Math.min(...seasons)).toBeGreaterThan(p.projPoints * 0.2);
  });
});

describe('simulateTournament', () => {
  it('returns sorted standings for every entrant', () => {
    const draft = runBotDraft(PLAYERS, 11);
    const season = simulateSeason(PLAYERS, 11);
    const st = simulateTournament(draft, PLAYERS, season);
    expect(st).toHaveLength(12);
    expect(new Set(st.map((s) => s.entrantId)).size).toBe(12);
    for (let i = 1; i < st.length; i++) expect(st[i - 1].total).toBeGreaterThanOrEqual(st[i].total);
    for (const s of st) {
      expect(s.weeklyTotals).toHaveLength(17);
      expect(s.total).toBeCloseTo(s.weeklyTotals.reduce((a, b) => a + b, 0), 1);
      expect(s.total).toBeGreaterThan(1000);
    }
    expect(simulateTournament(draft, PLAYER_MAP, season)).toEqual(st);
  });
});
