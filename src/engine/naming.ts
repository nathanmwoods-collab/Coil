/**
 * Team naming: pure helpers that describe a roster (structure, build, stack)
 * and compose a name from a pattern of tokens.
 */
import type { Position } from './types';

export type Archetype =
  | 'Zero RB'
  | 'Hero RB'
  | 'Robust RB'
  | 'Hyper-fragile RB'
  | 'WR Avalanche'
  | 'Elite QB'
  | 'Late-round QB'
  | 'Elite TE'
  | 'Zero TE'
  | 'Balanced';

export const ARCHETYPES: Archetype[] = [
  'Zero RB', 'Hero RB', 'Robust RB', 'Hyper-fragile RB', 'WR Avalanche', 'Elite QB', 'Late-round QB', 'Elite TE', 'Zero TE', 'Balanced',
];
type Counts = Record<Position, number>;

/** "3QB-6RB-7WR-2TE" */
export function teamStructure(counts: Counts): string {
  return `${counts.QB}QB-${counts.RB}RB-${counts.WR}WR-${counts.TE}TE`;
}

/** Rounds that count as "early" when naming a build, scaled from 6 of 18. */
export function earlyRounds(rounds = 18): number {
  return Math.max(2, Math.round(rounds / 3));
}

export interface BuildPick {
  round: number;
  position: Position;
  /** Player name, for the one-liner. Optional so naming can run on bare positions. */
  name?: string;
}

export interface BuildProfile {
  /** The headline label. */
  primary: Archetype;
  /** Every label that applies, primary first. */
  tags: Archetype[];
  /** One wry line. Every fact in it is read off the roster. */
  line: string;
}

/** Round thresholds are written for 18 rounds and scale with the draft. */
const scale = (n: number, rounds: number, min = 1) => Math.max(min, Math.round((n * rounds) / 18));

/**
 * Build labels from where each position was taken.
 *
 * Running-back axis (always one of these), by RBs in the early rounds
 * (`earlyRounds`, 6 of 18): none = Zero RB, one = Hero RB, three or more =
 * Robust RB, two = Balanced. A finished roster with two or more early backs
 * and four or fewer in total is Hyper-fragile RB.
 * Extra labels: WR Avalanche (5+ receivers in rounds 1-7), Elite QB (first QB
 * by round 4), Late-round QB (first QB in round 10 or later, or none),
 * Elite TE (first TE by round 3), Zero TE (first TE in round 12 or later, or none).
 * "None" only counts once the roster is full: a team mid-draft is not Zero TE yet.
 * The primary label is the running-back one unless that is Balanced, in which
 * case the most distinctive extra label leads.
 */
export function buildProfile(picks: BuildPick[], rounds = 18): BuildProfile {
  const sorted = [...picks].sort((a, b) => a.round - b.round);
  const full = picks.length >= rounds;
  const of = (pos: Position) => sorted.filter((p) => p.position === pos);
  const first = (pos: Position) => of(pos)[0];
  const cut = earlyRounds(rounds);
  const rbs = of('RB');
  const earlyRbs = rbs.filter((p) => p.round <= cut);

  const rbAxis: Archetype =
    earlyRbs.length === 0
      ? 'Zero RB'
      : earlyRbs.length === 1
        ? 'Hero RB'
        : full && rbs.length <= scale(4, rounds, 2)
          ? 'Hyper-fragile RB'
          : earlyRbs.length >= 3
            ? 'Robust RB'
            : 'Balanced';

  const extras: Archetype[] = [];
  const wrWindow = scale(7, rounds, 2);
  const earlyWrs = of('WR').filter((p) => p.round <= wrWindow);
  if (earlyWrs.length >= scale(5, rounds, 2)) extras.push('WR Avalanche');
  const qb = first('QB');
  if (qb && qb.round <= scale(4, rounds)) extras.push('Elite QB');
  if ((qb && qb.round >= scale(10, rounds, 2)) || (!qb && full)) extras.push('Late-round QB');
  const te = first('TE');
  if (te && te.round <= scale(3, rounds)) extras.push('Elite TE');
  if ((te && te.round >= scale(12, rounds, 2)) || (!te && full)) extras.push('Zero TE');

  const primary: Archetype = rbAxis === 'Balanced' && extras.length ? extras[0] : rbAxis;
  const tags = [primary, ...[rbAxis, ...extras].filter((t) => t !== primary && t !== 'Balanced')];

  const who = (p: BuildPick | undefined, fallback: string) => (p?.name ? surname(p.name) : fallback);
  let line: string;
  switch (primary) {
    case 'Zero RB':
      line = rbs.length
        ? `No running back till round ${rbs[0].round}. Let the room pay for them.`
        : full
          ? 'Not one running back. Truly zero.'
          : 'No running backs yet. Holding the line.';
      break;
    case 'Hero RB': {
      const hero = earlyRbs[0];
      const next = rbs.find((p) => p !== hero);
      line =
        next && next.round - hero.round >= 4
          ? `${who(hero, 'One back')} in round ${hero.round}, then no back till round ${next.round}.`
          : next
            ? `${who(hero, 'One back')} in round ${hero.round}. The only back in the first ${cut} rounds.`
            : `${who(hero, 'One back')} in round ${hero.round}, and he carries the backfield.`;
      break;
    }
    case 'Robust RB':
      line = `${earlyRbs.length} backs by round ${earlyRbs[earlyRbs.length - 1].round}. Bought the backfield.`;
      break;
    case 'Hyper-fragile RB':
      line = `${earlyRbs.length} backs early, ${rbs.length} all season. No safety net.`;
      break;
    case 'WR Avalanche':
      line = `${earlyWrs.length} receivers in the first ${wrWindow} rounds. Let it rain.`;
      break;
    case 'Elite QB':
      line = `${who(qb, 'A quarterback')} in round ${qb!.round}. Paid up under center.`;
      break;
    case 'Late-round QB':
      line = qb ? `First quarterback in round ${qb.round}. Patience.` : 'No quarterback at all. A choice.';
      break;
    case 'Elite TE':
      line = `${who(te, 'A tight end')} in round ${te!.round}. The tight end edge.`;
      break;
    case 'Zero TE':
      line = te ? `First tight end in round ${te.round}. Streaming it.` : 'No tight end at all. Bold.';
      break;
    default:
      line = `Two backs by round ${earlyRbs[earlyRbs.length - 1]?.round ?? cut}, then took what came.`;
  }
  return { primary, tags, line };
}

/** The headline build label. See `buildProfile`. */
export function archetype(picks: BuildPick[], rounds = 18): Archetype {
  return buildProfile(picks, rounds).primary;
}

export interface StackPlayer {
  name: string;
  team: string;
  position: Position;
  adp: number;
}

export interface Stack {
  team: string;
  /** QB first when there is one, then teammates by ADP. */
  players: StackPlayer[];
  /** True when built around a quarterback. */
  qb: boolean;
}

/**
 * The stack a team is "about": the QB with the most (then best) pass catchers
 * on his team. With no QB stack, the biggest same-team group of two or more.
 */
export function primaryStack(roster: StackPlayer[]): Stack | null {
  let best: Stack | null = null;
  let bestScore = -Infinity;
  for (const qb of roster.filter((p) => p.position === 'QB')) {
    const mates = roster
      .filter((p) => p.team === qb.team && (p.position === 'WR' || p.position === 'TE'))
      .sort((a, b) => a.adp - b.adp);
    if (!mates.length) continue;
    const score = mates.length * 1000 - mates[0].adp;
    if (score > bestScore) {
      bestScore = score;
      best = { team: qb.team, players: [qb, ...mates], qb: true };
    }
  }
  if (best) return best;
  const byTeam = new Map<string, StackPlayer[]>();
  for (const p of roster) byTeam.set(p.team, [...(byTeam.get(p.team) ?? []), p]);
  for (const [team, group] of byTeam) {
    if (group.length < 2) continue;
    const sorted = [...group].sort((a, b) => a.adp - b.adp);
    const score = sorted.length * 1000 - sorted[0].adp;
    if (score > bestScore) {
      bestScore = score;
      best = { team, players: sorted, qb: false };
    }
  }
  return best;
}

const SUFFIX = /^(jr\.?|sr\.?|ii|iii|iv|v)$/i;
/** "A.J. Brown" -> "Brown", "Amon-Ra St. Brown" -> "St. Brown", "Marvin Harrison Jr." -> "Harrison". */
export function surname(full: string): string {
  const parts = full.split(' ').filter((w) => w && !SUFFIX.test(w));
  const last = parts[parts.length - 1] ?? full;
  return parts.length > 2 && /^(st\.?|de|van|von|la|le)$/i.test(parts[parts.length - 2]) ? `${parts[parts.length - 2]} ${last}` : last;
}

/**
 * Every team the roster stacks, biggest first: teams where a QB has at least
 * one of his pass catchers, else teams with two or more players. ["IND", "KC"].
 */
export function stackTeams(roster: StackPlayer[]): string[] {
  const byTeam = new Map<string, StackPlayer[]>();
  for (const p of roster) byTeam.set(p.team, [...(byTeam.get(p.team) ?? []), p]);
  const qbStacks: [string, number][] = [];
  const groups: [string, number][] = [];
  for (const [team, group] of byTeam) {
    const hasQb = group.some((p) => p.position === 'QB');
    const catchers = group.filter((p) => p.position === 'WR' || p.position === 'TE').length;
    if (hasQb && catchers) qbStacks.push([team, group.length]);
    else if (group.length >= 2) groups.push([team, group.length]);
  }
  const order = (xs: [string, number][]) => xs.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map((x) => x[0]);
  return qbStacks.length ? order(qbStacks) : order(groups);
}

/** "PHI stack: Hurts+Brown" (at most three names). */
export function stackLabel(stack: Stack | null): string {
  if (!stack) return 'No stack';
  return `${stack.team} stack: ${stack.players.slice(0, 3).map((p) => surname(p.name)).join('+')}`;
}

export type NameToken = 'structure' | 'archetype' | 'stack' | 'stackTeams' | 'date' | 'contest' | 'slot' | 'counter';

export const NAME_TOKENS: { key: NameToken; label: string; example: string }[] = [
  { key: 'archetype', label: 'Build', example: 'Zero RB' },
  { key: 'structure', label: 'Structure', example: '3QB-6RB-7WR-2TE' },
  { key: 'stack', label: 'Stack', example: 'PHI stack: Hurts+Brown' },
  { key: 'stackTeams', label: 'Stack teams', example: 'IND KC' },
  { key: 'date', label: 'Date drafted', example: 'Nov 14' },
  { key: 'contest', label: 'Contest', example: 'Two-Minute Drill' },
  { key: 'slot', label: 'Draft slot', example: 'Pick 4' },
  { key: 'counter', label: 'Counter', example: '#1' },
];

export interface NameContext {
  counts: Counts;
  archetype: Archetype;
  stack: Stack | null;
  /** Abbreviations of every stacked team, biggest first. Optional for older callers. */
  stackTeams?: string[];
  /** Epoch ms the draft was entered. */
  draftedAt: number;
  contestName: string;
  /** 1-based draft slot. */
  slot: number;
}

export const NAME_SEPARATOR = ' · ';
export const MAX_TEAM_NAME = 64;

function tokenText(t: NameToken, ctx: NameContext, index: number): string {
  switch (t) {
    case 'structure':
      return teamStructure(ctx.counts);
    case 'archetype':
      return ctx.archetype;
    case 'stack':
      return stackLabel(ctx.stack);
    case 'stackTeams':
      return ctx.stackTeams?.length ? ctx.stackTeams.slice(0, 3).join(' ') : 'No stack';
    case 'date':
      return new Date(ctx.draftedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    case 'contest':
      return ctx.contestName;
    case 'slot':
      return `Pick ${ctx.slot}`;
    case 'counter':
      return `#${index + 1}`;
  }
}

/**
 * Name for one team from a token pattern. `index` is the team's position in
 * the selection (drives the counter). `lead` is optional free text put first.
 */
export function formatTeamName(pattern: NameToken[], ctx: NameContext, index = 0, lead = ''): string {
  const parts = [lead.trim(), ...pattern.map((t) => tokenText(t, ctx, index))].filter(Boolean);
  const name = parts.join(NAME_SEPARATOR);
  return name.length > MAX_TEAM_NAME ? `${name.slice(0, MAX_TEAM_NAME - 1).trimEnd()}…` : name;
}
