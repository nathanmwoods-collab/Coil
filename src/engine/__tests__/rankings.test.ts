import { describe, expect, it } from 'vitest';

import { PLAYERS } from '../../data/players';
import { CONTESTS } from '../../data/contests';
import { autoPickPlayer, createDraft } from '../draft';
import {
  autopickOrder,
  draftTypeOf,
  isCustomized,
  moveRank,
  moveRankToTop,
  rankedIds,
  reconcileRankings,
  seedRankings,
  tierNumbers,
  toggleExcluded,
  toggleTierBreak,
} from '../rankings';
import { DEFAULT_LINEUP, type Entrant } from '../types';

const seed = () => seedRankings(PLAYERS);

describe('rankings', () => {
  it('maps contests to a draft type', () => {
    const by = (id: string) => draftTypeOf(CONTESTS.find((c) => c.id === id)!);
    expect(by('c_two_minute_drill')).toBe('fast12');
    expect(by('c_gridiron_gauntlet')).toBe('slow12');
    expect(by('c_sng_huddle_12')).toBe('fast12');
    expect(by('c_sng_six_pack')).toBe('sng');
    expect(by('c_sng_red_zone_10')).toBe('sng');
  });

  it('seeds from ADP and is not customized', () => {
    const r = seed();
    expect(r.order[0]).toBe('p_ja_chase');
    expect(r.order).toHaveLength(PLAYERS.length);
    expect(isCustomized(r, PLAYERS)).toBe(false);
    expect(isCustomized(undefined, PLAYERS)).toBe(false);
  });

  it('moves up, down and to the top without losing anyone', () => {
    let r = seed();
    const third = r.order[2];
    r = moveRank(r, third, -1);
    expect(r.order[1]).toBe(third);
    r = moveRank(r, third, 1);
    expect(r.order[2]).toBe(third);
    r = moveRankToTop(r, r.order[40]);
    expect(new Set(r.order).size).toBe(PLAYERS.length);
    expect(isCustomized(r, PLAYERS)).toBe(true);
    expect(moveRank(r, r.order[0], -1)).toBe(r);
    expect(moveRankToTop(r, r.order[0])).toBe(r);
  });

  it('excludes players from the autopick list but keeps their spot', () => {
    let r = toggleExcluded(seed(), 'p_ja_chase');
    expect(rankedIds(r)[0]).toBe('p_bi_robinson');
    expect(r.order[0]).toBe('p_ja_chase');
    r = toggleExcluded(r, 'p_ja_chase');
    expect(rankedIds(r)[0]).toBe('p_ja_chase');
  });

  it('numbers tiers from breaks', () => {
    const r = toggleTierBreak(toggleTierBreak(seed(), seed().order[3]), seed().order[5]);
    expect(tierNumbers(r).slice(0, 7)).toEqual([1, 1, 1, 2, 2, 3, 3]);
  });

  it('reconciles with a changed player pool', () => {
    const r = reconcileRankings({ order: ['ghost', 'p_bi_robinson'], excluded: ['ghost'], tiers: [] }, PLAYERS);
    expect(r.order[0]).toBe('p_bi_robinson');
    expect(r.order).toHaveLength(PLAYERS.length);
    expect(r.excluded).toEqual([]);
    const same = seed();
    expect(reconcileRankings(same, PLAYERS)).toBe(same);
  });

  it('autopick goes queue, then rankings, then ADP', () => {
    const entrants: Entrant[] = Array.from({ length: 12 }, (_, i) => ({ id: `e${i}`, name: `E${i}`, isBot: i > 0 }));
    const st = createDraft({ id: 'd', contestId: 'c', teams: 12, rounds: 18, pickClockSec: 30, lineup: DEFAULT_LINEUP }, entrants, 0);
    const mine = moveRankToTop(seed(), 'p_jo_allen');
    expect(autoPickPlayer(st, 'e0', PLAYERS, autopickOrder([], mine))?.id).toBe('p_jo_allen');
    expect(autoPickPlayer(st, 'e0', PLAYERS, autopickOrder(['p_pu_nacua'], mine))?.id).toBe('p_pu_nacua');
    const noAllen = toggleExcluded(mine, 'p_jo_allen');
    expect(autoPickPlayer(st, 'e0', PLAYERS, autopickOrder([], noAllen))?.id).toBe('p_ja_chase');
    expect(autoPickPlayer(st, 'e0', PLAYERS, autopickOrder([], undefined))?.id).toBe('p_ja_chase');
    expect(autopickOrder(['p_pu_nacua'], mine).filter((id) => id === 'p_pu_nacua')).toHaveLength(1);
  });
});
