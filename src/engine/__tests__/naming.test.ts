import { describe, expect, it } from 'vitest';

import { archetype, formatTeamName, MAX_TEAM_NAME, primaryStack, stackLabel, surname, teamStructure, type NameContext, type StackPlayer } from '../naming';
import type { Position } from '../types';

const pl = (name: string, team: string, position: Position, adp: number): StackPlayer => ({ name, team, position, adp });
const picks = (...rb: number[]) => [
  ...rb.map((round) => ({ round, position: 'RB' as Position })),
  { round: 12, position: 'RB' as Position },
  { round: 1, position: 'WR' as Position },
];

describe('team naming', () => {
  it('writes the structure', () => {
    expect(teamStructure({ QB: 3, RB: 6, WR: 7, TE: 2 })).toBe('3QB-6RB-7WR-2TE');
  });

  it('names the build from early-round running backs', () => {
    expect(archetype(picks())).toBe('Zero RB');
    expect(archetype(picks(2))).toBe('Hero RB');
    expect(archetype(picks(1, 4))).toBe('Balanced');
    expect(archetype(picks(1, 2, 3))).toBe('Robust RB');
    // Round 7 is not early in an 18-round draft, but round 3 is not early in a 6-round one.
    expect(archetype(picks(7))).toBe('Zero RB');
    expect(archetype([{ round: 3, position: 'RB' }], 6)).toBe('Zero RB');
  });

  it('finds the QB stack with the most pass catchers', () => {
    const roster = [
      pl('Jalen Hurts', 'PHI', 'QB', 41),
      pl('A.J. Brown', 'PHI', 'WR', 19),
      pl('DeVonta Smith', 'PHI', 'WR', 54),
      pl('Josh Allen', 'BUF', 'QB', 34),
      pl('Khalil Shakir', 'BUF', 'WR', 90),
      pl('Saquon Barkley', 'PHI', 'RB', 15),
    ];
    const s = primaryStack(roster);
    expect(s?.team).toBe('PHI');
    expect(s?.qb).toBe(true);
    expect(stackLabel(s)).toBe('PHI stack: Hurts+Brown+Smith');
  });

  it('falls back to the biggest same-team group, or nothing', () => {
    const s = primaryStack([pl('Jahmyr Gibbs', 'DET', 'RB', 3), pl('Amon-Ra St. Brown', 'DET', 'WR', 8), pl('Josh Allen', 'BUF', 'QB', 34)]);
    expect(s?.qb).toBe(false);
    expect(stackLabel(s)).toBe('DET stack: Gibbs+St. Brown');
    expect(primaryStack([pl('Josh Allen', 'BUF', 'QB', 34), pl('Puka Nacua', 'LAR', 'WR', 4)])).toBeNull();
    expect(stackLabel(null)).toBe('No stack');
  });

  it('shortens names to surnames', () => {
    expect(surname('Marvin Harrison Jr.')).toBe('Harrison');
    expect(surname('Kenneth Walker III')).toBe('Walker');
    expect(surname("Ja'Marr Chase")).toBe('Chase');
  });

  it('formats a name from tokens, a counter and lead text', () => {
    const ctx: NameContext = {
      counts: { QB: 2, RB: 5, WR: 8, TE: 3 },
      archetype: 'Zero RB',
      stack: primaryStack([pl('Jalen Hurts', 'PHI', 'QB', 41), pl('A.J. Brown', 'PHI', 'WR', 19)]),
      draftedAt: new Date(2026, 10, 14, 12).getTime(),
      contestName: 'Two-Minute Drill',
      slot: 4,
    };
    expect(formatTeamName(['archetype', 'stack', 'counter'], ctx, 2)).toBe('Zero RB · PHI stack: Hurts+Brown · #3');
    expect(formatTeamName(['structure', 'date', 'slot'], ctx)).toBe('2QB-5RB-8WR-3TE · Nov 14 · Pick 4');
    expect(formatTeamName(['contest'], ctx, 0, '  Sunday night ')).toBe('Sunday night · Two-Minute Drill');
    expect(formatTeamName([], ctx)).toBe('');
    const long = formatTeamName(['contest', 'structure', 'stack', 'archetype', 'date', 'slot', 'counter'], ctx);
    expect(long.length).toBeLessThanOrEqual(MAX_TEAM_NAME);
    expect(long.endsWith('…')).toBe(true);
  });
});
