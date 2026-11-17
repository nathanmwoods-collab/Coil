/**
 * Springback: THE published rate card. One schedule, no points, no status tiers.
 *
 * The more rake you've paid this season, the higher the share that springs back
 * every Wednesday as entry credit. Rates are marginal, like tax brackets: each
 * rate applies only to rake paid after reaching that gauge, so there are no cliffs.
 *
 * Derived from the loyalty proposal's five-tier table (4 / 8 / 14 / 20 / 26%),
 * collapsed to four gauges: the two middle tiers (14% and 20%) merge into Heavy
 * at 16%, and Max Load starts at $1,000 of rake so the season cost for a heavy
 * drafter stays within about 5% of the five-tier schedule.
 *
 * Everything here is MOCK currency. Change the program by changing this file only.
 */
export interface SpringGauge {
  key: 'light' | 'medium' | 'heavy' | 'max';
  name: string;
  /** Season rake paid (mock $) at which this gauge starts. */
  fromRake: number;
  /** Marginal rate, in percent, on rake paid from `fromRake` up to the next gauge. */
  ratePct: number;
}

export const SPRINGBACK_GAUGES: readonly SpringGauge[] = [
  { key: 'light', name: 'Light', fromRake: 0, ratePct: 4 },
  { key: 'medium', name: 'Medium', fromRake: 25, ratePct: 8 },
  { key: 'heavy', name: 'Heavy', fromRake: 100, ratePct: 16 },
  { key: 'max', name: 'Max Load', fromRake: 1000, ratePct: 26 },
] as const;

/** Payout day and hour, in UTC. 3 = Wednesday. 15:00 UTC is mid-morning US Eastern. */
export const SPRINGBACK_PAYOUT_DAY = 3;
export const SPRINGBACK_PAYOUT_HOUR_UTC = 15;
/** Paid credit expires this many months after it lands. Not enforced in the mock. */
export const SPRINGBACK_CREDIT_EXPIRY_MONTHS = 12;

/** Plain-language rules, shown on the Springback screen and the promo sheet. */
export const SPRINGBACK_RULES: readonly { title: string; body: string }[] = [
  { title: 'No playthrough.', body: 'Credit lands every Wednesday and it is yours to enter with. No multiples, no hoops.' },
  { title: 'One use, then cash.', body: 'Enter a contest with credit and whatever that team wins is cash.' },
  { title: 'Credit does not earn.', body: 'The part of an entry you pay with Springback credit earns no Springback and does not move your gauge.' },
  { title: 'Marginal, like tax brackets.', body: 'Each rate applies only to rake paid after you reach that gauge. Moving up never lowers what you already earned.' },
  { title: 'Resets each season.', body: `Your gauge goes back to Light when a new season opens. Credit you were already paid stays for ${SPRINGBACK_CREDIT_EXPIRY_MONTHS} months.` },
];
