/**
 * In-season ("live") standings and what a team is currently winning.
 * Pure: callers pass weekly totals from the season sim and a payout table.
 */
export interface PayoutTable {
  /** Mock prize by pod finish: places[0] is 1st. Finishes past the end win nothing. */
  places: number[];
  /** How many teams per pod advance to the next round (0 for single-pod contests). */
  advance: number;
}

export interface PodLine {
  entrantId: string;
  /** Points through the current week. */
  points: number;
  /** 1-based rank in the pod, or null before week 1. Ties share the better rank. */
  rank: number | null;
}

/** Pod standings through `week` (1-based count of completed weeks; 0 = not started). */
export function podStandings(teams: { entrantId: string; weeklyTotals: number[] }[], week: number): PodLine[] {
  const w = Math.max(0, Math.floor(week));
  const lines = teams.map((t) => ({
    entrantId: t.entrantId,
    points: Math.round(t.weeklyTotals.slice(0, w).reduce((a, b) => a + b, 0) * 10) / 10,
  }));
  const sorted = [...lines].sort((a, b) => b.points - a.points);
  return sorted.map((l, i) => {
    let r = i;
    while (r > 0 && sorted[r - 1].points === l.points) r--;
    return { ...l, rank: w === 0 ? null : r + 1 };
  });
}

/** Mock amount a team would win if the season ended now. */
export function winningAt(rank: number | null, table: PayoutTable): number {
  if (rank === null || rank < 1) return 0;
  return table.places[rank - 1] ?? 0;
}

export function isAdvancing(rank: number | null, table: PayoutTable): boolean {
  return rank !== null && table.advance > 0 && rank <= table.advance;
}

export interface LiveSummary {
  entries: number;
  atStake: number;
  winning: number;
}

export function liveSummary(teams: { fee: number; winning: number }[]): LiveSummary {
  const sum = (f: (t: { fee: number; winning: number }) => number) => Math.round(teams.reduce((n, t) => n + f(t), 0) * 100) / 100;
  return { entries: teams.length, atStake: sum((t) => t.fee), winning: sum((t) => t.winning) };
}

/** Group items by a key, keeping first-seen order. */
export function groupBy<T>(items: T[], key: (t: T) => string): { key: string; items: T[] }[] {
  const out: { key: string; items: T[] }[] = [];
  const at = new Map<string, number>();
  for (const it of items) {
    const k = key(it);
    let i = at.get(k);
    if (i === undefined) {
      i = out.length;
      at.set(k, i);
      out.push({ key: k, items: [] });
    }
    out[i].items.push(it);
  }
  return out;
}
