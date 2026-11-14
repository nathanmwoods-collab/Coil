/**
 * Player search that matches how people talk: "cmc", "eagles wr", "birds",
 * "sun god", "st brown", "jamarr". Pure and dependency-free.
 */
import { playerAliases, POSITION_WORDS } from '../data/aliases';
import { teamInfo } from '../data/teams';
import type { Player } from '../engine/types';

/** Lowercase, strip accents and punctuation, collapse spaces. "A.J. O'Brien-Smith" -> "aj obrien smith". */
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’`.]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

interface Entry {
  /** Every searchable word. */
  words: string[];
  /** Whole phrases joined without spaces, so "arsb" or "stbrown" style input matches. */
  squashed: string[];
}

const cache = new WeakMap<Player, Entry>();

function entryFor(p: Player): Entry {
  let e = cache.get(p);
  if (e) return e;
  const sport = p.sport ?? 'nfl';
  const team = teamInfo(p.team, sport);
  const phrases = [
    p.name,
    p.team,
    p.position,
    ...(POSITION_WORDS[p.position] ?? []),
    ...(team ? [team.city, team.name, ...team.nicknames] : []),
    ...playerAliases(p.id, sport),
  ]
    .map(normalize)
    .filter(Boolean);
  const words = new Set<string>();
  for (const ph of phrases) for (const w of ph.split(' ')) words.add(w);
  e = { words: [...words], squashed: [...new Set(phrases.map((ph) => ph.replace(/ /g, '')))] };
  cache.set(p, e);
  return e;
}

/** 2 = exact word or whole phrase, 1 = prefix, 0 = no match. */
function tokenScore(tok: string, e: Entry): number {
  let best = 0;
  for (const w of e.words) {
    if (w === tok) return 2;
    if (w.startsWith(tok)) best = 1;
  }
  for (const ph of e.squashed) {
    if (ph === tok) return 2;
    if (ph.startsWith(tok)) best = 1;
  }
  return best;
}

export function matchesPlayer(query: string, p: Player): boolean {
  const toks = normalize(query).split(' ').filter(Boolean);
  if (!toks.length) return true;
  const e = entryFor(p);
  return toks.every((tok) => tokenScore(tok, e) > 0);
}

/**
 * Players matching every token of the query. Order of `players` is kept
 * (callers sort by ADP or projection), except exact matches on every token
 * come before prefix-only matches, so "jj" leads with the two JJs.
 */
export function searchPlayers<T extends Player>(query: string, players: T[]): T[] {
  const toks = normalize(query).split(' ').filter(Boolean);
  if (!toks.length) return players;
  const exact: T[] = [];
  const partial: T[] = [];
  for (const p of players) {
    const e = entryFor(p);
    let min = 2;
    for (const tok of toks) {
      const sc = tokenScore(tok, e);
      if (sc < min) min = sc;
      if (!min) break;
    }
    if (min === 2) exact.push(p);
    else if (min === 1) partial.push(p);
  }
  return exact.concat(partial);
}
