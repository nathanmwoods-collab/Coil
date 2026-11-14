import type { Player } from '../engine/types';
import { PLAYERS } from './players';

export { PLAYERS } from './players';
export { CONTESTS, FAST_CLOCK_SEC, SLOW_CLOCK_SEC, isSitAndGo } from './contests';
export { DEFAULT_WEEK, payoutBlurb, payoutTable, SEASON_WEEKS } from './payouts';
export { simulateSeason, simulateTournament } from './sim';
export type { Standing } from './sim';

export const PLAYER_MAP: Map<string, Player> = new Map(PLAYERS.map((p) => [p.id, p]));
