/**
 * Team naming: pure helpers that describe a roster (structure, build, stack)
 * and compose a name from a pattern of tokens.
 */
import type { Position } from './types';

export type Archetype = 'Zero RB' | 'Hero RB' | 'Robust RB' | 'Balanced';
type Counts = Record<Position, number>;

/** "3QB-6RB-7WR-2TE" */
export function teamStructure(counts: Counts): string {
  return `${counts.QB}QB-${counts.RB}RB-${counts.WR}WR-${counts.TE}TE`;
}

/** Rounds that count as "early" when naming a build, scaled from 6 of 18. */
export function earlyRounds(rounds = 18): number {
  return Math.max(2, Math.round(rounds / 3));
}

/**
 * Build name from where the running backs were taken:
 * none early = Zero RB, one = Hero RB, three or more = Robust RB, two = Balanced.
 */
export function archetype(picks: { round: number; position: Position }[], rounds = 18): Archetype {
  const cut = earlyRounds(rounds);
  const earlyRb = picks.filter((p) => p.round <= cut && p.position === 'RB').length;
  return earlyRb === 0 ? 'Zero RB' : earlyRb === 1 ? 'Hero RB' : earlyRb >= 3 ? 'Robust RB' : 'Balanced';
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

/** "PHI stack: Hurts+Brown" (at most three names). */
export function stackLabel(stack: Stack | null): string {
  if (!stack) return 'No stack';
  return `${stack.team} stack: ${stack.players.slice(0, 3).map((p) => surname(p.name)).join('+')}`;
}

export type NameToken = 'structure' | 'archetype' | 'stack' | 'date' | 'contest' | 'slot' | 'counter';

export const NAME_TOKENS: { key: NameToken; label: string; example: string }[] = [
  { key: 'archetype', label: 'Build', example: 'Zero RB' },
  { key: 'structure', label: 'Structure', example: '3QB-6RB-7WR-2TE' },
  { key: 'stack', label: 'Stack', example: 'PHI stack: Hurts+Brown' },
  { key: 'date', label: 'Date drafted', example: 'Nov 14' },
  { key: 'contest', label: 'Contest', example: 'Two-Minute Drill' },
  { key: 'slot', label: 'Draft slot', example: 'Pick 4' },
  { key: 'counter', label: 'Counter', example: '#1' },
];

export interface NameContext {
  counts: Counts;
  archetype: Archetype;
  stack: Stack | null;
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
