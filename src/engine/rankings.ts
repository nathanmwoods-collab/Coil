/**
 * Personal rankings per draft type. They drive autopick after the queue:
 * queue -> rankings (minus "do not draft") -> ADP.
 */
import type { Contest, Player } from './types';

export type DraftType = 'fast12' | 'slow12' | 'sng';

export const DRAFT_TYPES: { key: DraftType; label: string; blurb: string }[] = [
  { key: 'fast12', label: 'Fast', blurb: '12-team pods, 30-second picks' },
  { key: 'slow12', label: 'Slow', blurb: '12-team pods, 8-hour picks' },
  { key: 'sng', label: 'Sit & go', blurb: 'Small pods, 10 teams or fewer' },
];

/** Which rankings list a contest uses. Small single-pod rooms get their own list. */
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
