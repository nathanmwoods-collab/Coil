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

import { onTheClock } from '../../engine';
import { exposureFor } from '../results';
import { ME, MISSES_FOR_AUTOPILOT, STARTING_BALANCE, useApp, type DraftEntry } from '../useApp';

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
    expect(get().draftPlayer(id, avail[0], late)).toMatch(/Time's up/);
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
