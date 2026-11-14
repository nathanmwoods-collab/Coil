import { describe, expect, it } from 'vitest';
import {
  DraftError,
  autoPickPlayer,
  createDraft,
  joinDraft,
  makePick,
  onTheClock,
  positionCounts,
  slotForPick,
  upcomingPicksFor,
} from '../draft';
import { PLAYERS, PLAYER_MAP } from '../../data';
import { config, entrants, mk, runBotDraft } from './helpers';

describe('snake order', () => {
  it('maps 12-team rounds 1-3 correctly', () => {
    const order = (r: number) => Array.from({ length: 12 }, (_, i) => slotForPick((r - 1) * 12 + i + 1, 12));
    const fwd = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    expect(order(1)).toEqual(fwd);
    expect(order(2)).toEqual([...fwd].reverse());
    expect(order(3)).toEqual(fwd);
    // turn picks: slot 11 picks 12 & 13, slot 0 picks 24 & 25
    expect(slotForPick(12, 12)).toBe(11);
    expect(slotForPick(13, 12)).toBe(11);
    expect(slotForPick(24, 12)).toBe(0);
    expect(slotForPick(25, 12)).toBe(0);
  });

  it('lists upcoming picks for a slot', () => {
    const s = createDraft(config(12, 3), entrants(12), 0);
    expect(upcomingPicksFor(s, 'e0')).toEqual([1, 24, 25]);
    expect(upcomingPicksFor(s, 'e5')).toEqual([6, 19, 30]);
  });
});

describe('draft lifecycle & makePick errors', () => {
  it('fills then starts drafting', () => {
    let s = createDraft(config(3, 2), entrants(1), 0);
    expect(s.status).toBe('filling');
    s = joinDraft(s, { id: 'e1', name: 'b', isBot: true }, 0);
    s = joinDraft(s, { id: 'e2', name: 'c', isBot: true }, 1000);
    expect(s.status).toBe('drafting');
    expect(s.clockEndsAt).toBe(1000 + 30_000);
    expect(() => joinDraft(s, { id: 'e3', name: 'd', isBot: true })).toThrow();
  });

  it('rejects a pick out of turn', () => {
    const s = createDraft(config(), entrants(12), 0);
    expect(() => makePick(s, 'e1', PLAYERS[0].id)).toThrow(DraftError);
    expect(() => makePick(s, 'e1', PLAYERS[0].id)).toThrow('Not your pick');
  });

  it('rejects an already drafted player', () => {
    let s = createDraft(config(), entrants(12), 0);
    s = makePick(s, 'e0', PLAYERS[0].id, { now: 5 });
    expect(s.picks[0]).toMatchObject({ overall: 1, round: 1, pickInRound: 1, entrantId: 'e0', auto: false, at: 5 });
    expect(onTheClock(s)?.id).toBe('e1');
    expect(() => makePick(s, 'e1', PLAYERS[0].id)).toThrow('Player already drafted');
  });

  it('rejects picks when the draft is not in progress', () => {
    const s = createDraft(config(), entrants(3), 0);
    expect(() => makePick(s, 'e0', PLAYERS[0].id)).toThrow('Draft is not in progress');
  });
});

describe('full bot draft', () => {
  for (const seed of [1, 7, 42]) {
    it(`12x18 completes with legal rosters (seed ${seed})`, () => {
      const s = runBotDraft(PLAYERS, seed);
      expect(s.status).toBe('complete');
      expect(s.picks).toHaveLength(216);
      expect(new Set(s.picks.map((p) => p.playerId)).size).toBe(216);
      for (const e of s.entrants) {
        const c = positionCounts(s, e.id, PLAYER_MAP);
        expect(c.QB + c.RB + c.WR + c.TE).toBe(18);
        expect(c.QB).toBeGreaterThanOrEqual(1);
        expect(c.RB).toBeGreaterThanOrEqual(2);
        expect(c.WR).toBeGreaterThanOrEqual(3);
        expect(c.TE).toBeGreaterThanOrEqual(1);
      }
    });
  }

  it('is reproducible for a seed', () => {
    const a = runBotDraft(PLAYERS, 99).picks.map((p) => p.playerId);
    const b = runBotDraft(PLAYERS, 99).picks.map((p) => p.playerId);
    expect(a).toEqual(b);
  });

  it('completes for small Sit & Go sizes', () => {
    for (const teams of [3, 6, 10]) expect(runBotDraft(PLAYERS, 3, teams).status).toBe('complete');
  });
});

describe('autopick', () => {
  it('takes the first undrafted queued player', () => {
    let s = createDraft(config(), entrants(12), 0);
    const [a, b, c] = [PLAYERS[30], PLAYERS[0], PLAYERS[50]];
    s = makePick(s, 'e0', b.id); // b gone
    const pick = autoPickPlayer(s, 'e1', PLAYERS, [b.id, c.id, a.id]);
    expect(pick?.id).toBe(c.id);
  });

  it('falls back to best ADP when queue is empty or exhausted', () => {
    let s = createDraft(config(), entrants(12), 0);
    s = makePick(s, 'e0', PLAYERS[0].id);
    expect(autoPickPlayer(s, 'e1', PLAYERS, [PLAYERS[0].id])?.id).toBe(PLAYERS[1].id);
    expect(autoPickPlayer(s, 'e1', PLAYERS)?.id).toBe(PLAYERS[1].id);
  });

  it('skips queued players at a capped position and forces needs late', () => {
    // 2-team, 9-round draft: caps QB 2, needs 1 QB/2 RB/3 WR/1 TE.
    const pool = [
      ...Array.from({ length: 6 }, (_, i) => mk(`qb${i}`, 'QB', 1 + i)),
      ...Array.from({ length: 10 }, (_, i) => mk(`rb${i}`, 'RB', 10 + i)),
      ...Array.from({ length: 10 }, (_, i) => mk(`wr${i}`, 'WR', 20 + i)),
      ...Array.from({ length: 4 }, (_, i) => mk(`te${i}`, 'TE', 40 + i)),
    ];
    let s = createDraft(config(2, 9), entrants(2), 0);
    // e0 takes 2 QBs (picks 1 and 4), e1 takes whatever.
    s = makePick(s, 'e0', 'qb0');
    s = makePick(s, 'e1', 'rb0');
    s = makePick(s, 'e1', 'rb1');
    s = makePick(s, 'e0', 'qb1');
    // QB cap (2) reached: queued QB is skipped in favour of the next queue entry.
    expect(autoPickPlayer(s, 'e0', pool, ['qb2', 'wr5'])?.id).toBe('wr5');
    // Drive e0 to the point where every remaining pick must fill a need.
    s = makePick(s, 'e0', 'wr0'); // pick 5
    s = makePick(s, 'e1', 'wr1');
    s = makePick(s, 'e1', 'wr2');
    s = makePick(s, 'e0', 'wr3'); // pick 8
    s = makePick(s, 'e0', 'wr4'); // pick 9 -> e0 has 2QB 3WR, left picks: 12,13,16,17 (4) need 2RB+1TE
    s = makePick(s, 'e1', 'wr5');
    s = makePick(s, 'e1', 'wr6');
    s = makePick(s, 'e0', 'rb2'); // pick 12 -> left 13,16,17 need 1RB+1TE (2<3, not forced yet)
    s = makePick(s, 'e0', 'wr7'); // pick 13 -> left 16,17, need 1RB+1TE => forced
    s = makePick(s, 'e1', 'wr8');
    s = makePick(s, 'e1', 'wr9');
    const forced = autoPickPlayer(s, 'e0', pool, ['qb3']);
    expect(['RB', 'TE']).toContain(forced?.position);
  });
});
