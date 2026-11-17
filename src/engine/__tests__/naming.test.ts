import { describe, expect, it } from 'vitest';

import { archetype, buildProfile, formatTeamName, MAX_TEAM_NAME, primaryStack, stackLabel, stackTeams, surname, teamStructure, type NameContext, type StackPlayer } from '../naming';
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

describe('build profile and quips', () => {
  type P = { round: number; position: Position; name?: string };
  /** A full 18-round roster from a position string, e.g. "WWRRR..." (Q/R/W/T). */
  const roster = (spec: string, names: Record<number, string> = {}): P[] =>
    [...spec].map((ch, i) => ({
      round: i + 1,
      position: ({ Q: 'QB', R: 'RB', W: 'WR', T: 'TE' } as const)[ch as 'Q' | 'R' | 'W' | 'T'],
      ...(names[i + 1] ? { name: names[i + 1] } : {}),
    }));

  it('never says "backfield early" when the early picks were receivers (founder comment 11)', () => {
    // Josh Downs (a WR) in round 2, backs in 3-5.
    const team = roster('WWRRRWQTWRWRQWTRWR', { 2: 'Josh Downs' });
    const p = buildProfile(team);
    expect(p.primary).toBe('Robust RB');
    expect(p.line).toBe('3 backs by round 5. Bought the backfield.');
  });

  it('labels each archetype', () => {
    expect(buildProfile(roster('WWWWWWRQRTRWRWQRTW')).primary).toBe('Zero RB');
    expect(buildProfile(roster('RWWWWWQWRTRWRWQRTW')).primary).toBe('Hero RB');
    expect(buildProfile(roster('RRRWWWQWRTRWRWQRTW')).primary).toBe('Robust RB');
    expect(buildProfile(roster('RRWWWWQWWTWWRWQWTW')).primary).toBe('Hyper-fragile RB');
    expect(buildProfile(roster('RWRQWWWTRWRWRWQRTW')).primary).toBe('Elite QB');
    expect(buildProfile(roster('RWTRWWWQRWRWRWQRTW')).primary).toBe('Elite TE');
    expect(buildProfile(roster('RWRWWTWWRWQRRWQRWW')).primary).toBe('Late-round QB');
    expect(buildProfile(roster('RWRWWWQWRWRWRTQRWT')).primary).toBe('Zero TE');
    expect(buildProfile(roster('RWRWWQWTRWRWRTQRWW')).primary).toBe('Balanced');
  });

  it('WR Avalanche leads a two-back build', () => {
    const p = buildProfile(roster('WWRWWRWQRTRWRWQRTW'));
    expect(p.primary).toBe('WR Avalanche');
    expect(p.line).toBe('5 receivers in the first 7 rounds. Let it rain.');
  });

  it('keeps every label that applies, primary first', () => {
    const p = buildProfile(roster('WTWQWWWWRWRWRWQRTR'));
    expect(p.tags[0]).toBe('Zero RB');
    expect(p.tags).toEqual(expect.arrayContaining(['WR Avalanche', 'Elite QB', 'Elite TE']));
  });

  it('names the hero and the gap', () => {
    const p = buildProfile(roster('WRWWWWQWWRTRWRQRTW', { 2: 'Bijan Robinson' }));
    expect(p.line).toBe('Robinson in round 2, then no back till round 10.');
  });

  it('does not call a team mid-draft Zero TE or Late-round QB for picks not made yet', () => {
    const p = buildProfile(roster('RWRWW'));
    expect(p.tags).not.toContain('Zero TE');
    expect(p.tags).not.toContain('Late-round QB');
  });

  it('every quip agrees with the roster it describes (random rosters)', () => {
    let seed = 7;
    const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
    for (let n = 0; n < 500; n++) {
      const spec = Array.from({ length: 18 }, () => 'QRRWWWT'[Math.floor(rand() * 7)]).join('');
      const team = roster(spec);
      const { primary, line } = buildProfile(team);
      const firstRound = (pos: string) => team.find((p) => p.position === pos)?.round;
      const rbsBy = (r: number) => team.filter((p) => p.position === 'RB' && p.round <= r).length;
      // Lines only talk about running backs on running-back builds.
      if (/\bbacks?\b|running back/.test(line)) expect(primary).toMatch(/RB|Balanced/);
      let m: RegExpMatchArray | null;
      if ((m = line.match(/^(\d+) backs by round (\d+)/))) expect(rbsBy(+m[2])).toBe(+m[1]);
      if ((m = line.match(/No running back till round (\d+)/))) expect(firstRound('RB')).toBe(+m[1]);
      if ((m = line.match(/First quarterback in round (\d+)/))) expect(firstRound('QB')).toBe(+m[1]);
      if ((m = line.match(/First tight end in round (\d+)/))) expect(firstRound('TE')).toBe(+m[1]);
      if ((m = line.match(/^(\d+) receivers in the first (\d+) rounds/)))
        expect(team.filter((p) => p.position === 'WR' && p.round <= +m![2]).length).toBe(+m[1]);
      if ((m = line.match(/^(\d+) backs early, (\d+) all season/)))
        expect(team.filter((p) => p.position === 'RB').length).toBe(+m[2]);
    }
  });
});

describe('stack teams token', () => {
  const pl = (team: string, position: Position): StackPlayer => ({ name: `${team} ${position}`, team, position, adp: 50 });
  it('names every QB stack, biggest first', () => {
    const roster = [pl('KC', 'QB'), pl('KC', 'TE'), pl('IND', 'QB'), pl('IND', 'WR'), pl('IND', 'WR'), pl('DET', 'RB'), pl('DET', 'WR')];
    expect(stackTeams(roster)).toEqual(['IND', 'KC']);
  });
  it('falls back to same-team groups without a QB stack', () => {
    expect(stackTeams([pl('DET', 'RB'), pl('DET', 'WR'), pl('MIA', 'WR')])).toEqual(['DET']);
    expect(stackTeams([pl('DET', 'RB'), pl('MIA', 'WR')])).toEqual([]);
  });
  it('formats as a name token', () => {
    const ctx: NameContext = {
      counts: { QB: 2, RB: 5, WR: 8, TE: 3 }, archetype: 'Zero RB', stack: null, stackTeams: ['IND', 'KC'],
      draftedAt: Date.UTC(2026, 10, 14), contestName: 'Two-Minute Drill', slot: 4,
    };
    expect(formatTeamName(['stackTeams'], ctx)).toBe('IND KC');
    expect(formatTeamName(['stackTeams'], { ...ctx, stackTeams: [] })).toBe('No stack');
  });
});

describe('hero quip wording', () => {
  it('does not make a one-round gap sound like a statement', () => {
    const team = [...'WWWWWRRWQTRWRWQRTW'].map((ch, i) => ({
      round: i + 1,
      position: ({ Q: 'QB', R: 'RB', W: 'WR', T: 'TE' } as const)[ch as 'Q' | 'R' | 'W' | 'T'],
      ...(i === 5 ? { name: 'Omarion Hampton' } : {}),
    }));
    expect(buildProfile(team).line).toBe('Hampton in round 6. The only back in the first 6 rounds.');
  });
});
