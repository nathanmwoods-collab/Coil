import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { CONTESTS, DEFAULT_SPORT, DEFAULT_WEEK, PLAYERS, playersFor, SEASON_WEEKS } from '../data';
import { depositBonus } from '../data/promos';
import {
  adpValue,
  autoPickPlayer,
  autopickOrder,
  botPickPlayer,
  createDraft,
  DEFAULT_LINEUP,
  draftedIds,
  draftTypeOf,
  entryLimit,
  entryTotal,
  makePick,
  MAX_TEAM_NAME,
  mulberry32,
  nextPayout,
  onTheClock,
  planEntries,
  migrateLegacyRankings,
  reconcileRankings,
  seedRankings,
  slateInfo,
  slateOf,
  settleAccruals,
  totalPicks,
  updateAdp,
  type AdpTable,
  type Contest,
  type DraftType,
  type Rankings,
  type Slate,
  type DraftState,
  type Entrant,
} from '../engine';

export const ME = 'me';
export const STARTING_BALANCE = 1000;
/** After this many expired clocks in a row the user is put on autopilot. */
export const MISSES_FOR_AUTOPILOT = 2;

export interface DraftEntry {
  id: string;
  contestId: string;
  entryFee: number;
  createdAt: number;
  seed: number;
  state: DraftState;
  queue: string[];
  /** User toggled autodraft on. */
  autodraft: boolean;
  /** Consecutive picks auto-made because the user's clock expired. */
  missed: number;
  /** Turned on by the system after repeated missed picks (slow drafts). */
  autopilot: boolean;
  /** 1-based number of this entry among the user's entries in its contest. */
  entryNo?: number;
  /** User-given team name. Falls back to "Entry N". */
  name?: string;
  /** Entered as "autodraft from my rankings": runs to completion in the background, no pick clocks. */
  background?: boolean;
  /** This draft's picks have been folded into the ADP table. */
  adpCounted?: boolean;
  /** MOCK Springback this entry accrued when it was entered. 0 for the part paid with credit. */
  springback?: number;
}

/** Springback ledger: what each entry accrued, and each Wednesday payout. Newest first. All MOCK. */
export type SpringbackItem =
  | {
      kind: 'entry';
      id: string;
      at: number;
      contestId: string;
      contest: string;
      draftIds: string[];
      count: number;
      fees: number;
      /** Paid with Springback credit. That part earns nothing. */
      fromCredit: number;
      /** Rake on the cash part: what moved the gauge. */
      rake: number;
      /** Springback accrued. */
      amount: number;
      payOn: number;
      paidAt?: number;
    }
  | { kind: 'payout'; id: string; at: number; amount: number; entries: number };

/**
 * MOCK-CLIENT ADP settings. Pods here are one human and bots, so bots are
 * weighted higher and the prior lower than the server defaults (ADP_DEFAULTS)
 * to make movement visible after a handful of drafts.
 */
export const CLIENT_ADP = { botWeight: 0.5, halfLifeDays: 14, priorWeight: 3, minSamples: 2 } as const;
const PLAYER_IDS = PLAYERS.map((p) => p.id);

/** Fold newly completed drafts into the per-draft-type ADP tables, once each. */
function foldAdp(
  drafts: Record<string, DraftEntry>,
  adp: Partial<Record<DraftType, AdpTable>>,
  now: number,
): { drafts: Record<string, DraftEntry>; adp: Partial<Record<DraftType, AdpTable>> } | null {
  let out: { drafts: Record<string, DraftEntry>; adp: Partial<Record<DraftType, AdpTable>> } | null = null;
  for (const id in drafts) {
    const d = drafts[id];
    if (d.state.status !== 'complete' || d.adpCounted) continue;
    out = out ?? { drafts: { ...drafts }, adp: { ...adp } };
    const type = draftTypeFor(d);
    const bots = new Set(d.state.entrants.filter((e) => e.isBot).map((e) => e.id));
    out.adp[type] = updateAdp(
      out.adp[type] ?? { asOf: 0, drafts: 0, players: {} },
      [
        {
          at: d.state.picks[d.state.picks.length - 1]?.at ?? now,
          totalPicks: totalPicks(d.state.config),
          // An autopick for the user is a ranking speaking, not a bot: it counts as a human pick.
          picks: d.state.picks.map((p) => ({ playerId: p.playerId, overall: p.overall, byBot: bots.has(p.entrantId) })),
        },
      ],
      { now, botWeight: CLIENT_ADP.botWeight, halfLifeDays: CLIENT_ADP.halfLifeDays, universe: PLAYER_IDS },
    );
    out.drafts[id] = { ...d, adpCounted: true };
  }
  return out;
}

/** Live ADP for a draft type: seed blended with what real drafts did. Falls back to seed. */
export function liveAdp(table: AdpTable | undefined, playerId: string, seedAdp: number): number {
  return adpValue(table, playerId, seedAdp, { priorWeight: CLIENT_ADP.priorWeight, minSamples: CLIENT_ADP.minSamples });
}

/** Picks a background autodraft makes per ticker pass (200ms): a pod finishes in a few seconds. */
export const BACKGROUND_PICKS_PER_TICK = 12;

export interface EnterOptions {
  /** Number of entries (drafts) to create. Default 1. */
  count?: number;
  /** Autodraft every one of them from the user's rankings, in the background. */
  autodraft?: boolean;
}

export type BotSpeed = 'normal' | 'fast';
export const BOT_DELAY_MS: Record<BotSpeed, number> = { normal: 1500, fast: 350 };

interface AppState {
  hydrated: boolean;
  balance: number;
  drafts: Record<string, DraftEntry>;
  entries: Record<string, number>; // contestId -> number of user entries
  botSpeed: BotSpeed;
  brandOverride: string | null;
  /** Draft-room haptics. On by default; the OS setting still wins. */
  haptics: boolean;

  /** The one-time first-deposit match has been paid out. */
  matchUsed: boolean;

  /** Personal rankings per slate (NFL, NFL Playoffs, NBA...). Missing means "same as ADP". */
  rankings: Partial<Record<Slate, Rankings>>;

  /** MOCK season clock: completed weeks, 0 to 17. Moved from Lab. */
  currentWeek: number;

  /** ADP learned from completed drafts, per draft type. */
  adp: Partial<Record<DraftType, AdpTable>>;

  /** MOCK Springback: rake paid in cash this season. Sets the gauge. */
  seasonRake: number;
  /** MOCK Springback credit that has been paid out. Separate from the cash balance. */
  sbCredit: number;
  /** Spend Springback credit before cash when entering. On by default. */
  useCreditFirst: boolean;
  sbLedger: SpringbackItem[];
  /** The latest payout the user hasn't seen yet. Drives the "Springback landed" moment. */
  sbLanded: { amount: number; at: number } | null;
  /** Lab only: how far "Advance to Wednesday" has pushed the Springback clock past the real one. */
  sbSkewMs: number;

  setUseCreditFirst: (on: boolean) => void;
  /** Pay out every Wednesday that has come. Returns the mock credit paid. */
  settleSpringback: (now?: number) => number;
  /** Lab: jump the Springback clock to the next Wednesday and pay it out. */
  advanceToWednesday: () => number;
  dismissLanded: () => void;

  addFunds: (amount: number) => void;
  setWeek: (week: number) => void;
  /** Set team names in bulk: draft id -> name. An empty name goes back to "Entry N". */
  renameTeams: (names: Record<string, string>) => void;
  /** Apply an edit (move, exclude, tier break) to one slate's rankings. */
  editRankings: (slate: Slate, edit: (r: Rankings) => Rankings) => void;
  resetRankings: (slate: Slate) => void;
  /** Mock deposit: adds the amount plus any first-deposit match. Returns the bonus. */
  deposit: (amount: number) => number;
  enterContest: (
    contestId: string,
    opts?: EnterOptions,
  ) => { ok: true; draftId: string; draftIds: string[] } | { ok: false; error: string };
  draftPlayer: (draftId: string, playerId: string, now?: number) => string | null;
  toggleQueue: (draftId: string, playerId: string) => void;
  moveQueue: (draftId: string, playerId: string, dir: -1 | 1) => void;
  setAutodraft: (draftId: string, on: boolean) => void;
  setBotSpeed: (s: BotSpeed) => void;
  setBrandOverride: (key: string | null) => void;
  setHaptics: (on: boolean) => void;
  resetAll: () => void;
  tick: (now: number) => void;
}

const BOT_NAMES = [
  'StackAttack', 'ZeroRBZach', 'HeroRB', 'LateRoundQB', 'TEPremium', 'BYEweekBlues', 'CorrelationKing',
  'AdvanceRate', 'PlayoffStacks', 'WaiverWire', 'ChalkEater', 'FadeTheField', 'RookieFever', 'ADPValue',
  'Week17Magic', 'UpsideOnly', 'RBDeadZone', 'EliteTE', 'ShadowDrafter', 'ThreeRiver',
];

/** Mock dollars for copy, e.g. $5 or $2.50. */
function formatShort(n: number) {
  const v = Math.round(n * 100) / 100;
  return `$${Number.isInteger(v) ? v : v.toFixed(2)}`;
}

function hashString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function contestById(id: string): Contest | undefined {
  return CONTESTS.find((c) => c.id === id);
}

/** Which rankings list a draft autopicks from. */
export function draftTypeFor(d: Pick<DraftEntry, 'contestId' | 'state'>): DraftType {
  const c = contestById(d.contestId);
  const cfg = d.state.config;
  return draftTypeOf(c ?? { teams: cfg.teams, maxEntries: Infinity, pickClockSec: cfg.pickClockSec });
}

/** Which slate's rankings a draft autopicks from. */
export function slateFor(d: Pick<DraftEntry, 'contestId'>): Slate {
  const c = contestById(d.contestId);
  return c ? slateOf(c) : DEFAULT_SPORT;
}

/** Rankings for a slate, seeded from that slate's ADP until the user edits them. */
export function rankingsFor(all: Partial<Record<Slate, Rankings>>, slate: Slate): Rankings {
  const pool = playersFor(slateInfo(slate).sport);
  const r = all[slate];
  if (r) return reconcileRankings(r, pool);
  let seed = SEED_RANKINGS.get(slate);
  if (!seed) SEED_RANKINGS.set(slate, (seed = seedRankings(pool)));
  return seed;
}
const SEED_RANKINGS = new Map<Slate, Rankings>();

function updateDraft(drafts: Record<string, DraftEntry>, id: string, patch: Partial<DraftEntry>) {
  const d = drafts[id];
  return d ? { ...drafts, [id]: { ...d, ...patch } } : drafts;
}

/** One automatic step for a draft, or null if nothing should happen yet. */
function stepDraft(
  d: DraftEntry,
  now: number,
  botDelay: number,
  rankings: Partial<Record<Slate, Rankings>> = {},
): DraftEntry | null {
  const st = d.state;
  // The pool comes from the contest's sport, so a new sport needs no changes here.
  const pool = playersFor(contestById(d.contestId)?.sport ?? DEFAULT_SPORT);
  if (st.status !== 'drafting') return null;
  const clock = onTheClock(st);
  if (!clock) return null;
  const lastAt = st.picks.length ? st.picks[st.picks.length - 1].at : d.createdAt;

  if (d.background) botDelay = 0;

  if (clock.isBot) {
    if (now - lastAt < botDelay) return null;
    const rand = mulberry32(d.seed + st.picks.length * 7919);
    const pl = botPickPlayer(st, clock.id, pool, rand) ?? autoPickPlayer(st, clock.id, pool);
    if (!pl) return null;
    const queue = d.queue.includes(pl.id) ? d.queue.filter((q) => q !== pl.id) : d.queue;
    return { ...d, state: makePick(st, clock.id, pl.id, { auto: true, now }), queue };
  }

  // User on the clock.
  const auto = d.autodraft || d.autopilot;
  const expired = st.clockEndsAt !== null && now >= st.clockEndsAt;
  const autoReady = auto && now - lastAt >= Math.min(botDelay, 700);
  if (!expired && !autoReady) return null;
  // Autopick order: this draft's queue, then the user's rankings for this slate, then ADP.
  const pl = autoPickPlayer(st, clock.id, pool, autopickOrder(d.queue, rankings[slateFor(d)]));
  if (!pl) return null;
  const state = makePick(st, clock.id, pl.id, { auto: true, now });
  const missed = !auto && expired ? d.missed + 1 : d.missed;
  return {
    ...d,
    state,
    queue: d.queue.filter((id) => id !== pl.id),
    missed,
    autopilot: d.autopilot || missed >= MISSES_FOR_AUTOPILOT,
  };
}

const initial = {
  balance: STARTING_BALANCE,
  drafts: {} as Record<string, DraftEntry>,
  entries: {} as Record<string, number>,
  botSpeed: 'normal' as BotSpeed,
  brandOverride: null as string | null,
  haptics: true,
  matchUsed: false,
  currentWeek: DEFAULT_WEEK,
  adp: {} as Partial<Record<DraftType, AdpTable>>,
  rankings: {} as Partial<Record<Slate, Rankings>>,
  seasonRake: 0,
  sbCredit: 0,
  useCreditFirst: true,
  sbLedger: [] as SpringbackItem[],
  sbLanded: null as { amount: number; at: number } | null,
  sbSkewMs: 0,
};

const money = (n: number) => Math.round(n * 100) / 100;

/** Unpaid Springback, waiting for Wednesday. */
export function springbackPending(ledger: SpringbackItem[]): number {
  let n = 0;
  for (const x of ledger) if (x.kind === 'entry' && x.paidAt == null) n += x.amount;
  return Math.round(n * 1e4) / 1e4;
}

/** What the user can enter with right now: cash, plus Springback credit when it's set to go first. */
export function spendable(s: Pick<AppState, 'balance' | 'sbCredit' | 'useCreditFirst'>): number {
  return money(s.balance + (s.useCreditFirst ? s.sbCredit : 0));
}

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      ...initial,

      setUseCreditFirst: (useCreditFirst) => set({ useCreditFirst }),

      settleSpringback: (now = Date.now() + get().sbSkewMs) => {
        const s = get();
        const entries = s.sbLedger.filter((x) => x.kind === 'entry');
        const { accruals, payouts } = settleAccruals(entries, now);
        if (accruals === entries) return 0;
        const paid = money(payouts.reduce((n, w) => n + w.amount, 0));
        const byId = new Map(accruals.map((a) => [a.id, a]));
        const ledger: SpringbackItem[] = s.sbLedger.map((x) => byId.get(x.id) ?? x);
        // Payouts go on top, newest first.
        for (const w of payouts) ledger.unshift({ kind: 'payout', id: `pay-${w.payOn}-${ledger.length}`, at: w.payOn, amount: w.amount, entries: w.entries });
        set({
          sbLedger: ledger,
          sbCredit: money(s.sbCredit + paid),
          ...(paid > 0 ? { sbLanded: { amount: money((s.sbLanded?.amount ?? 0) + paid), at: now } } : {}),
        });
        return paid;
      },

      advanceToWednesday: () => {
        const s = get();
        const now = Date.now() + s.sbSkewMs;
        const wed = nextPayout(now);
        set({ sbSkewMs: s.sbSkewMs + (wed - now) });
        return get().settleSpringback(wed);
      },

      dismissLanded: () => set({ sbLanded: null }),

      addFunds: (amount) => set((s) => ({ balance: Math.round((s.balance + amount) * 100) / 100 })),

      setWeek: (week) => set({ currentWeek: Math.max(0, Math.min(SEASON_WEEKS, Math.round(week))) }),

      renameTeams: (names) =>
        set((s) => {
          const drafts = { ...s.drafts };
          for (const id in names) {
            const d = drafts[id];
            if (!d) continue;
            const name = names[id].trim().slice(0, MAX_TEAM_NAME);
            drafts[id] = { ...d, name: name || undefined };
          }
          return { drafts };
        }),

      editRankings: (slate, edit) =>
        set((s) => {
          const cur = rankingsFor(s.rankings, slate);
          const next = edit(cur);
          return next === cur ? s : { rankings: { ...s.rankings, [slate]: next } };
        }),

      resetRankings: (slate) =>
        set((s) => {
          const { [slate]: _drop, ...rest } = s.rankings;
          return { rankings: rest };
        }),

      deposit: (amount) => {
        const s = get();
        if (!(amount > 0)) return 0;
        const bonus = depositBonus(amount, s.matchUsed);
        set({ balance: Math.round((s.balance + amount + bonus) * 100) / 100, matchUsed: true });
        return bonus;
      },

      enterContest: (contestId, opts = {}) => {
        const s = get();
        // Entering before persisted state loads would be overwritten by rehydration.
        if (!s.hydrated) return { ok: false, error: 'One sec, still loading.' };
        const c = contestById(contestId);
        if (!c) return { ok: false, error: 'Contest not found' };
        const count = Math.max(1, Math.floor(opts.count ?? 1));
        const mine = s.entries[c.id] ?? 0;
        const funds = spendable(s);
        const limit = entryLimit(c, mine, funds);
        if (limit.perUserLeft < 1) return { ok: false, error: `Max ${c.maxPerUser} entries reached` };
        if (limit.seatsLeft < 1) return { ok: false, error: 'Contest is full' };
        if (count > limit.perUserLeft) return { ok: false, error: `You have ${limit.perUserLeft} of ${c.maxPerUser} entries left here.` };
        if (count > limit.seatsLeft) return { ok: false, error: `Only ${limit.seatsLeft} seats left.` };
        const total = entryTotal(c.entryFee, count);
        if (funds < total) return { ok: false, error: `You're ${formatShort(total - funds)} short (mock). Add funds first.` };
        // Springback credit goes first (unless switched off). The credit-paid part earns nothing.
        const plan = planEntries({
          entryFee: c.entryFee, rakePct: c.rakePct, count, seasonRake: s.seasonRake, credit: s.sbCredit, useCredit: s.useCreditFirst,
        });

        const now = Date.now();
        const sbNow = now + s.sbSkewMs;
        const drafts = { ...s.drafts };
        const draftIds: string[] = [];
        for (let k = 0; k < count; k++) {
          // Entries made in the same millisecond must not share (and overwrite) one draft.
          let id = `${c.id}-${now.toString(36)}`;
          for (let n = 2; drafts[id]; n++) id = `${c.id}-${now.toString(36)}-${n}`;
          const seed = hashString(id);
          const rand = mulberry32(seed);
          const mySlot = Math.floor(rand() * c.teams);
          const names = [...BOT_NAMES].sort(() => rand() - 0.5);
          const entrants: Entrant[] = Array.from({ length: c.teams }, (_, i) =>
            i === mySlot
              ? { id: ME, name: 'You', isBot: false }
              : { id: `bot${i}`, name: names[i % names.length] + (i >= names.length ? i : ''), isBot: true },
          );
          const state = createDraft(
            { id, contestId: c.id, teams: c.teams, rounds: c.rounds, pickClockSec: c.pickClockSec, lineup: DEFAULT_LINEUP },
            entrants,
            now,
          );
          drafts[id] = {
            id, contestId: c.id, entryFee: c.entryFee, createdAt: now + k, seed, state,
            queue: [], autodraft: !!opts.autodraft, missed: 0, autopilot: false, entryNo: mine + k + 1,
            ...(opts.autodraft ? { background: true } : {}),
            springback: plan.entries[k].springback,
          };
          draftIds.push(id);
        }
        const item: SpringbackItem = {
          kind: 'entry', id: `e-${draftIds[0]}`, at: sbNow, contestId: c.id, contest: c.name, draftIds, count,
          fees: total, fromCredit: plan.fromCredit, rake: plan.earningRake, amount: plan.springback,
          payOn: nextPayout(sbNow),
          // Nothing accrued (all credit): nothing to wait for.
          ...(plan.springback > 0 ? {} : { paidAt: sbNow }),
        };
        set({
          balance: money(s.balance - plan.fromCash),
          sbCredit: money(s.sbCredit - plan.fromCredit),
          seasonRake: Math.round((s.seasonRake + plan.earningRake) * 1e4) / 1e4,
          sbLedger: [item, ...s.sbLedger],
          drafts,
          entries: { ...s.entries, [c.id]: mine + count },
        });
        return { ok: true, draftId: draftIds[0], draftIds };
      },

      draftPlayer: (draftId, playerId, now = Date.now()) => {
        const d = get().drafts[draftId];
        if (!d) return 'Draft not found';
        // The ticker may not have run yet: an expired clock belongs to the autopick.
        if (isMyTurn(d) && d.state.clockEndsAt !== null && now >= d.state.clockEndsAt) {
          get().tick(now);
          const auto = get().drafts[draftId]?.state.picks.filter((p) => p.entrantId === ME).pop();
          const who = auto ? PLAYERS.find((p) => p.id === auto.playerId)?.name : undefined;
          return who ? `Clock ran out. Autopick took ${who}.` : 'Clock ran out. Autopick made the pick.';
        }
        try {
          const state = makePick(d.state, ME, playerId, { now });
          set((s) => {
            const drafts = updateDraft(s.drafts, draftId, {
              state,
              queue: d.queue.filter((q) => q !== playerId),
              missed: 0,
            });
            return (state.status === 'complete' && foldAdp(drafts, s.adp, now)) || { drafts };
          });
          return null;
        } catch (e) {
          return e instanceof Error ? e.message : "That pick didn't go through. Try again.";
        }
      },

      toggleQueue: (draftId, playerId) =>
        set((s) => {
          const d = s.drafts[draftId];
          if (!d) return s;
          const queue = d.queue.includes(playerId) ? d.queue.filter((q) => q !== playerId) : [...d.queue, playerId];
          return { drafts: updateDraft(s.drafts, draftId, { queue }) };
        }),

      moveQueue: (draftId, playerId, dir) =>
        set((s) => {
          const d = s.drafts[draftId];
          if (!d) return s;
          const i = d.queue.indexOf(playerId);
          const j = i + dir;
          if (i < 0 || j < 0 || j >= d.queue.length) return s;
          const queue = [...d.queue];
          [queue[i], queue[j]] = [queue[j], queue[i]];
          return { drafts: updateDraft(s.drafts, draftId, { queue }) };
        }),

      setAutodraft: (draftId, on) =>
        set((s) => ({
          drafts: updateDraft(s.drafts, draftId, on ? { autodraft: true } : { autodraft: false, autopilot: false, missed: 0 }),
        })),

      setBotSpeed: (botSpeed) => set({ botSpeed }),
      setBrandOverride: (brandOverride) => set({ brandOverride }),
      setHaptics: (haptics) => set({ haptics }),
      resetAll: () => set({ ...initial }),

      tick: (now) => {
        const s = get();
        if (!s.hydrated) return;
        const delay = BOT_DELAY_MS[s.botSpeed];
        let next: Record<string, DraftEntry> | null = null;
        for (const id in s.drafts) {
          let d = s.drafts[id];
          if (d.state.status !== 'drafting') continue;
          // Background autodrafts take several picks per pass so a pod wraps up in seconds.
          const steps = d.background ? BACKGROUND_PICKS_PER_TICK : 1;
          let changed = false;
          for (let k = 0; k < steps; k++) {
            const stepped = stepDraft(d, now, delay, s.rankings);
            if (!stepped) break;
            d = stepped;
            changed = true;
            if (d.state.status !== 'drafting') break;
          }
          if (changed) {
            next = next ?? { ...s.drafts };
            next[id] = d;
          }
        }
        if (next) {
          const folded = foldAdp(next, s.adp, now);
          set(folded ?? { drafts: next });
        }
      },
    }),
    {
      name: 'bestball-app-v1',
      storage: createJSONStorage(() => AsyncStorage),
      // v1: rankings moved from per-draft-type to per-slate.
      version: 1,
      migrate: (persisted, from) => {
        const p = (persisted ?? {}) as Record<string, unknown>;
        if (from < 1) p.rankings = migrateLegacyRankings(p.rankings as Record<string, Rankings>);
        return p as unknown as AppState;
      },
      partialize: (s) => ({
        balance: s.balance,
        drafts: s.drafts,
        entries: s.entries,
        botSpeed: s.botSpeed,
        brandOverride: s.brandOverride,
        haptics: s.haptics,
        matchUsed: s.matchUsed,
        rankings: s.rankings,
        currentWeek: s.currentWeek,
        adp: s.adp,
        seasonRake: s.seasonRake,
        sbCredit: s.sbCredit,
        useCreditFirst: s.useCreditFirst,
        sbLedger: s.sbLedger,
        sbLanded: s.sbLanded,
        sbSkewMs: s.sbSkewMs,
      }),
      // Called after hydration finishes (success or error); defer so `useApp` is defined.
      onRehydrateStorage: () => () => {
        setTimeout(() => useApp.setState({ hydrated: true }), 0);
      },
    },
  ),
);

/** Team name shown everywhere: the user's name for it, else "Entry N". */
export function teamName(d: Pick<DraftEntry, 'name' | 'entryNo'>): string {
  return d.name?.trim() || (d.entryNo ? `Entry ${d.entryNo}` : 'Entry');
}

export function isMyTurn(d: DraftEntry | undefined) {
  if (!d) return false;
  return onTheClock(d.state)?.id === ME;
}

export function takenSet(d: DraftEntry) {
  return draftedIds(d.state);
}
