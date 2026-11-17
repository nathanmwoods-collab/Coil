import { describe, expect, it } from 'vitest';

import { CONTESTS } from '../contests';
import { contestsFor, isSportLive, playerMapFor, playersFor, SPORTS } from '../sports';
import { TEAMS } from '../teams';

describe('sports registry', () => {
  it('has NFL live and the rest marked soon with a note', () => {
    expect(SPORTS.filter((s) => s.status === 'live').map((s) => s.key)).toEqual(['nfl']);
    for (const s of SPORTS.filter((x) => x.status === 'soon')) expect(s.soonNote).toBeTruthy();
  });

  it('keys players, contests and teams by sport', () => {
    expect(playersFor('nfl').length).toBeGreaterThan(200);
    expect(playersFor('nfl').every((p) => p.sport === 'nfl')).toBe(true);
    expect(contestsFor('nfl')).toHaveLength(CONTESTS.length);
    expect(playerMapFor('nfl').get('p_ja_chase')?.name).toBe("Ja'Marr Chase");
    for (const s of SPORTS) expect(TEAMS[s.key]).toBeDefined();
  });

  it('an unpopulated sport is empty, not broken', () => {
    expect(playersFor('nba')).toEqual([]);
    expect(contestsFor('mlb')).toEqual([]);
    expect(playerMapFor('nba').size).toBe(0);
    expect(isSportLive('nba')).toBe(false);
    expect(isSportLive('nfl')).toBe(true);
  });
});
