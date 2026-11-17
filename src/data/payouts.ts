/**
 * MOCK payout tables. Real contests publish a full prize schedule; these are
 * simple stand-ins so the Live view can say what a team is "winning" today.
 * No real money is involved anywhere.
 */
import type { PayoutTable } from '../engine/live';
import type { Contest } from '../engine/types';
import { isSitAndGo } from './contests';

export const SEASON_WEEKS = 17;
/** Mock "it's week N" default until someone moves it in Lab. */
export const DEFAULT_WEEK = 6;

const cents = (n: number) => Math.round(n * 100) / 100;

/** Share of a sit & go prize pool by finish. */
function podSplit(teams: number): number[] {
  if (teams >= 10) return [0.6, 0.3, 0.1];
  if (teams >= 6) return [0.7, 0.3];
  return [1];
}

/** Per-contest overrides, by contest id. Anything missing falls back to the rule below. */
const OVERRIDES: Record<string, PayoutTable> = {};

export function payoutTable(c: Contest): PayoutTable {
  const o = OVERRIDES[c.id];
  if (o) return o;
  if (isSitAndGo(c)) return { places: podSplit(c.teams).map((p) => cents(c.prizePool * p)), advance: 0 };
  // Tournament pods: top 2 of the pod advance. Mock pod prize: 1st banks 3x the fee, 2nd banks 2x.
  return { places: [cents(c.entryFee * 3), cents(c.entryFee * 2)], advance: 2 };
}

/** "Top 2 of 12 advance" or "1st $162, 2nd $81, 3rd $27". */
export function payoutBlurb(c: Contest, money: (n: number) => string): string {
  const t = payoutTable(c);
  const ord = ['1st', '2nd', '3rd', '4th'];
  const places = t.places.map((p, i) => `${ord[i] ?? `${i + 1}th`} ${money(p)}`).join(', ');
  return t.advance > 0 ? `Top ${t.advance} of ${c.teams} advance. Pod prize: ${places}.` : `${places}.`;
}
