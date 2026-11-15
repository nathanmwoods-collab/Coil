export type Position = 'QB' | 'RB' | 'WR' | 'TE';
export const POSITIONS: Position[] = ['QB', 'RB', 'WR', 'TE'];

/** Sports the app knows about. Only NFL has data today. */
export type Sport = 'nfl' | 'nba' | 'mlb';

export interface Player {
  id: string;
  sport: Sport;
  name: string;
  team: string; // NFL team abbreviation
  position: Position;
  bye: number;
  adp: number; // average draft position (overall pick number)
  projPoints: number; // projected season fantasy points (half-PPR)
}

/** Starting lineup used for best-ball weekly scoring. */
export interface LineupSlots {
  QB: number;
  RB: number;
  WR: number;
  TE: number;
  FLEX: number; // RB/WR/TE
}

export const DEFAULT_LINEUP: LineupSlots = { QB: 1, RB: 2, WR: 3, TE: 1, FLEX: 1 };

export interface Entrant {
  id: string;
  name: string;
  isBot: boolean;
}

export interface Pick {
  overall: number; // 1-based
  round: number; // 1-based
  pickInRound: number; // 1-based
  entrantId: string;
  playerId: string;
  auto: boolean;
  at: number; // epoch ms
}

export type DraftStatus = 'filling' | 'drafting' | 'complete';

export interface DraftConfig {
  id: string;
  contestId: string;
  teams: number;
  rounds: number;
  pickClockSec: number;
  lineup: LineupSlots;
}

export interface DraftState {
  config: DraftConfig;
  entrants: Entrant[]; // index = draft slot (0-based)
  picks: Pick[];
  status: DraftStatus;
  clockEndsAt: number | null;
}

export interface Contest {
  id: string;
  sport: Sport;
  name: string;
  entryFee: number; // display only; mock currency
  prizePool: number;
  /** Share of every entry fee Coil keeps, in percent (12 means 12%). Published on the contest sheet. */
  rakePct: number;
  maxEntries: number;
  maxPerUser: number;
  teams: number;
  rounds: number;
  pickClockSec: number;
  filled: number;
  tag?: 'flagship' | 'fast' | 'beginner' | 'satellite';
  startsAt: string; // ISO
}
