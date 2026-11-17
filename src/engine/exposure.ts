import type { Player } from './types';

export interface ExposureRow {
  player: Player;
  count: number;
  pct: number; // 0-100
  avgPick: number;
}

/** Exposure across a user's completed teams: how often each player appears. */
export function exposure(
  teams: { playerId: string; overall: number }[][],
  players: Map<string, Player>,
): ExposureRow[] {
  const agg = new Map<string, { count: number; pickSum: number }>();
  for (const team of teams) {
    for (const p of team) {
      const a = agg.get(p.playerId) ?? { count: 0, pickSum: 0 };
      a.count++;
      a.pickSum += p.overall;
      agg.set(p.playerId, a);
    }
  }
  const n = Math.max(1, teams.length);
  return [...agg.entries()]
    .map(([id, a]) => {
      const player = players.get(id);
      return player
        ? { player, count: a.count, pct: Math.round((a.count / n) * 1000) / 10, avgPick: Math.round((a.pickSum / a.count) * 10) / 10 }
        : null;
    })
    .filter((r): r is ExposureRow => !!r)
    .sort((a, b) => b.pct - a.pct || a.avgPick - b.avgPick);
}

/** Fewest teams before Exposure will call you "the ___ guy". */
export const GUY_MIN_TEAMS = 3;

/**
 * The Exposure headline. With fewer than GUY_MIN_TEAMS teams every player is
 * at 50% or 100% and the call is noise, so it says so instead. At 3+ teams it
 * names your most-drafted player if he is on at least half of them.
 */
export function exposureHeadline(rows: ExposureRow[], teams: number): { kind: 'guy'; row: ExposureRow } | { kind: 'early'; text: string } | null {
  if (teams <= 0) return null;
  if (teams < GUY_MIN_TEAMS) return { kind: 'early', text: `${teams === 1 ? 'One team' : 'Two teams'} in. Too early to call you anything.` };
  const top = rows.find((r) => r.pct >= 50);
  return top ? { kind: 'guy', row: top } : null;
}
