/**
 * Lobby promo cards. Data only: the lobby renders whatever is here, in order.
 * Everything is MOCK: credits, matches and Springback have no cash value.
 * Promo and referral terms are placeholders until counsel reviews them state by state (see docs/loyalty.md).
 */
export type PromoAction =
  | { type: 'deposit'; amount?: number }
  | { type: 'contest'; contestId: string }
  /** Opens the Springback screen. The lobby card shows the live pending amount. */
  | { type: 'springback' }
  | { type: 'details' };

export interface Promo {
  id: string;
  /** Small line above the title. */
  kicker: string;
  /** The big number or word the card leads with. */
  figure: string;
  title: string;
  body: string;
  /** Verb + object. */
  cta: string;
  action: PromoAction;
  /** Shown on the details sheet for `details` promos. */
  details?: string[];
}

/** First deposit is matched 1:1 in mock credit up to this much. */
export const FIRST_DEPOSIT_MATCH_CAP = 50;
export const DEPOSIT_PRESETS = [10, 25, 50, 100, 250];

export const PROMOS: Promo[] = [
  {
    id: 'first-draft-match',
    kicker: 'First deposit',
    figure: '$50',
    title: 'We match your first one',
    body: 'Add up to $50 and we double it in mock credit.',
    cta: 'Add funds',
    action: { type: 'deposit', amount: 50 },
  },
  {
    id: 'featured-gauntlet',
    kicker: 'Main event',
    figure: '$3M',
    title: 'The Gridiron Gauntlet',
    body: "$25 a seat. Win your pod or run second and you're still alive.",
    cta: 'See the contest',
    action: { type: 'contest', contestId: 'c_gridiron_gauntlet' },
  },
  {
    id: 'springback',
    kicker: 'Springback',
    figure: '4%',
    title: 'The rake bites. Springback bites back.',
    body: 'From 4% on your first entry up to 26%. No points, no playthrough.',
    cta: 'See your Springback',
    action: { type: 'springback' },
  },
  {
    id: 'refer',
    kicker: 'Bring your league',
    figure: '$25',
    title: 'Bring the group chat',
    body: 'They draft once, you each get $25 in mock credit. Then you get to beat them.',
    cta: 'Get your link',
    action: { type: 'details' },
    details: [
      'Share your link. When a friend finishes a first paid draft, you each get $25 mock credit.',
      'No cap on friends. One credit per friend.',
      'Referral links go live at launch. Nothing to send yet.',
      'Not offered in every state. Final terms come after legal review.',
    ],
  },
];

export function promoById(id: string): Promo | undefined {
  return PROMOS.find((p) => p.id === id);
}

/** Route a promo CTA opens. */
export function promoHref(p: Promo): string {
  switch (p.action.type) {
    case 'deposit':
      return p.action.amount ? `/deposit?amount=${p.action.amount}` : '/deposit';
    case 'contest':
      return `/contest/${p.action.contestId}`;
    case 'springback':
      return '/springback';
    case 'details':
      return `/promo/${p.id}`;
  }
}

/** Mock credit added on top of a deposit. Only the first deposit is matched. */
export function depositBonus(amount: number, matchUsed: boolean): number {
  if (matchUsed || !(amount > 0)) return 0;
  return Math.min(amount, FIRST_DEPOSIT_MATCH_CAP);
}
