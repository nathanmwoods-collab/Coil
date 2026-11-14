import { describe, expect, it } from 'vitest';

import { PLAYER_ALIASES } from '../../data/aliases';
import { PLAYERS } from '../../data/players';
import { readableOn, TEAMS } from '../../data/teams';
import { normalize, searchPlayers } from '../search';

const names = (q: string) => searchPlayers(q, PLAYERS).map((p) => p.name);

describe('alias data', () => {
  it('covers all 32 NFL teams, and every team in the pool', () => {
    expect(Object.keys(TEAMS.nfl)).toHaveLength(32);
    for (const p of PLAYERS) expect(TEAMS.nfl[p.team], p.team).toBeDefined();
    for (const t of Object.values(TEAMS.nfl)) {
      expect(t.color).toMatch(/^#[0-9A-F]{6}$/i);
      expect(t.nicknames.length).toBeGreaterThan(0);
    }
  });

  it('only aliases players that exist, and covers 60 or more', () => {
    const ids = new Set(PLAYERS.map((p) => p.id));
    const keys = Object.keys(PLAYER_ALIASES.nfl);
    for (const k of keys) expect(ids.has(k), k).toBe(true);
    expect(keys.length).toBeGreaterThanOrEqual(60);
  });

  it('picks readable text for team fills', () => {
    expect(readableOn('#FFB612')).toBe('#0B0B14');
    expect(readableOn('#002244')).toBe('#FFFFFF');
  });
});

describe('searchPlayers', () => {
  it('normalizes accents and punctuation', () => {
    expect(normalize("A.J. O'Brién-Smith")).toBe('aj obrien smith');
  });

  it('returns everything for an empty query, in order', () => {
    expect(searchPlayers('  ', PLAYERS)).toBe(PLAYERS);
  });

  it('matches names without punctuation', () => {
    expect(names('jamarr')[0]).toBe("Ja'Marr Chase");
    expect(names('aj brown')).toContain('A.J. Brown');
    expect(names('st brown')).toContain('Amon-Ra St. Brown');
    expect(names('amon ra')).toEqual(['Amon-Ra St. Brown']);
    expect(names('smith njigba')).toEqual(['Jaxon Smith-Njigba']);
  });

  it('matches nicknames and initialisms', () => {
    expect(names('cmc')).toEqual(['Christian McCaffrey']);
    expect(names('CMC')).toEqual(['Christian McCaffrey']);
    expect(names('arsb')).toEqual(['Amon-Ra St. Brown']);
    expect(names('sun god')).toEqual(['Amon-Ra St. Brown']);
    expect(names('jj').slice(0, 2).sort()).toEqual(['J.J. McCarthy', 'Justin Jefferson']);
    expect(names('tank').sort()).toEqual(['Tank Bigsby', 'Tank Dell']);
    expect(names('scary terry')).toEqual(['Terry McLaurin']);
  });

  it('matches team abbreviation, name, city and nickname', () => {
    const phi = PLAYERS.filter((p) => p.team === 'PHI').map((p) => p.name).sort();
    // Exact abbreviation matches lead; prefix matches ("Phins") follow.
    expect(names('phi').slice(0, phi.length).sort()).toEqual(phi);
    expect(names('eagles').sort()).toEqual(phi);
    expect(names('philadelphia').sort()).toEqual(phi);
    expect(names('Birds').sort()).toEqual(phi);
    expect(names('niners').every((n) => PLAYERS.find((p) => p.name === n)?.team === 'SF')).toBe(true);
  });

  it('combines tokens: team and position', () => {
    const want = PLAYERS.filter((p) => p.team === 'PHI' && p.position === 'WR').map((p) => p.name);
    expect(names('eagles wr')).toEqual(want);
    expect(names('wr eagles')).toEqual(want);
    expect(names('birds receiver')).toEqual(want);
    expect(names('lions tight end').every((n) => PLAYERS.find((p) => p.name === n)?.position === 'TE')).toBe(true);
  });

  it('keeps input order within a match tier and returns nothing for junk', () => {
    const qbs = names('qb');
    expect(qbs[0]).toBe(PLAYERS.find((p) => p.position === 'QB')?.name);
    expect(names('zzzz')).toEqual([]);
  });
});
