import type { DraftConfig, DraftState, Entrant, Pick, Player, Position } from './types';

/** Draft slot index (0-based) that owns a given overall pick (1-based) in a snake draft. */
export function slotForPick(overall: number, teams: number): number {
  const round = Math.ceil(overall / teams);
  const idx = (overall - 1) % teams;
  return round % 2 === 1 ? idx : teams - 1 - idx;
}

export function roundOf(overall: number, teams: number) {
  return Math.ceil(overall / teams);
}

export function totalPicks(config: DraftConfig) {
  return config.teams * config.rounds;
}

export function currentPickNumber(state: DraftState): number {
  return state.picks.length + 1;
}

export function onTheClock(state: DraftState): Entrant | null {
  if (state.status !== 'drafting') return null;
  return state.entrants[slotForPick(currentPickNumber(state), state.config.teams)] ?? null;
}

/** Overall pick numbers still to come for an entrant (including the current one if theirs). */
export function upcomingPicksFor(state: DraftState, entrantId: string): number[] {
  const slot = state.entrants.findIndex((e) => e.id === entrantId);
  const out: number[] = [];
  for (let p = currentPickNumber(state); p <= totalPicks(state.config); p++) {
    if (slotForPick(p, state.config.teams) === slot) out.push(p);
  }
  return out;
}

export function picksUntilTurn(state: DraftState, entrantId: string): number | null {
  const next = upcomingPicksFor(state, entrantId)[0];
  return next === undefined ? null : next - currentPickNumber(state);
}

export function createDraft(config: DraftConfig, entrants: Entrant[], now = Date.now()): DraftState {
  const full = entrants.length === config.teams;
  return {
    config,
    entrants,
    picks: [],
    status: full ? 'drafting' : 'filling',
    clockEndsAt: full ? now + config.pickClockSec * 1000 : null,
  };
}

export function joinDraft(state: DraftState, entrant: Entrant, now = Date.now()): DraftState {
  if (state.status !== 'filling') throw new Error('Draft already started');
  const entrants = [...state.entrants, entrant];
  const full = entrants.length === state.config.teams;
  return {
    ...state,
    entrants,
    status: full ? 'drafting' : 'filling',
    clockEndsAt: full ? now + state.config.pickClockSec * 1000 : null,
  };
}

export function draftedIds(state: DraftState): Set<string> {
  return new Set(state.picks.map((p) => p.playerId));
}

export function rosterOf(state: DraftState, entrantId: string): Pick[] {
  return state.picks.filter((p) => p.entrantId === entrantId);
}

export class DraftError extends Error {}

export function makePick(
  state: DraftState,
  entrantId: string,
  playerId: string,
  opts: { auto?: boolean; now?: number } = {},
): DraftState {
  const now = opts.now ?? Date.now();
  if (state.status !== 'drafting') throw new DraftError('Draft is not in progress');
  const clock = onTheClock(state);
  if (!clock || clock.id !== entrantId) throw new DraftError('Not your pick');
  if (draftedIds(state).has(playerId)) throw new DraftError('Player already drafted');
  const overall = currentPickNumber(state);
  const teams = state.config.teams;
  const pick: Pick = {
    overall,
    round: roundOf(overall, teams),
    pickInRound: ((overall - 1) % teams) + 1,
    entrantId,
    playerId,
    auto: !!opts.auto,
    at: now,
  };
  const picks = [...state.picks, pick];
  const complete = picks.length >= totalPicks(state.config);
  return {
    ...state,
    picks,
    status: complete ? 'complete' : 'drafting',
    clockEndsAt: complete ? null : now + state.config.pickClockSec * 1000,
  };
}

/** Soft roster caps so autopick/bots don't build broken teams (18-round default). */
export function positionCaps(rounds: number): Record<Position, number> {
  const scale = rounds / 18;
  return {
    QB: Math.max(2, Math.round(4 * scale)),
    RB: Math.max(3, Math.round(8 * scale)),
    WR: Math.max(4, Math.round(10 * scale)),
    TE: Math.max(2, Math.round(4 * scale)),
  };
}

export function positionCounts(state: DraftState, entrantId: string, players: Map<string, Player>) {
  const c: Record<Position, number> = { QB: 0, RB: 0, WR: 0, TE: 0 };
  for (const p of rosterOf(state, entrantId)) {
    const pl = players.get(p.playerId);
    if (pl) c[pl.position]++;
  }
  return c;
}

function eligible(state: DraftState, entrantId: string, players: Map<string, Player>) {
  const taken = draftedIds(state);
  const caps = positionCaps(state.config.rounds);
  const counts = positionCounts(state, entrantId, players);
  const picksLeft = upcomingPicksFor(state, entrantId).length;
  // Required minimums to field a legal lineup: 1 QB, 2 RB, 3 WR, 1 TE.
  const need: Record<Position, number> = {
    QB: Math.max(0, 1 - counts.QB),
    RB: Math.max(0, 2 - counts.RB),
    WR: Math.max(0, 3 - counts.WR),
    TE: Math.max(0, 1 - counts.TE),
  };
  const totalNeed = need.QB + need.RB + need.WR + need.TE;
  const mustFill = totalNeed >= picksLeft;
  return (pl: Player) =>
    !taken.has(pl.id) && counts[pl.position] < caps[pl.position] && (!mustFill || need[pl.position] > 0);
}

/**
 * Pick used when the clock expires or autodraft is on: first eligible player in
 * the user's queue, else best available by ADP that fits roster caps.
 */
export function autoPickPlayer(
  state: DraftState,
  entrantId: string,
  players: Player[],
  queue: string[] = [],
): Player | null {
  const byId = new Map(players.map((p) => [p.id, p]));
  const ok = eligible(state, entrantId, byId);
  for (const id of queue) {
    const pl = byId.get(id);
    if (pl && ok(pl)) return pl;
  }
  return [...players].sort((a, b) => a.adp - b.adp).find(ok) ?? null;
}

/** Simple seeded PRNG so bot drafts are reproducible in tests. */
export function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Bot drafter: ADP with noise, respecting roster caps. */
export function botPickPlayer(
  state: DraftState,
  entrantId: string,
  players: Player[],
  rand: () => number = Math.random,
): Player | null {
  const byId = new Map(players.map((p) => [p.id, p]));
  const ok = eligible(state, entrantId, byId);
  const pool = players.filter(ok);
  if (!pool.length) return null;
  const overall = currentPickNumber(state);
  const scored = pool
    .map((p) => ({ p, s: p.adp + (rand() - 0.5) * Math.max(4, overall * 0.15) }))
    .sort((a, b) => a.s - b.s);
  return scored[0].p;
}

export function rosterPlayers(state: DraftState, entrantId: string, players: Map<string, Player>): Player[] {
  return rosterOf(state, entrantId)
    .map((p) => players.get(p.playerId))
    .filter((p): p is Player => !!p);
}
