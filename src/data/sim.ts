/**
 * Mock season simulator: per-week half-PPR points for every player, with
 * boom/bust variance, bye weeks (0) and occasional injury absences (0).
 * Deterministic for a given seed and independent of player array order.
 */
import { mulberry32 } from '../engine/draft';
import { seasonTotal } from '../engine/scoring';
import { rosterPlayers } from '../engine/draft';
import type { DraftState, Player, Position } from '../engine/types';

/** Per-game coefficient of variation by position (WR/TE most volatile). */
const CV: Record<Position, number> = { QB: 0.32, RB: 0.48, WR: 0.52, TE: 0.58 };
/** Season-level over/under-performance spread vs projection. */
const SEASON_SD = 0.15;
const INJURY_RATE = 0.14; // chance a player misses a stretch of games

function hashId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function normal(rand: () => number): number {
  const u = Math.max(rand(), 1e-12);
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function simulateSeason(players: Player[], seed: number, weeks = 17): Record<string, number>[] {
  const out: Record<string, number>[] = Array.from({ length: weeks }, () => ({}));
  for (const p of players) {
    const rand = mulberry32((seed ^ hashId(p.id)) >>> 0);
    const games = p.bye >= 1 && p.bye <= weeks ? weeks - 1 : weeks;
    const seasonFactor = Math.max(0.4, 1 + normal(rand) * SEASON_SD);
    const perGame = (p.projPoints / Math.max(1, games)) * seasonFactor;
    // Injury: miss 1-4 consecutive weeks starting at a random week.
    let injStart = -1;
    let injLen = 0;
    if (rand() < INJURY_RATE) {
      injStart = 1 + Math.floor(rand() * weeks);
      injLen = 1 + Math.floor(rand() * 4);
    }
    for (let w = 1; w <= weeks; w++) {
      const r1 = rand();
      const z = normal(rand);
      let pts: number;
      if (w === p.bye || (w >= injStart && w < injStart + injLen)) {
        pts = 0;
      } else {
        // Skewed weekly outcome: mostly near the mean, with ~8% boom weeks
        // and ~8% dud weeks. Mixture keeps the mean close to perGame.
        let m: number;
        if (r1 < 0.08) m = 1.8 + Math.abs(z) * 0.4; // boom
        else if (r1 < 0.16) m = 0.2 * Math.abs(z); // dud
        else m = 0.97 + z * CV[p.position] * 0.75;
        pts = Math.max(0, perGame * m);
      }
      out[w - 1][p.id] = Math.round(pts * 10) / 10;
    }
  }
  return out;
}

export interface Standing {
  entrantId: string;
  total: number;
  weeklyTotals: number[];
}

/** Best-ball standings for a completed draft, sorted by season total (desc). */
export function simulateTournament(
  state: DraftState,
  players: Player[] | Map<string, Player>,
  season: Record<string, number>[],
): Standing[] {
  const byId = players instanceof Map ? players : new Map(players.map((p) => [p.id, p]));
  return state.entrants
    .map((e) => {
      const roster = rosterPlayers(state, e.id, byId);
      const res = seasonTotal(roster, season, state.config.lineup);
      return { entrantId: e.id, total: res.total, weeklyTotals: res.perWeek.map((w) => w.total) };
    })
    .sort((a, b) => b.total - a.total);
}
