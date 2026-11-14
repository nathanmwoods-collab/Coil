import { PLAYER_MAP, PLAYERS, simulateSeason, simulateTournament } from '../data';
import {
  exposure,
  optimalLineup,
  rosterOf,
  rosterPlayers,
  type ExposureRow,
  type Player,
  type WeekLineup,
} from '../engine';
import { ME, type DraftEntry } from './useApp';

export const PLAYER_BY_ID: Map<string, Player> = PLAYER_MAP;
export const SEASON_WEEKS = 17;

export interface Standing {
  entrantId: string;
  name: string;
  total: number;
  weeklyTotals: number[];
  rank: number;
}

export interface DraftResult {
  standings: Standing[];
  myRank: number;
  myTotal: number;
  roster: Player[];
  weeks: WeekLineup[];
  /** points per player across the season when they were in the optimal lineup */
  countedPoints: Record<string, number>;
  countedWeeks: Record<string, number>;
}

const cache = new Map<string, DraftResult>();

/** Simulated season + tournament for a completed draft. Deterministic per draft id, cached. */
export function draftResult(d: DraftEntry): DraftResult {
  const hit = cache.get(d.id);
  if (hit) return hit;
  const season = seasonFor(d.seed);
  const raw = simulateTournament(d.state, PLAYERS, season);
  const names = new Map(d.state.entrants.map((e) => [e.id, e.name]));
  const standings: Standing[] = [...raw]
    .sort((a, b) => b.total - a.total)
    .map((r, i) => ({ ...r, name: names.get(r.entrantId) ?? r.entrantId, rank: i + 1 }));
  const mine = standings.find((s) => s.entrantId === ME);
  const roster = rosterPlayers(d.state, ME, PLAYER_BY_ID);
  const weeks = season.map((w) => optimalLineup(roster, w, d.state.config.lineup));
  const countedPoints: Record<string, number> = {};
  const countedWeeks: Record<string, number> = {};
  for (const w of weeks) {
    for (const s of w.starters) {
      countedPoints[s.playerId] = (countedPoints[s.playerId] ?? 0) + s.points;
      countedWeeks[s.playerId] = (countedWeeks[s.playerId] ?? 0) + 1;
    }
  }
  const res: DraftResult = {
    standings,
    myRank: mine?.rank ?? 0,
    myTotal: mine?.total ?? weeks.reduce((s, w) => s + w.total, 0),
    roster,
    weeks,
    countedPoints,
    countedWeeks,
  };
  cache.set(d.id, res);
  return res;
}

/** Season points per player for a given week of a draft's simulated season. */
const seasonCache = new Map<number, Record<string, number>[]>();
export function seasonFor(seed: number) {
  let s = seasonCache.get(seed);
  if (!s) {
    s = simulateSeason(PLAYERS, seed, SEASON_WEEKS);
    seasonCache.set(seed, s);
  }
  return s;
}

export interface ExposureWithDollars extends ExposureRow {
  dollars: number;
}

/** Exposure across completed drafts, plus mock $ spent on teams containing each player. */
export function exposureFor(drafts: DraftEntry[]): ExposureWithDollars[] {
  const teams = drafts.map((d) => rosterOf(d.state, ME).map((p) => ({ playerId: p.playerId, overall: p.overall })));
  const dollars = new Map<string, number>();
  drafts.forEach((d, i) => {
    for (const p of teams[i]) dollars.set(p.playerId, (dollars.get(p.playerId) ?? 0) + d.entryFee);
  });
  return exposure(teams, PLAYER_BY_ID).map((r) => ({ ...r, dollars: dollars.get(r.player.id) ?? 0 }));
}
