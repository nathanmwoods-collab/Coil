/**
 * Springback math. Pure functions over the published rate card in
 * `src/data/springback.ts`. Money is mock dollars; rake and accruals keep four
 * decimals so small entries still add up, and payouts round to the cent.
 */
import {
  SPRINGBACK_GAUGES,
  SPRINGBACK_PAYOUT_DAY,
  SPRINGBACK_PAYOUT_HOUR_UTC,
  type SpringGauge,
} from '../data/springback';

export type RateCard = readonly SpringGauge[];

const r4 = (n: number) => Math.round(n * 1e4) / 1e4;
const cents = (n: number) => Math.round(n * 100 + 1e-7) / 100;

/** Rake on an amount of entry fees. `rakePct` is in percent (12 means 12%). */
export function rakeFor(entryFee: number, rakePct: number): number {
  if (!(entryFee > 0) || !(rakePct > 0)) return 0;
  return r4((entryFee * rakePct) / 100);
}

/** The gauge a season's rake puts you in. */
export function gaugeFor(seasonRake: number, card: RateCard = SPRINGBACK_GAUGES): SpringGauge {
  let g = card[0];
  for (const x of card) if (seasonRake + 1e-9 >= x.fromRake) g = x;
  return g;
}

/**
 * Springback earned by paying `rakeAdded` more rake on top of `rakeBefore`.
 * Marginal brackets: each slice of rake earns the rate of the gauge it falls in.
 */
export function springbackFor(rakeBefore: number, rakeAdded: number, card: RateCard = SPRINGBACK_GAUGES): number {
  if (!(rakeAdded > 0)) return 0;
  const from = Math.max(0, rakeBefore);
  const to = from + rakeAdded;
  let total = 0;
  for (let i = 0; i < card.length; i++) {
    const lo = Math.max(from, card[i].fromRake);
    const hi = Math.min(to, card[i + 1]?.fromRake ?? Infinity);
    if (hi > lo) total += ((hi - lo) * card[i].ratePct) / 100;
  }
  return r4(total);
}

/** Whole-season Springback as a share of rake, in percent. Always at or below the marginal rate. */
export function effectiveRatePct(seasonRake: number, card: RateCard = SPRINGBACK_GAUGES): number {
  if (!(seasonRake > 0)) return card[0].ratePct;
  return (springbackFor(0, seasonRake, card) / seasonRake) * 100;
}

export interface NextGauge {
  gauge: SpringGauge;
  /** Rake still to pay before the next gauge starts. */
  rakeToGo: number;
  /** The marginal rate it unlocks, in percent. */
  ratePct: number;
  /** 0 to 1 through the current gauge. */
  progress: number;
}

/** The next gauge up, or null at the top. */
export function nextGauge(seasonRake: number, card: RateCard = SPRINGBACK_GAUGES): NextGauge | null {
  const cur = gaugeFor(seasonRake, card);
  const next = card[card.indexOf(cur) + 1];
  if (!next) return null;
  const span = next.fromRake - cur.fromRake;
  return {
    gauge: next,
    rakeToGo: r4(Math.max(0, next.fromRake - seasonRake)),
    ratePct: next.ratePct,
    progress: span > 0 ? Math.min(1, Math.max(0, (seasonRake - cur.fromRake) / span)) : 1,
  };
}

/** How wound the spring is, 0 (nothing paid) to 1 (Max Load). Drives the gauge visual. */
export function springLoad(seasonRake: number, card: RateCard = SPRINGBACK_GAUGES): number {
  const i = card.indexOf(gaugeFor(seasonRake, card));
  const n = nextGauge(seasonRake, card);
  return Math.min(1, (i + (n ? n.progress : 1)) / (card.length - 1));
}

const DAY = 86_400_000;

/** The first Wednesday payout strictly after `at`. Entries accrue until then. */
export function nextPayout(at: number): number {
  const d = new Date(at);
  const today = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), SPRINGBACK_PAYOUT_HOUR_UTC);
  const ahead = (SPRINGBACK_PAYOUT_DAY - d.getUTCDay() + 7) % 7;
  const t = today + ahead * DAY;
  return t > at ? t : t + 7 * DAY;
}

export interface EntryPlan {
  count: number;
  /** Fees for all entries. */
  total: number;
  fromCredit: number;
  fromCash: number;
  /** Rake inside the whole total: what Coil keeps. Shown on the contest sheet. */
  rake: number;
  /** Rake on the cash part only. This is what moves the gauge and earns. */
  earningRake: number;
  /** Springback these entries accrue, paid on the next Wednesday. */
  springback: number;
  /** Per entry, in order. Credit is spent on the earliest entries first. */
  entries: { fromCredit: number; earningRake: number; springback: number }[];
}

/**
 * Price `count` entries: how much comes from Springback credit, and what springs
 * back. Credit is spent first when `useCredit` is on. The credit-paid part of an
 * entry earns nothing and does not count toward the gauge.
 */
export function planEntries(
  o: { entryFee: number; rakePct: number; count: number; seasonRake: number; credit: number; useCredit: boolean },
  card: RateCard = SPRINGBACK_GAUGES,
): EntryPlan {
  const count = Math.max(0, Math.floor(o.count));
  let creditLeft = o.useCredit ? Math.max(0, o.credit) : 0;
  let rakeSoFar = Math.max(0, o.seasonRake);
  const entries: EntryPlan['entries'] = [];
  let fromCredit = 0;
  let earningRake = 0;
  let springback = 0;
  for (let k = 0; k < count; k++) {
    const credit = cents(Math.min(creditLeft, o.entryFee));
    creditLeft = cents(creditLeft - credit);
    const rake = rakeFor(o.entryFee - credit, o.rakePct);
    const sb = springbackFor(rakeSoFar, rake, card);
    rakeSoFar += rake;
    fromCredit += credit;
    earningRake += rake;
    springback += sb;
    entries.push({ fromCredit: credit, earningRake: rake, springback: sb });
  }
  const total = cents(o.entryFee * count);
  fromCredit = cents(fromCredit);
  return {
    count,
    total,
    fromCredit,
    fromCash: cents(total - fromCredit),
    rake: rakeFor(total, o.rakePct),
    earningRake: r4(earningRake),
    springback: r4(springback),
    entries,
  };
}

/** One accrual: Springback earned by an entry, waiting for its Wednesday. */
export interface Accrual {
  amount: number;
  /** Timestamp of the Wednesday this pays on. */
  payOn: number;
  paidAt?: number;
}

export interface WeeklyPayout {
  payOn: number;
  /** Rounded to the cent. */
  amount: number;
  /** How many entries it covers. */
  entries: number;
}

/** Unpaid accruals, added up. */
export function pendingSpringback(accruals: readonly Accrual[]): number {
  return r4(accruals.reduce((n, a) => (a.paidAt == null ? n + a.amount : n), 0));
}

/** Unpaid accruals whose Wednesday has come, one payout per Wednesday, oldest first. */
export function payoutsDue(accruals: readonly Accrual[], now: number): WeeklyPayout[] {
  const by = new Map<number, { sum: number; entries: number }>();
  for (const a of accruals) {
    if (a.paidAt != null || a.payOn > now) continue;
    const w = by.get(a.payOn) ?? { sum: 0, entries: 0 };
    w.sum += a.amount;
    w.entries += 1;
    by.set(a.payOn, w);
  }
  return [...by.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([payOn, w]) => ({ payOn, amount: cents(w.sum), entries: w.entries }));
}

/**
 * Pay every Wednesday that has come. A week that adds up to less than a cent is
 * not lost: it rolls forward to the next Wednesday.
 */
export function settleAccruals<T extends Accrual>(accruals: readonly T[], now: number): { accruals: T[]; payouts: WeeklyPayout[] } {
  const due = payoutsDue(accruals, now);
  if (!due.length) return { accruals: accruals as T[], payouts: [] };
  const paying = new Set(due.filter((w) => w.amount >= 0.01).map((w) => w.payOn));
  const roll = nextPayout(now);
  return {
    payouts: due.filter((w) => paying.has(w.payOn)),
    accruals: accruals.map((a) => {
      if (a.paidAt != null || a.payOn > now) return a;
      return paying.has(a.payOn) ? { ...a, paidAt: now } : { ...a, payOn: roll };
    }),
  };
}
