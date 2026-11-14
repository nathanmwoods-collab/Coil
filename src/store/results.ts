import { payoutTable, PLAYER_MAP, PLAYERS, SEASON_WEEKS, simulateSeason, simulateTournament } from '../data';
import {
  exposure,
  isAdvancing,
  optimalLineup,
  podStandings,
  winningAt,
  rosterOf,
  rosterPlayers,
  type ExposureRow,
  type Player,
  type WeekLineup,
} from '../engine';
import { contestById, ME, teamName, type DraftEntry } from './useApp';

export const PLAYER_BY_ID: Map<string, Player> = PLAYER_MAP;
export { SEASON_WEEKS };

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

export type BuildName = 'Zero RB' | 'Hero RB' | 'Robust RB' | 'Balanced';

export interface TeamIdentity {
  build: BuildName;
  /** e.g. "Hurts + A.J. Brown", or null with no QB stack. */
  stack: string | null;
  counts: Record<'QB' | 'RB' | 'WR' | 'TE', number>;
  /** One wry line about how the team was built. */
  line: string;
}

const lastName = (full: string) => {
  const parts = full.split(' ').filter((w) => !/^(jr\.?|sr\.?|ii|iii|iv|v)$/i.test(w));
  return parts[parts.length - 1] ?? full;
};

/** The "Your coil" card: a build name, your best stack and one wry line, all from the roster. */
export function teamIdentity(state: DraftEntry['state'], entrantId: string = ME): TeamIdentity {
  const picks = rosterOf(state, entrantId)
    .map((p) => ({ pick: p, player: PLAYER_BY_ID.get(p.playerId) }))
    .filter((x): x is { pick: typeof x.pick; player: Player } => !!x.player);

  const counts = { QB: 0, RB: 0, WR: 0, TE: 0 };
  for (const x of picks) counts[x.player.position]++;

  const earlyRb = picks.filter((x) => x.pick.round <= 6 && x.player.position === 'RB').length;
  const build: BuildName = earlyRb === 0 ? 'Zero RB' : earlyRb === 1 ? 'Hero RB' : earlyRb >= 3 ? 'Robust RB' : 'Balanced';

  let stack: string | null = null;
  let bestScore = -1;
  for (const qb of picks.filter((x) => x.player.position === 'QB')) {
    const mates = picks
      .filter((x) => (x.player.position === 'WR' || x.player.position === 'TE') && x.player.team === qb.player.team)
      .sort((a, b) => a.player.adp - b.player.adp);
    if (!mates.length) continue;
    const score = mates.length * 1000 - mates[0].player.adp;
    if (score > bestScore) {
      bestScore = score;
      stack = [lastName(qb.player.name), ...mates.slice(0, 2).map((m) => m.player.name)].join(' + ');
    }
  }

  const reaches = picks.filter((x) => x.pick.overall < x.player.adp - 12).length;
  const values = picks.filter((x) => x.pick.overall > x.player.adp + 12).length;
  const line =
    reaches >= 4
      ? 'Took your guys. ADP can deal with it.'
      : values >= 4
        ? 'Let the room hand you value all day.'
        : build === 'Zero RB'
          ? 'Let everyone else pay for running backs.'
          : build === 'Robust RB'
            ? 'Bought the whole backfield early. Bold.'
            : build === 'Hero RB'
              ? 'One anchor back, then all the swings.'
              : 'Took the chalk early and the swings late.';

  return { build, stack, counts, line };
}

export interface LiveTeam {
  id: string;
  contestId: string;
  name: string;
  fee: number;
  /** Rank in the pod through the current week; null before week 1. */
  rank: number | null;
  of: number;
  points: number;
  /** MOCK amount this team would win if the season ended now. */
  winning: number;
  advancing: boolean;
  counts: Record<'QB' | 'RB' | 'WR' | 'TE', number>;
  createdAt: number;
}

const countsCache = new Map<string, LiveTeam['counts']>();

/** A completed draft as it stands after `week` weeks of its simulated season. */
export function liveTeam(d: DraftEntry, week: number): LiveTeam {
  const r = draftResult(d);
  const mine = podStandings(r.standings, week).find((l) => l.entrantId === ME);
  const contest = contestById(d.contestId);
  const table = contest ? payoutTable(contest) : { places: [], advance: 0 };
  let counts = countsCache.get(d.id);
  if (!counts) {
    counts = { QB: 0, RB: 0, WR: 0, TE: 0 };
    for (const p of r.roster) counts[p.position]++;
    countsCache.set(d.id, counts);
  }
  const rank = mine?.rank ?? null;
  return {
    id: d.id,
    contestId: d.contestId,
    name: teamName(d),
    fee: d.entryFee,
    rank,
    of: d.state.config.teams,
    points: mine?.points ?? 0,
    winning: winningAt(rank, table),
    advancing: isAdvancing(rank, table),
    counts,
    createdAt: d.createdAt,
  };
}
