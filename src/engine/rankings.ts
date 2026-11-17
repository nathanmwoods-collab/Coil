/**
 * Personal rankings, one list per slate (NFL, NFL Playoffs, NBA, ...). They
 * drive autopick after the queue: queue -> rankings (minus "do not draft") -> ADP.
 *
 * Draft types (fast, slow, sit & go) still exist, but only for ADP: room size
 * and clock change how people draft. They never split a user's rankings.
 */
import type { Contest, Player, Slate, Sport } from './types';


export const SLATES: { key: Slate; label: string; sport: Sport }[] = [
  { key: 'nfl', label: 'NFL', sport: 'nfl' },
  { key: 'nfl_playoffs', label: 'NFL Playoffs', sport: 'nfl' },
  { key: 'nba', label: 'NBA', sport: 'nba' },
  { key: 'mlb', label: 'MLB', sport: 'mlb' },
];

export function slateInfo(slate: Slate) {
  return SLATES.find((s) => s.key === slate) ?? SLATES[0];
}

/** Which rankings list a contest drafts from. */
export function slateOf(c: Pick<Contest, 'sport'> & { slate?: Slate }): Slate {
  return c.slate ?? c.sport;
}

export function isSlate(x: unknown): x is Slate {
  return SLATES.some((s) => s.key === x);
}

/** ADP bucket. */
export type DraftType = 'fast12' | 'slow12' | 'sng';

/** Which ADP table a contest uses. Small single-pod rooms get their own. */
export function draftTypeOf(c: Pick<Contest, 'teams' | 'maxEntries' | 'pickClockSec'>): DraftType {
  if (c.maxEntries === c.teams && c.teams < 12) return 'sng';
  return c.pickClockSec <= 120 ? 'fast12' : 'slow12';
}

export interface Rankings {
  /** Every player id, best first. */
  order: string[];
  /** "Do not draft" ids. They stay in `order` so un-excluding keeps their spot. */
  excluded: string[];
  /** Ids that start a new tier (a break is drawn above them). */
  tiers: string[];
}

export function seedRankings(players: Player[]): Rankings {
  return { order: [...players].sort((a, b) => a.adp - b.adp).map((p) => p.id), excluded: [], tiers: [] };
}

/** Drop unknown ids and append players missing from the list (new to the pool) in ADP order. */
export function reconcileRankings(r: Rankings, players: Player[]): Rankings {
  const known = new Set(players.map((p) => p.id));
  const have = new Set(r.order);
  const missing = [...players].filter((p) => !have.has(p.id)).sort((a, b) => a.adp - b.adp).map((p) => p.id);
  if (!missing.length && r.order.every((id) => known.has(id))) return r;
  return {
    order: [...r.order.filter((id) => known.has(id)), ...missing],
    excluded: r.excluded.filter((id) => known.has(id)),
    tiers: r.tiers.filter((id) => known.has(id)),
  };
}

export function moveRank(r: Rankings, id: string, dir: -1 | 1): Rankings {
  const i = r.order.indexOf(id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= r.order.length) return r;
  const order = [...r.order];
  [order[i], order[j]] = [order[j], order[i]];
  return { ...r, order };
}

export function moveRankToTop(r: Rankings, id: string): Rankings {
  const i = r.order.indexOf(id);
  if (i <= 0) return r;
  return { ...r, order: [id, ...r.order.filter((x) => x !== id)] };
}

const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

export function toggleExcluded(r: Rankings, id: string): Rankings {
  return r.order.includes(id) ? { ...r, excluded: toggle(r.excluded, id) } : r;
}

export function toggleTierBreak(r: Rankings, id: string): Rankings {
  return r.order.includes(id) ? { ...r, tiers: toggle(r.tiers, id) } : r;
}

/** Ranked ids autopick may take, best first. */
export function rankedIds(r: Rankings | undefined): string[] {
  if (!r) return [];
  if (!r.excluded.length) return r.order;
  const no = new Set(r.excluded);
  return r.order.filter((id) => !no.has(id));
}

/**
 * The list handed to `autoPickPlayer` as its queue: the draft's queue first,
 * then the user's rankings. ADP is the engine's own last resort. A queued
 * player always wins, even if marked "do not draft" (the queue is explicit).
 */
export function autopickOrder(queue: string[], r: Rankings | undefined): string[] {
  const ranked = rankedIds(r);
  if (!queue.length) return ranked;
  const q = new Set(queue);
  return [...queue, ...ranked.filter((id) => !q.has(id))];
}

/** 1-based tier number for each index in the order. */
export function tierNumbers(r: Rankings): number[] {
  const breaks = new Set(r.tiers);
  let tier = 1;
  return r.order.map((id, i) => {
    if (i > 0 && breaks.has(id)) tier++;
    return tier;
  });
}

export function isCustomized(r: Rankings | undefined, players: Player[]): boolean {
  if (!r) return false;
  if (r.excluded.length || r.tiers.length) return true;
  const seed = seedRankings(players).order;
  return r.order.length !== seed.length || r.order.some((id, i) => id !== seed[i]);
}

const LEGACY_KEYS = ['slow12', 'fast12', 'sng'] as const;

/**
 * Rankings used to be keyed by draft type. Fold those into the NFL slate:
 * an existing NFL list wins; otherwise the first legacy list the user had,
 * slow first (the one most people set up by hand). Unknown keys are dropped.
 */
export function migrateLegacyRankings(raw: Record<string, Rankings | undefined> | undefined): Partial<Record<Slate, Rankings>> {
  const out: Partial<Record<Slate, Rankings>> = {};
  if (!raw) return out;
  for (const s of SLATES) if (raw[s.key]) out[s.key] = raw[s.key];
  if (!out.nfl) {
    const legacy = LEGACY_KEYS.map((k) => raw[k]).find(Boolean);
    if (legacy) out.nfl = legacy;
  }
  return out;
}
