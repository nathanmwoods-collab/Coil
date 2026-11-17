/**
 * Mock lobby contests. Names are original; fees and prizes are display-only
 * mock currency (no real-money play).
 *
 * Lobby mix: one big flagship tournament, several Sit & Go rooms of different
 * sizes (maxEntries === teams, fill and draft immediately), plus fast (30s)
 * and slow (8-hour) clocks.
 */
import type { Contest } from '../engine/types';

export const FAST_CLOCK_SEC = 30;
export const SLOW_CLOCK_SEC = 8 * 60 * 60;

/**
 * Rake is published per contest: the share of entry fees Coil keeps. The prize
 * pool is the rest. Tournaments take 12%, Sit & Go rooms 10%. A data test keeps
 * `prizePool` honest against `entryFee x maxEntries x (1 - rakePct)`.
 */
export const TOURNAMENT_RAKE_PCT = 12;
export const SIT_AND_GO_RAKE_PCT = 10;

const NFL_CONTESTS: Omit<Contest, 'sport'>[] = [
  {
    id: 'c_gridiron_gauntlet',
    name: 'The Gridiron Gauntlet',
    entryFee: 25,
    prizePool: 3_000_000,
    rakePct: TOURNAMENT_RAKE_PCT,
    maxEntries: 136_368,
    maxPerUser: 150,
    teams: 12,
    rounds: 18,
    pickClockSec: SLOW_CLOCK_SEC,
    filled: 87_412,
    tag: 'flagship',
    startsAt: '2026-09-10T00:20:00Z',
  },
  {
    id: 'c_two_minute_drill',
    name: 'Two-Minute Drill',
    entryFee: 10,
    prizePool: 100_000,
    rakePct: TOURNAMENT_RAKE_PCT,
    maxEntries: 11_364,
    maxPerUser: 20,
    teams: 12,
    rounds: 18,
    pickClockSec: FAST_CLOCK_SEC,
    filled: 6_204,
    tag: 'fast',
    startsAt: '2026-09-10T00:20:00Z',
  },
  {
    id: 'c_rookie_camp',
    name: 'Rookie Camp',
    entryFee: 1,
    prizePool: 10_000,
    rakePct: TOURNAMENT_RAKE_PCT,
    maxEntries: 11_364,
    maxPerUser: 1,
    teams: 12,
    rounds: 18,
    pickClockSec: SLOW_CLOCK_SEC,
    filled: 3_881,
    tag: 'beginner',
    startsAt: '2026-09-10T00:20:00Z',
  },
  {
    id: 'c_ticket_punch',
    name: 'Ticket Punch Qualifier',
    entryFee: 5,
    prizePool: 25_000,
    rakePct: TOURNAMENT_RAKE_PCT,
    maxEntries: 5_688,
    maxPerUser: 10,
    teams: 12,
    rounds: 18,
    pickClockSec: FAST_CLOCK_SEC,
    filled: 2_310,
    tag: 'satellite',
    startsAt: '2026-09-10T00:20:00Z',
  },
  // --- Sit & Go rooms: draft starts as soon as the room fills ---
  {
    id: 'c_sng_huddle_12',
    name: 'Huddle Up 12',
    entryFee: 25,
    prizePool: 270,
    rakePct: SIT_AND_GO_RAKE_PCT,
    maxEntries: 12,
    maxPerUser: 1,
    teams: 12,
    rounds: 18,
    pickClockSec: FAST_CLOCK_SEC,
    filled: 9,
    startsAt: '2026-09-10T00:20:00Z',
  },
  {
    id: 'c_sng_red_zone_10',
    name: 'Red Zone 10',
    entryFee: 10,
    prizePool: 90,
    rakePct: SIT_AND_GO_RAKE_PCT,
    maxEntries: 10,
    maxPerUser: 1,
    teams: 10,
    rounds: 18,
    pickClockSec: SLOW_CLOCK_SEC,
    filled: 4,
    startsAt: '2026-09-10T00:20:00Z',
  },
  {
    id: 'c_sng_six_pack',
    name: 'Six Pack',
    entryFee: 5,
    prizePool: 27,
    rakePct: SIT_AND_GO_RAKE_PCT,
    maxEntries: 6,
    maxPerUser: 1,
    teams: 6,
    rounds: 18,
    pickClockSec: FAST_CLOCK_SEC,
    filled: 3,
    tag: 'fast',
    startsAt: '2026-09-10T00:20:00Z',
  },
  {
    id: 'c_sng_trifecta_3',
    name: 'Trifecta',
    entryFee: 3,
    prizePool: 8.1,
    rakePct: SIT_AND_GO_RAKE_PCT,
    maxEntries: 3,
    maxPerUser: 1,
    teams: 3,
    rounds: 18,
    pickClockSec: FAST_CLOCK_SEC,
    filled: 1,
    tag: 'fast',
    startsAt: '2026-09-10T00:20:00Z',
  },
];

/** Every contest, all sports. Use `contestsFor(sport)` for one sport's lobby. */
export const CONTESTS: Contest[] = [...NFL_CONTESTS.map((c): Contest => ({ ...c, sport: 'nfl' }))];

/** A Sit & Go room is a single-draft contest: it holds exactly one draft's worth of teams. */
export function isSitAndGo(c: Contest): boolean {
  return c.maxEntries === c.teams;
}
