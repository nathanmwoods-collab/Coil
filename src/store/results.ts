import { payoutTable, PLAYER_MAP, PLAYERS, SEASON_WEEKS, simulateSeason, simulateTournament } from '../data';
import {
  archetype,
  buildProfile,
  type Archetype,
  exposure,
  primaryStack,
  stackTeams,
  type NameContext,
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

/**
 * One line on how the pod went, from the result itself (round-2 copy rows 15-18).
 * Middle ranks name the round whose pick scored furthest below that round's
 * pod average, the "blame round", when one stands out.
 */
export function verdictFor(d: DraftEntry): string {
  const r = draftResult(d);
  const teams = d.state.config.teams;
  if (r.myRank === 1) return "Pod's yours.";
  if (r.myRank === 2) return 'Second. Close enough to taste it.';
  if (r.myRank === teams) return 'Dead last. Somebody had to.';
  const season = seasonFor(d.seed);
  const total = (pid: string) => season.reduce((n, w) => n + (w[pid] ?? 0), 0);
  let worst: { round: number; by: number } | null = null;
  for (let round = 1; round <= d.state.config.rounds; round++) {
    const picks = d.state.picks.filter((p) => p.round === round);
    const mine = picks.find((p) => p.entrantId === ME);
    if (!mine || picks.length < 2) continue;
    const avg = picks.reduce((n, p) => n + total(p.playerId), 0) / picks.length;
    const by = avg - total(mine.playerId);
    if (!worst || by > worst.by) worst = { round, by };
  }
  const second = r.standings.find((x) => x.rank === 2);
  const short = second ? Math.max(0, second.total - r.myTotal) : 0;
  return worst && worst.by > 20 && short > 0 ? `${Math.round(short)} points short. Blame round ${worst.round}.` : 'Outdrafted. It happens.';
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

export type BuildName = Archetype;

export interface TeamIdentity {
  build: BuildName;
  /** Every build label that applies, `build` first. */
  tags: BuildName[];
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

  const profile = buildProfile(
    picks.map((x) => ({ round: x.pick.round, position: x.player.position, name: x.player.name })),
    state.config.rounds,
  );

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

  return { build: profile.primary, tags: profile.tags, stack, counts, line: profile.line };
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
  /** Points behind the last paying spot in the pod, when outside it. */
  gap: number | null;
  counts: Record<'QB' | 'RB' | 'WR' | 'TE', number>;
  createdAt: number;
}

const countsCache = new Map<string, LiveTeam['counts']>();

/** A completed draft as it stands after `week` weeks of its simulated season. */
export function liveTeam(d: DraftEntry, week: number): LiveTeam {
  const r = draftResult(d);
  const pod = podStandings(r.standings, week);
  const mine = pod.find((l) => l.entrantId === ME);
  const contest = contestById(d.contestId);
  const table = contest ? payoutTable(contest) : { places: [], advance: 0 };
  let counts = countsCache.get(d.id);
  if (!counts) {
    counts = { QB: 0, RB: 0, WR: 0, TE: 0 };
    for (const p of r.roster) counts[p.position]++;
    countsCache.set(d.id, counts);
  }
  const rank = mine?.rank ?? null;
  // The cut line: the lowest rank that still pays or advances.
  let lastPaid = 0;
  for (let k = 1; k <= d.state.config.teams; k++) if (winningAt(k, table) > 0 || isAdvancing(k, table)) lastPaid = k;
  const line = pod.find((l) => l.rank === lastPaid);
  const gap = rank !== null && lastPaid > 0 && rank > lastPaid && line && mine ? Math.max(0, line.points - mine.points) : null;
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
    gap,
    counts,
    createdAt: d.createdAt,
  };
}

/** Everything `formatTeamName` needs to name a completed (or in-progress) team. */
export function namingContext(d: DraftEntry): NameContext {
  const picks = rosterOf(d.state, ME)
    .map((p) => ({ round: p.round, player: PLAYER_BY_ID.get(p.playerId) }))
    .filter((x): x is { round: number; player: Player } => !!x.player);
  const counts = { QB: 0, RB: 0, WR: 0, TE: 0 };
  for (const x of picks) counts[x.player.position]++;
  return {
    counts,
    archetype: archetype(picks.map((x) => ({ round: x.round, position: x.player.position })), d.state.config.rounds),
    stack: primaryStack(picks.map((x) => x.player)),
    stackTeams: stackTeams(picks.map((x) => x.player)),
    draftedAt: d.createdAt,
    contestName: contestById(d.contestId)?.name ?? 'Draft',
    slot: d.state.entrants.findIndex((e) => e.id === ME) + 1,
  };
}
