import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => {
  const mem = new Map<string, string>();
  return {
    default: {
      getItem: async (k: string) => mem.get(k) ?? null,
      setItem: async (k: string, v: string) => void mem.set(k, v),
      removeItem: async (k: string) => void mem.delete(k),
    },
  };
});

import { moveRankToTop, onTheClock, toggleExcluded } from '../../engine';
import { exposureFor } from '../results';
import { PLAYERS } from '../../data';
import { liveAdp, ME, MISSES_FOR_AUTOPILOT, rankingsFor, spendable, springbackPending, STARTING_BALANCE, teamName, useApp, type DraftEntry } from '../useApp';

const get = () => useApp.getState();
const draft = (id: string) => get().drafts[id] as DraftEntry;

/** Run the ticker forward until the user is on the clock (or the draft ends). */
function advanceToMyTurn(id: string, start: number) {
  let t = start;
  for (let i = 0; i < 2000 && draft(id).state.status === 'drafting' && onTheClock(draft(id).state)?.id !== ME; i++) {
    t += 2000;
    get().tick(t);
  }
  return t;
}

function enter(contestId: string) {
  const r = get().enterContest(contestId);
  if (!r.ok) throw new Error(r.error);
  return r.draftId;
}

beforeEach(() => {
  get().resetAll();
  useApp.setState({ hydrated: true });
});

describe('enterContest', () => {
  it('refuses before hydration', () => {
    useApp.setState({ hydrated: false });
    expect(get().enterContest('c_two_minute_drill').ok).toBe(false);
    expect(get().balance).toBe(STARTING_BALANCE);
  });

  it('gives same-millisecond entries distinct drafts', () => {
    const spy = vi.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000);
    const a = enter('c_two_minute_drill');
    const b = enter('c_two_minute_drill');
    spy.mockRestore();
    expect(a).not.toBe(b);
    expect(Object.keys(get().drafts)).toHaveLength(2);
    expect(get().entries.c_two_minute_drill).toBe(2);
    expect(get().balance).toBe(STARTING_BALANCE - 20);
  });

  it('enforces max entries and balance', () => {
    enter('c_rookie_camp');
    expect(get().enterContest('c_rookie_camp')).toEqual({ ok: false, error: 'Max 1 entries reached' });
    useApp.setState({ balance: 4 });
    const r = get().enterContest('c_ticket_punch');
    expect(r.ok).toBe(false);
    expect(get().balance).toBe(4);
  });
});

describe('draft clock', () => {
  it('rejects a manual pick after the clock expired and autopicks from the queue', () => {
    const id = enter('c_sng_trifecta_3');
    const t = advanceToMyTurn(id, Date.now());
    const d = draft(id);
    const taken = new Set(d.state.picks.map((p) => p.playerId));
    const avail = ['p_ja_chase', 'p_ja_smith_njigba', 'p_as_jeanty', 'p_ch_mccaffrey', 'p_bi_robinson']
      .filter((p) => !taken.has(p));
    get().toggleQueue(id, avail[1]);
    const n = d.state.picks.length;
    const late = d.state.clockEndsAt! + 1;
    expect(get().draftPlayer(id, avail[0], late)).toMatch(/^Clock ran out\. Autopick took /);
    const after = draft(id);
    expect(after.state.picks).toHaveLength(n + 1);
    expect(after.state.picks[n]).toMatchObject({ entrantId: ME, playerId: avail[1], auto: true });
    expect(after.missed).toBe(1);
    expect(after.queue).toEqual([]);
    expect(t).toBeLessThan(late);
  });

  it('accepts an on-time pick exactly once', () => {
    const id = enter('c_sng_trifecta_3');
    advanceToMyTurn(id, Date.now());
    const d = draft(id);
    const taken = new Set(d.state.picks.map((p) => p.playerId));
    const pid = ['p_ja_chase', 'p_ch_mccaffrey', 'p_bi_robinson', 'p_ce_lamb'].find((p) => !taken.has(p))!;
    const now = d.state.clockEndsAt! - 1000;
    expect(get().draftPlayer(id, pid, now)).toBeNull();
    expect(get().draftPlayer(id, pid, now)).not.toBeNull(); // double tap
    expect(draft(id).state.picks.filter((p) => p.entrantId === ME)).toHaveLength(1);
  });

  it('turns on autopilot after repeated misses and completes the draft', () => {
    const id = enter('c_sng_trifecta_3');
    let t = Date.now();
    for (let m = 0; m < MISSES_FOR_AUTOPILOT; m++) {
      t = advanceToMyTurn(id, t);
      t = draft(id).state.clockEndsAt!;
      get().tick(t);
    }
    expect(draft(id).autopilot).toBe(true);
    for (let i = 0; i < 500 && draft(id).state.status === 'drafting'; i++) get().tick((t += 2000));
    const done = draft(id).state;
    expect(done.status).toBe('complete');
    expect(new Set(done.picks.map((p) => p.playerId)).size).toBe(done.picks.length);
    get().tick(t + 60_000); // no-op on a completed draft
    expect(draft(id).state.picks).toHaveLength(done.picks.length);
    expect(get().draftPlayer(id, 'p_ja_chase')).toBe('Draft is not in progress');
  });

  it('does not tick before hydration', () => {
    const id = enter('c_sng_trifecta_3');
    useApp.setState({ hydrated: false });
    get().tick(Date.now() + 10 * 60_000);
    expect(draft(id).state.picks).toHaveLength(0);
  });
});

describe('exposure across drafts', () => {
  it('counts each completed team once', () => {
    const ids = ['c_sng_trifecta_3', 'c_two_minute_drill', 'c_rookie_camp'].map((c) => {
      const id = enter(c);
      get().setAutodraft(id, true);
      let t = Date.now();
      for (let i = 0; i < 2000 && draft(id).state.status === 'drafting'; i++) get().tick((t += 2000));
      return id;
    });
    const drafts = ids.map(draft);
    const rows = exposureFor(drafts);
    for (const r of rows) {
      const count = drafts.filter((d) => d.state.picks.some((p) => p.entrantId === ME && p.playerId === r.player.id)).length;
      expect(r.count).toBe(count);
      expect(r.pct).toBeCloseTo((count / 3) * 100, 0);
    }
    expect(rows.reduce((n, r) => n + r.count, 0)).toBe(18 * 3);
  });
});

describe('mock deposit', () => {
  it('matches the first deposit only', () => {
    expect(get().deposit(25)).toBe(25);
    expect(get().balance).toBe(STARTING_BALANCE + 50);
    expect(get().deposit(100)).toBe(0);
    expect(get().balance).toBe(STARTING_BALANCE + 150);
  });
});

describe('rankings drive autopick', () => {
  it('autopilot takes the top of my rankings, skipping do-not-draft', () => {
    get().editRankings('fast12', (r) => moveRankToTop(toggleExcluded(r, 'p_ja_chase'), 'p_tr_kelce'));
    const id = enter('c_two_minute_drill');
    get().setAutodraft(id, true);
    let t = Date.now();
    for (let i = 0; i < 400 && draft(id).state.picks.length < 24; i++) get().tick((t += 2000));
    const mine = draft(id).state.picks.filter((p) => p.entrantId === ME);
    expect(mine.length).toBeGreaterThan(0);
    const kelce = draft(id).state.picks.find((p) => p.playerId === 'p_tr_kelce');
    // Kelce goes to me unless a bot reached for him first.
    if (kelce?.entrantId === ME) expect(mine[0].playerId).toBe('p_tr_kelce');
    expect(mine.some((p) => p.playerId === 'p_ja_chase')).toBe(false);
  });

  it('uses a separate list per draft type and resets to ADP', () => {
    get().editRankings('slow12', (r) => moveRankToTop(r, 'p_jo_allen'));
    expect(rankingsFor(get().rankings, 'slow12').order[0]).toBe('p_jo_allen');
    expect(rankingsFor(get().rankings, 'fast12').order[0]).toBe('p_ja_chase');
    get().resetRankings('slow12');
    expect(get().rankings.slow12).toBeUndefined();
  });

  it('the queue still beats rankings', () => {
    get().editRankings('fast12', (r) => moveRankToTop(r, 'p_tr_kelce'));
    const id = enter('c_two_minute_drill');
    get().toggleQueue(id, 'p_da_njoku');
    get().setAutodraft(id, true);
    let t = Date.now();
    for (let i = 0; i < 400 && !draft(id).state.picks.some((p) => p.entrantId === ME); i++) get().tick((t += 2000));
    expect(draft(id).state.picks.find((p) => p.entrantId === ME)?.playerId).toBe('p_da_njoku');
  });
});

describe('multi-entry', () => {
  it('creates N drafts and charges N fees', () => {
    const r = get().enterContest('c_two_minute_drill', { count: 3 });
    if (!r.ok) throw new Error(r.error);
    expect(new Set(r.draftIds).size).toBe(3);
    expect(Object.keys(get().drafts)).toHaveLength(3);
    expect(get().balance).toBe(STARTING_BALANCE - 30);
    expect(get().entries.c_two_minute_drill).toBe(3);
    expect(r.draftIds.every((id) => !draft(id).background && !draft(id).autodraft)).toBe(true);
  });

  it('refuses more than the cap, the seats or the balance allow, charging nothing', () => {
    expect(get().enterContest('c_two_minute_drill', { count: 21 }).ok).toBe(false);
    expect(get().enterContest('c_rookie_camp', { count: 2 }).ok).toBe(false);
    useApp.setState({ balance: 25 });
    const r = get().enterContest('c_two_minute_drill', { count: 3 });
    expect(r).toEqual({ ok: false, error: "You're $5 short (mock). Add funds first." });
    expect(get().balance).toBe(25);
    expect(Object.keys(get().drafts)).toHaveLength(0);
  });

  it('autodrafts every entry to completion in the background from rankings', () => {
    get().editRankings('fast12', (r) => toggleExcluded(r, 'p_ja_chase'));
    const r = get().enterContest('c_two_minute_drill', { count: 2, autodraft: true });
    if (!r.ok) throw new Error(r.error);
    let t = Date.now();
    let passes = 0;
    while (r.draftIds.some((id) => draft(id).state.status !== 'complete') && passes < 60) {
      get().tick((t += 200));
      passes++;
    }
    // 216 picks at 12 per pass: done in 18 passes of the 200ms ticker.
    expect(passes).toBeLessThanOrEqual(20);
    for (const id of r.draftIds) {
      const mine = draft(id).state.picks.filter((p) => p.entrantId === ME);
      expect(mine).toHaveLength(18);
      expect(mine.every((p) => p.auto)).toBe(true);
      expect(mine.some((p) => p.playerId === 'p_ja_chase')).toBe(false);
      expect(draft(id).autopilot).toBe(false);
    }
  });
});

describe('team names', () => {
  it('defaults to Entry N and can be renamed in bulk', () => {
    const r = get().enterContest('c_two_minute_drill', { count: 2 });
    if (!r.ok) throw new Error(r.error);
    const [a, b] = r.draftIds;
    expect([teamName(draft(a)), teamName(draft(b))]).toEqual(['Entry 1', 'Entry 2']);
    get().renameTeams({ [a]: '  Zero RB · #1 ', [b]: 'Zero RB · #2', nope: 'x' });
    expect([teamName(draft(a)), teamName(draft(b))]).toEqual(['Zero RB · #1', 'Zero RB · #2']);
    get().renameTeams({ [a]: '   ' });
    expect(teamName(draft(a))).toBe('Entry 1');
  });
});

describe('ADP from completed drafts', () => {
  it('folds each completed draft in once, per draft type', () => {
    const r = get().enterContest('c_two_minute_drill', { count: 2, autodraft: true });
    if (!r.ok) throw new Error(r.error);
    let t = Date.now();
    for (let i = 0; i < 60 && r.draftIds.some((id) => draft(id).state.status !== 'complete'); i++) get().tick((t += 200));
    const table = get().adp.fast12;
    expect(table?.drafts).toBe(2);
    expect(get().adp.slow12).toBeUndefined();
    expect(r.draftIds.every((id) => draft(id).adpCounted)).toBe(true);
    // Every player in the pool was observed in both drafts (drafted or not).
    expect(Object.keys(table!.players)).toHaveLength(PLAYERS.length);
    expect(table!.players.p_ja_chase.n).toBe(2);
    get().tick((t += 200));
    expect(get().adp.fast12?.drafts).toBe(2);
    // Live ADP stays near the seed for a top pick and is a finite number for everyone.
    const chase = liveAdp(table, 'p_ja_chase', 1.3);
    expect(chase).toBeGreaterThan(0.9);
    expect(chase).toBeLessThan(6);
    for (const p of PLAYERS) expect(Number.isFinite(liveAdp(table, p.id, p.adp))).toBe(true);
  });
});

describe('Springback', () => {
  it('accrues on entry at the Light rate and waits for Wednesday', () => {
    const id = enter('c_two_minute_drill'); // $10 at 12% rake
    expect(get().seasonRake).toBe(1.2);
    expect(springbackPending(get().sbLedger)).toBe(0.048);
    expect(draft(id).springback).toBe(0.048);
    expect(get().sbCredit).toBe(0);
    expect(get().settleSpringback()).toBe(0);
    expect(get().sbCredit).toBe(0);
  });

  it('pays pending Springback as credit on Wednesday, once', () => {
    const r = get().enterContest('c_gridiron_gauntlet', { count: 4, autodraft: true }); // $100, $12 rake
    expect(r.ok).toBe(true);
    expect(springbackPending(get().sbLedger)).toBe(0.48);
    expect(get().advanceToWednesday()).toBe(0.48);
    expect(get().sbCredit).toBe(0.48);
    expect(get().balance).toBe(STARTING_BALANCE - 100);
    expect(springbackPending(get().sbLedger)).toBe(0);
    expect(get().sbLanded?.amount).toBe(0.48);
    expect(get().sbLedger[0]).toMatchObject({ kind: 'payout', amount: 0.48, entries: 4 });
    // Another Wednesday with nothing new pays nothing.
    expect(get().advanceToWednesday()).toBe(0);
    expect(get().sbCredit).toBe(0.48);
    get().dismissLanded();
    expect(get().sbLanded).toBeNull();
  });

  it('spends credit first, and the credit-paid part earns nothing', () => {
    useApp.setState({ sbCredit: 4.2 });
    expect(spendable(get())).toBe(STARTING_BALANCE + 4.2);
    enter('c_two_minute_drill');
    expect(get().sbCredit).toBe(0);
    expect(get().balance).toBe(STARTING_BALANCE - 5.8);
    // Only the $5.80 of cash paid rake that counts.
    expect(get().seasonRake).toBe(0.696);
    expect(get().sbLedger[0]).toMatchObject({ kind: 'entry', fromCredit: 4.2, fees: 10 });

    get().resetAll();
    useApp.setState({ hydrated: true, sbCredit: 25 });
    enter('c_two_minute_drill');
    expect(get().balance).toBe(STARTING_BALANCE);
    expect(get().sbCredit).toBe(15);
    expect(get().seasonRake).toBe(0);
    expect(springbackPending(get().sbLedger)).toBe(0);
  });

  it('leaves credit alone when the toggle is off', () => {
    useApp.setState({ sbCredit: 25, balance: 5 });
    get().setUseCreditFirst(false);
    expect(get().enterContest('c_two_minute_drill').ok).toBe(false);
    get().setUseCreditFirst(true);
    expect(get().enterContest('c_two_minute_drill').ok).toBe(true);
    expect(get().balance).toBe(5);
    expect(get().sbCredit).toBe(15);
  });

  it('moves up a gauge once enough rake is paid, with no cliff', () => {
    // 9 Gauntlet entries: $27 of rake. $25 at 4%, $2 at 8%.
    const r = get().enterContest('c_gridiron_gauntlet', { count: 9, autodraft: true });
    expect(r.ok).toBe(true);
    expect(get().seasonRake).toBe(27);
    expect(springbackPending(get().sbLedger)).toBeCloseTo(25 * 0.04 + 2 * 0.08, 6);
  });
});
