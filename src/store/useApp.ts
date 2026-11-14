import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { CONTESTS, DEFAULT_WEEK, PLAYERS, SEASON_WEEKS } from '../data';
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
  onTheClock,
  reconcileRankings,
  seedRankings,
  totalPicks,
  updateAdp,
  type AdpTable,
  type Contest,
  type DraftType,
  type Rankings,
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
}

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

  /** Personal rankings per draft type. Missing means "same as ADP". */
  rankings: Partial<Record<DraftType, Rankings>>;

  /** MOCK season clock: completed weeks, 0 to 17. Moved from Lab. */
  currentWeek: number;

  /** ADP learned from completed drafts, per draft type. */
  adp: Partial<Record<DraftType, AdpTable>>;

  addFunds: (amount: number) => void;
  setWeek: (week: number) => void;
  /** Set team names in bulk: draft id -> name. An empty name goes back to "Entry N". */
  renameTeams: (names: Record<string, string>) => void;
  /** Apply an edit (move, exclude, tier break) to one draft type's rankings. */
  editRankings: (type: DraftType, edit: (r: Rankings) => Rankings) => void;
  resetRankings: (type: DraftType) => void;
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

/** Rankings for a draft type, seeded from ADP until the user edits them. */
export function rankingsFor(all: Partial<Record<DraftType, Rankings>>, type: DraftType): Rankings {
  const r = all[type];
  return r ? reconcileRankings(r, PLAYERS) : SEED_RANKINGS;
}
const SEED_RANKINGS = seedRankings(PLAYERS);

function updateDraft(drafts: Record<string, DraftEntry>, id: string, patch: Partial<DraftEntry>) {
  const d = drafts[id];
  return d ? { ...drafts, [id]: { ...d, ...patch } } : drafts;
}

/** One automatic step for a draft, or null if nothing should happen yet. */
function stepDraft(
  d: DraftEntry,
  now: number,
  botDelay: number,
  rankings: Partial<Record<DraftType, Rankings>> = {},
): DraftEntry | null {
  const st = d.state;
  if (st.status !== 'drafting') return null;
  const clock = onTheClock(st);
  if (!clock) return null;
  const lastAt = st.picks.length ? st.picks[st.picks.length - 1].at : d.createdAt;

  if (d.background) botDelay = 0;

  if (clock.isBot) {
    if (now - lastAt < botDelay) return null;
    const rand = mulberry32(d.seed + st.picks.length * 7919);
    const pl = botPickPlayer(st, clock.id, PLAYERS, rand) ?? autoPickPlayer(st, clock.id, PLAYERS);
    if (!pl) return null;
    const queue = d.queue.includes(pl.id) ? d.queue.filter((q) => q !== pl.id) : d.queue;
    return { ...d, state: makePick(st, clock.id, pl.id, { auto: true, now }), queue };
  }

  // User on the clock.
  const auto = d.autodraft || d.autopilot;
  const expired = st.clockEndsAt !== null && now >= st.clockEndsAt;
  const autoReady = auto && now - lastAt >= Math.min(botDelay, 700);
  if (!expired && !autoReady) return null;
  // Autopick order: this draft's queue, then the user's rankings for this draft type, then ADP.
  const pl = autoPickPlayer(st, clock.id, PLAYERS, autopickOrder(d.queue, rankings[draftTypeFor(d)]));
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
  rankings: {} as Partial<Record<DraftType, Rankings>>,
};

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      ...initial,

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

      editRankings: (type, edit) =>
        set((s) => {
          const cur = rankingsFor(s.rankings, type);
          const next = edit(cur);
          return next === cur ? s : { rankings: { ...s.rankings, [type]: next } };
        }),

      resetRankings: (type) =>
        set((s) => {
          const { [type]: _drop, ...rest } = s.rankings;
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
        const limit = entryLimit(c, mine, s.balance);
        if (limit.perUserLeft < 1) return { ok: false, error: `Max ${c.maxPerUser} entries reached` };
        if (limit.seatsLeft < 1) return { ok: false, error: 'Contest is full' };
        if (count > limit.perUserLeft) return { ok: false, error: `You have ${limit.perUserLeft} of ${c.maxPerUser} entries left here.` };
        if (count > limit.seatsLeft) return { ok: false, error: `Only ${limit.seatsLeft} seats left.` };
        const total = entryTotal(c.entryFee, count);
        if (s.balance < total) return { ok: false, error: `You're ${formatShort(total - s.balance)} short (mock). Add funds first.` };

        const now = Date.now();
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
          };
          draftIds.push(id);
        }
        set({
          balance: Math.round((s.balance - total) * 100) / 100,
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
