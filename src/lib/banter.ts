/**
 * Bot one-liners (personality spec §2.11 #5). Bots can get roasted; the user can't.
 * Keyed by the bot's base name; anyone else draws from the house pool.
 */
const LINES: Record<string, string[]> = {
  ChalkEater: ['Chalk. Obviously.', 'ADP said so.', 'Nobody ever got fired for this pick.'],
  LateRoundQB: ['Still not taking a QB.', 'QBs are for round 12.', 'Patience. The QB comes later.'],
  FadeTheField: ['Nobody else wanted him. Perfect.', 'Zigging.', 'Contrarian and proud.'],
  ZeroRBZach: ['Running backs are a trap.', 'Another receiver. You know me.', 'RBs? In this economy?'],
  HeroRB: ['One back to rule them all.', 'Got my anchor.', 'Hero acquired.'],
  StackAttack: ['Gotta complete the stack.', 'Same team, same ceiling.', 'Correlation is a lifestyle.'],
  CorrelationKing: ['It all connects.', 'Stacked like pancakes.', 'Bring-back secured.'],
  TEPremium: ['Tight ends win weeks.', 'Positional advantage, baby.', 'Elite TE or bust.'],
  EliteTE: ['Paid up at tight end. Again.', 'You will regret letting him go.', 'TE1 energy.'],
  UpsideOnly: ['Ceiling or nothing.', 'Floors are for houses.', 'Boom or bust. Mostly boom.'],
  RookieFever: ['Rookies hit late. Trust me.', 'Fresh legs.', 'Year-one breakout incoming.'],
  ADPValue: ['Fell to me. Rude not to.', 'Value is value.', 'Free real estate.'],
  RBDeadZone: ['Braving the dead zone.', 'Round 5 back. Living dangerously.', 'Someone has to.'],
  Week17Magic: ['Thinking about week 17 already.', 'Playoff schedule pick.', 'December matters.'],
  PlayoffStacks: ['Built for the playoffs.', 'Week 17 stack is cooking.', 'Late-season vibes.'],
  WaiverWire: ['Wait, no waivers in best ball?', 'Seemed like a guy.', 'Spreadsheet said yes.'],
  ShadowDrafter: ['...', 'You didn\'t see that.', 'Quietly.'],
  BYEweekBlues: ['Checked the bye. Mostly.', 'Bye weeks are a myth.', 'Week 9 will be fine.'],
  AdvanceRate: ['Advance rate approved.', 'Optimizing the funnel.', 'Projected to advance.'],
  ThreeRiver: ['Taking the river.', 'Gut call.', 'Feel pick.'],
};

const HOUSE = ['Locked in.', 'Had him circled.', "That one's mine.", 'Called it.'];

/** A deterministic line for a bot's pick, so re-renders don't reshuffle it. */
export function botLine(name: string, overall: number): string {
  const base = name.replace(/\d+$/, '');
  const pool = LINES[base] ?? HOUSE;
  let h = overall * 31;
  for (let i = 0; i < base.length; i++) h = (h * 33 + base.charCodeAt(i)) >>> 0;
  return pool[h % pool.length];
}
