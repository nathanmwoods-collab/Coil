/**
 * Lobby promo cards. Data only: the lobby renders whatever is here, in order.
 * Everything is MOCK: credits, matches and rakeback have no cash value.
 */
export type PromoAction =
  | { type: 'deposit'; amount?: number }
  | { type: 'contest'; contestId: string }
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
    body: '$25 to draft. 12-team pods, top 2 move on.',
    cta: 'See the contest',
    action: { type: 'contest', contestId: 'c_gridiron_gauntlet' },
  },
  {
    id: 'windup',
    kicker: 'Windup',
    figure: '5%',
    title: 'Earn Turns, get Springback',
    body: 'Every draft winds the spring. Springback pays some of your fees back.',
    cta: 'See how Windup works',
    action: { type: 'details' },
    details: [
      'Every $1 in entry fees earns 1 Turn.',
      'Turns wind you up through tiers. Higher tiers mean more Springback.',
      'Springback is rakeback: up to 5% of your fees, paid weekly as mock credit.',
      'Windup opens with the season. Your drafts until then still count.',
    ],
  },
  {
    id: 'refer',
    kicker: 'Bring your league',
    figure: '$25',
    title: 'Refer a friend',
    body: 'They draft once, you both get $25 in mock credit.',
    cta: 'Get your link',
    action: { type: 'details' },
    details: [
      'Share your link. When a friend finishes a first paid draft, you each get $25 mock credit.',
      'No cap on friends. One credit per friend.',
      'Referral links go live at launch. Nothing to send yet.',
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
    case 'details':
      return `/promo/${p.id}`;
  }
}

/** Mock credit added on top of a deposit. Only the first deposit is matched. */
export function depositBonus(amount: number, matchUsed: boolean): number {
  if (matchUsed || !(amount > 0)) return 0;
  return Math.min(amount, FIRST_DEPOSIT_MATCH_CAP);
}
