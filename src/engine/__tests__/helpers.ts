import { autoPickPlayer, botPickPlayer, createDraft, makePick, mulberry32, onTheClock } from '../draft';
import { DEFAULT_LINEUP } from '../types';
import type { DraftConfig, DraftState, Entrant, Player } from '../types';

export function config(teams = 12, rounds = 18): DraftConfig {
  return { id: 'd1', contestId: 'c1', teams, rounds, pickClockSec: 30, lineup: DEFAULT_LINEUP };
}

export function entrants(n: number): Entrant[] {
  return Array.from({ length: n }, (_, i) => ({ id: `e${i}`, name: `Team ${i + 1}`, isBot: i > 0 }));
}

export function runBotDraft(players: Player[], seed = 1, teams = 12, rounds = 18): DraftState {
  let s = createDraft(config(teams, rounds), entrants(teams), 0);
  const rand = mulberry32(seed);
  while (s.status === 'drafting') {
    const e = onTheClock(s)!;
    const pl = botPickPlayer(s, e.id, players, rand) ?? autoPickPlayer(s, e.id, players);
    if (!pl) throw new Error(`no pick for ${e.id} at ${s.picks.length + 1}`);
    s = makePick(s, e.id, pl.id, { now: 0 });
  }
  return s;
}

export function mk(id: string, position: Player['position'], adp: number, projPoints = 100): Player {
  return { id, name: id, team: 'XX', position, bye: 7, adp, projPoints };
}
