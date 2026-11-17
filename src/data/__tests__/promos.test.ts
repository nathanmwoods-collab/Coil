import { describe, expect, it } from 'vitest';

import { CONTESTS } from '../contests';
import { depositBonus, FIRST_DEPOSIT_MATCH_CAP, promoHref, PROMOS } from '../promos';

describe('promos', () => {
  it('every promo has copy and a working link', () => {
    const ids = new Set<string>();
    for (const p of PROMOS) {
      expect(ids.has(p.id)).toBe(false);
      ids.add(p.id);
      expect(p.title && p.body && p.cta && p.figure).toBeTruthy();
      expect(promoHref(p).startsWith('/')).toBe(true);
      if (p.action.type === 'contest') {
        const id = p.action.contestId;
        expect(CONTESTS.some((c) => c.id === id)).toBe(true);
      }
      if (p.action.type === 'details') expect(p.details?.length).toBeGreaterThan(0);
    }
  });

  it('matches only the first deposit, up to the cap', () => {
    expect(depositBonus(25, false)).toBe(25);
    expect(depositBonus(250, false)).toBe(FIRST_DEPOSIT_MATCH_CAP);
    expect(depositBonus(25, true)).toBe(0);
    expect(depositBonus(0, false)).toBe(0);
  });
});
