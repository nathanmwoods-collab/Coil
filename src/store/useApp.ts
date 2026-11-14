import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { CONTESTS, PLAYERS } from '../data';
import {
  autoPickPlayer,
  botPickPlayer,
  createDraft,
  DEFAULT_LINEUP,
  draftedIds,
  makePick,
  mulberry32,
  onTheClock,
  type Contest,
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

  addFunds: (amount: number) => void;
  enterContest: (contestId: string) => { ok: true; draftId: string } | { ok: false; error: string };
  draftPlayer: (draftId: string, playerId: string) => string | null;
  toggleQueue: (draftId: string, playerId: string) => void;
  moveQueue: (draftId: string, playerId: string, dir: -1 | 1) => void;
  setAutodraft: (draftId: string, on: boolean) => void;
  setBotSpeed: (s: BotSpeed) => void;
  setBrandOverride: (key: string | null) => void;
  resetAll: () => void;
  tick: (now: number) => void;
}

const BOT_NAMES = [
  'StackAttack', 'ZeroRBZach', 'HeroRB', 'LateRoundQB', 'TEPremium', 'BYEweekBlues', 'CorrelationKing',
  'AdvanceRate', 'PlayoffStacks', 'WaiverWire', 'ChalkEater', 'FadeTheField', 'RookieFever', 'ADPValue',
  'Week17Magic', 'UpsideOnly', 'RBDeadZone', 'EliteTE', 'ShadowDrafter', 'ThreeRiver',
];

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

function updateDraft(drafts: Record<string, DraftEntry>, id: string, patch: Partial<DraftEntry>) {
  const d = drafts[id];
  return d ? { ...drafts, [id]: { ...d, ...patch } } : drafts;
}

/** One automatic step for a draft, or null if nothing should happen yet. */
function stepDraft(d: DraftEntry, now: number, botDelay: number): DraftEntry | null {
  const st = d.state;
  if (st.status !== 'drafting') return null;
  const clock = onTheClock(st);
  if (!clock) return null;
  const lastAt = st.picks.length ? st.picks[st.picks.length - 1].at : d.createdAt;

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
  const pl = autoPickPlayer(st, clock.id, PLAYERS, d.queue);
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
};

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      ...initial,

      addFunds: (amount) => set((s) => ({ balance: Math.round((s.balance + amount) * 100) / 100 })),

      enterContest: (contestId) => {
        const s = get();
        const c = contestById(contestId);
        if (!c) return { ok: false, error: 'Contest not found' };
        const mine = s.entries[c.id] ?? 0;
        if (mine >= c.maxPerUser) return { ok: false, error: `Max ${c.maxPerUser} entries reached` };
        if (c.filled + mine >= c.maxEntries) return { ok: false, error: 'Contest is full' };
        if (s.balance < c.entryFee) return { ok: false, error: 'Not enough mock balance — add funds in Account' };

        const now = Date.now();
        const id = `${c.id}-${now.toString(36)}`;
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
        const entry: DraftEntry = {
          id, contestId: c.id, entryFee: c.entryFee, createdAt: now, seed, state,
          queue: [], autodraft: false, missed: 0, autopilot: false,
        };
        set({
          balance: Math.round((s.balance - c.entryFee) * 100) / 100,
          drafts: { ...s.drafts, [id]: entry },
          entries: { ...s.entries, [c.id]: mine + 1 },
        });
        return { ok: true, draftId: id };
      },

      draftPlayer: (draftId, playerId) => {
        const d = get().drafts[draftId];
        if (!d) return 'Draft not found';
        try {
          const state = makePick(d.state, ME, playerId);
          set((s) => ({
            drafts: updateDraft(s.drafts, draftId, {
              state,
              queue: d.queue.filter((q) => q !== playerId),
              missed: 0,
            }),
          }));
          return null;
        } catch (e) {
          return e instanceof Error ? e.message : 'Pick failed';
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
      resetAll: () => set({ ...initial }),

      tick: (now) => {
        const s = get();
        if (!s.hydrated) return;
        const delay = BOT_DELAY_MS[s.botSpeed];
        let next: Record<string, DraftEntry> | null = null;
        for (const id in s.drafts) {
          const d = s.drafts[id];
          if (d.state.status !== 'drafting') continue;
          const stepped = stepDraft(d, now, delay);
          if (stepped) {
            next = next ?? { ...s.drafts };
            next[id] = stepped;
          }
        }
        if (next) set({ drafts: next });
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
      }),
      // Called after hydration finishes (success or error); defer so `useApp` is defined.
      onRehydrateStorage: () => () => {
        setTimeout(() => useApp.setState({ hydrated: true }), 0);
      },
    },
  ),
);

export function isMyTurn(d: DraftEntry | undefined) {
  if (!d) return false;
  return onTheClock(d.state)?.id === ME;
}

export function takenSet(d: DraftEntry) {
  return draftedIds(d.state);
}
