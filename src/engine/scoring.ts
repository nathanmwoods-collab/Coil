import type { LineupSlots, Player, Position } from './types';
import { DEFAULT_LINEUP } from './types';

export interface WeekLineup {
  starters: { playerId: string; slot: Position | 'FLEX'; points: number }[];
  total: number;
}

/**
 * Best-ball optimal lineup: given each rostered player's points for a week,
 * pick the highest-scoring legal lineup. Greedy is optimal here because FLEX is
 * filled after every fixed slot from the leftover pool.
 */
export function optimalLineup(
  roster: Player[],
  weekPoints: Record<string, number>,
  lineup: LineupSlots = DEFAULT_LINEUP,
): WeekLineup {
  const pts = (p: Player) => weekPoints[p.id] ?? 0;
  const byPos: Record<Position, Player[]> = { QB: [], RB: [], WR: [], TE: [] };
  for (const p of roster) byPos[p.position].push(p);
  for (const k of Object.keys(byPos) as Position[]) byPos[k].sort((a, b) => pts(b) - pts(a));

  const starters: WeekLineup['starters'] = [];
  const leftovers: Player[] = [];
  for (const pos of ['QB', 'RB', 'WR', 'TE'] as Position[]) {
    const n = lineup[pos];
    byPos[pos].slice(0, n).forEach((p) => starters.push({ playerId: p.id, slot: pos, points: pts(p) }));
    if (pos !== 'QB') leftovers.push(...byPos[pos].slice(n));
  }
  leftovers
    .sort((a, b) => pts(b) - pts(a))
    .slice(0, lineup.FLEX)
    .forEach((p) => starters.push({ playerId: p.id, slot: 'FLEX', points: pts(p) }));

  const total = Math.round(starters.reduce((s, x) => s + x.points, 0) * 100) / 100;
  return { starters, total };
}

export function seasonTotal(
  roster: Player[],
  weeks: Record<string, number>[],
  lineup: LineupSlots = DEFAULT_LINEUP,
) {
  const perWeek = weeks.map((w) => optimalLineup(roster, w, lineup));
  return {
    perWeek,
    total: Math.round(perWeek.reduce((s, w) => s + w.total, 0) * 100) / 100,
  };
}
