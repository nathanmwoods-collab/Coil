import { describe, expect, it } from 'vitest';

import { PLAYERS } from '../../data/players';
import { exposure, exposureHeadline } from '../exposure';

const map = new Map(PLAYERS.map((p) => [p.id, p]));
const team = (...ids: string[]) => ids.map((playerId, i) => ({ playerId, overall: i + 1 }));

describe('exposure headline', () => {
  it('does not call you "the guy" on one or two teams', () => {
    const two = exposure([team('p_bi_robinson', 'p_ja_chase'), team('p_bi_robinson')], map);
    expect(exposureHeadline(two, 2)).toEqual({ kind: 'early', text: 'Two teams in. Too early to call you anything.' });
    expect(exposureHeadline(exposure([team('p_ja_chase')], map), 1)).toMatchObject({ kind: 'early' });
    expect(exposureHeadline([], 0)).toBeNull();
  });

  it('names your guy at three teams when he is on half of them', () => {
    const rows = exposure([team('p_bi_robinson'), team('p_bi_robinson'), team('p_ja_chase')], map);
    const h = exposureHeadline(rows, 3);
    expect(h?.kind).toBe('guy');
    if (h?.kind === 'guy') expect(h.row.player.id).toBe('p_bi_robinson');
  });

  it('stays quiet when nobody is on half your teams', () => {
    const rows = exposure([team('p_bi_robinson'), team('p_ja_chase'), team('p_ja_gibbs')], map);
    expect(exposureHeadline(rows, 3)).toBeNull();
  });
});
