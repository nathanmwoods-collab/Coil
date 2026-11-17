/**
 * Sport registry. Everything sport-specific is looked up through here, so
 * adding a sport is data-only:
 *   1. add its player pool (like `players.ts`) and contests (with `sport` set),
 *   2. add its teams to `teams.ts` and nicknames to `aliases.ts`,
 *   3. flip its `status` to 'live' below.
 */
import type { Contest, Player, Sport } from '../engine/types';
import { CONTESTS } from './contests';
import { NFL_PLAYERS } from './players';

export interface SportInfo {
  key: Sport;
  label: string;
  status: 'live' | 'soon';
  /** What tapping a "soon" chip says. */
  soonNote?: string;
}

export const SPORTS: SportInfo[] = [
  { key: 'nfl', label: 'NFL', status: 'live' },
  { key: 'nba', label: 'NBA', status: 'soon', soonNote: "NBA best ball is on the way. Nothing to draft yet, so it's all football for now." },
  { key: 'mlb', label: 'MLB', status: 'soon', soonNote: "MLB best ball is on the way. Nothing to draft yet, so it's all football for now." },
];

export const DEFAULT_SPORT: Sport = 'nfl';

const POOLS: Record<Sport, Player[]> = { nfl: NFL_PLAYERS, nba: [], mlb: [] };
const MAPS = new Map<Sport, Map<string, Player>>();

export function sportInfo(sport: Sport): SportInfo {
  return SPORTS.find((s) => s.key === sport) ?? SPORTS[0];
}

export function playersFor(sport: Sport): Player[] {
  return POOLS[sport] ?? [];
}

export function playerMapFor(sport: Sport): Map<string, Player> {
  let m = MAPS.get(sport);
  if (!m) {
    m = new Map(playersFor(sport).map((p) => [p.id, p]));
    MAPS.set(sport, m);
  }
  return m;
}

export function contestsFor(sport: Sport): Contest[] {
  return CONTESTS.filter((c) => c.sport === sport);
}

/** A sport is draftable once it is live and has both players and contests. */
export function isSportLive(sport: Sport): boolean {
  return sportInfo(sport).status === 'live' && playersFor(sport).length > 0 && contestsFor(sport).length > 0;
}
