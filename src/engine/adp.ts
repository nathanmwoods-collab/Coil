/**
 * ADP from real drafts. Pure and incremental: a small aggregate per player is
 * decayed forward in time and new drafts are folded in, so the same function
 * works on a server (event per pick -> aggregate) and in this mock client.
 *
 * Model, per draft type:
 *   weight of an observation = timeDecay * (bot pick ? botWeight : 1)
 *   timeDecay                = 0.5 ^ (age / halfLife)
 *   ADP = (k * seedAdp + sum(w * pick)) / (k + sum(w))        Bayesian blend
 * so a player with little real data sits on the seed ADP and converges to the
 * observed average as weight accumulates. Players not taken in a draft are
 * observed at pick = totalPicks + 1.
 */
export interface AdpPick {
  playerId: string;
  /** 1-based overall pick. */
  overall: number;
  /** True when a bot (or autopick filler) made the pick. */
  byBot: boolean;
}

export interface AdpDraft {
  /** Epoch ms the draft completed. */
  at: number;
  /** Teams x rounds. Undrafted players are observed at totalPicks + 1. */
  totalPicks: number;
  picks: AdpPick[];
}

export interface AdpAggregate {
  /** Decayed sum of weights. */
  w: number;
  /** Decayed sum of weight x pick. */
  wp: number;
  /** Raw number of drafts this player was observed in (never decays). */
  n: number;
}

export interface AdpTable {
  /** Epoch ms the aggregates are decayed to. */
  asOf: number;
  /** Drafts folded in. */
  drafts: number;
  players: Record<string, AdpAggregate>;
}

export interface AdpOptions {
  /** Evaluation time; aggregates are decayed to here. Defaults to the newest draft (or prior.asOf). */
  now?: number;
  /** Days for an observation's weight to halve. */
  halfLifeDays?: number;
  /** Weight of a bot pick relative to a human pick. 0 excludes bots entirely. */
  botWeight?: number;
  /** Every player id in the pool, so undrafted players are observed too. Omit to skip undrafted handling. */
  universe?: string[];
}

export interface AdpReadOptions {
  /** Prior weight k: how many human picks' worth of trust the seed ADP gets. */
  priorWeight?: number;
  /** Below this many observed drafts, show the seed ADP unchanged. */
  minSamples?: number;
}

export const ADP_DEFAULTS = { halfLifeDays: 14, botWeight: 0.25, priorWeight: 12, minSamples: 5 } as const;

const DAY = 86_400_000;

export function emptyAdp(asOf = 0): AdpTable {
  return { asOf, drafts: 0, players: {} };
}

function decay(ageMs: number, halfLifeDays: number): number {
  if (ageMs <= 0 || !(halfLifeDays > 0)) return 1;
  return Math.pow(0.5, ageMs / (halfLifeDays * DAY));
}

/** Fold completed drafts into a per-draft-type ADP table. Returns a new table; `prior` is untouched. */
export function updateAdp(prior: AdpTable, drafts: AdpDraft[], opts: AdpOptions = {}): AdpTable {
  const halfLife = opts.halfLifeDays ?? ADP_DEFAULTS.halfLifeDays;
  const botWeight = Math.max(0, opts.botWeight ?? ADP_DEFAULTS.botWeight);
  const newest = drafts.reduce((m, d) => Math.max(m, d.at), prior.asOf);
  // Time never runs backwards: late-arriving drafts are simply weighted as older.
  const now = Math.max(opts.now ?? newest, prior.asOf);

  const carry = decay(now - prior.asOf, halfLife);
  const players: Record<string, AdpAggregate> = {};
  for (const id in prior.players) {
    const a = prior.players[id];
    players[id] = { w: a.w * carry, wp: a.wp * carry, n: a.n };
  }
  const add = (id: string, w: number, pick: number) => {
    const a = players[id] ?? (players[id] = { w: 0, wp: 0, n: 0 });
    a.w += w;
    a.wp += w * pick;
    a.n += 1;
  };

  let folded = 0;
  for (const d of drafts) {
    if (!d.picks.length) continue;
    folded++;
    const age = decay(now - d.at, halfLife);
    const taken = new Set<string>();
    let weightSum = 0;
    for (const p of d.picks) {
      const w = age * (p.byBot ? botWeight : 1);
      weightSum += w;
      taken.add(p.playerId);
      // A zero-weight (excluded bot) pick still marks the player as taken, but adds no evidence.
      if (w > 0) add(p.playerId, w, p.overall);
    }
    if (opts.universe) {
      // Going undrafted is evidence too, weighted like an average pick in that draft.
      const w = weightSum / d.picks.length;
      if (w > 0) for (const id of opts.universe) if (!taken.has(id)) add(id, w, d.totalPicks + 1);
    }
  }
  return { asOf: now, drafts: prior.drafts + folded, players };
}

/** Blended ADP for one player. Falls back to the seed below the minimum sample. */
export function adpValue(table: AdpTable | undefined, playerId: string, seedAdp: number, opts: AdpReadOptions = {}): number {
  const a = table?.players[playerId];
  const k = Math.max(0, opts.priorWeight ?? ADP_DEFAULTS.priorWeight);
  const min = opts.minSamples ?? ADP_DEFAULTS.minSamples;
  if (!a || a.n < min || a.w <= 0) return seedAdp;
  return Math.round(((k * seedAdp + a.wp) / (k + a.w)) * 10) / 10;
}

export type AdpMove = 'up' | 'down' | null;

/** "up" = going earlier than the seed says, "down" = sliding. Null inside the dead band. */
export function adpMove(seedAdp: number, liveAdp: number, band = 0.5): AdpMove {
  const d = seedAdp - liveAdp;
  return d >= band ? 'up' : d <= -band ? 'down' : null;
}
