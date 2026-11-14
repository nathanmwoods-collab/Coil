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
