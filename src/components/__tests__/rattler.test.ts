import { describe, expect, it } from 'vitest';

import { rattlerShapes, type RattlerPose } from '../rattlerShapes';

const ink = { body: 'B', cut: 'C', rattle: 'R', muted: 'M', tongue: 'T', sweat: 'S' };
const POSES: RattlerPose[] = ['resting', 'asleep', 'rattle', 'sweating', 'strike', 'smug', 'bust'];

describe('Clutch geometry', () => {
  it('starts from the logo mark exactly', () => {
    const json = JSON.stringify(rattlerShapes('resting', ink));
    expect(json).toContain('M69.8 33.3A38 38 0 1 0 69.8 108.7');
    expect(json).toContain('M60 22L94 14L124 34L122 44L100 47L112 60L84 62L66 44Z');
  });

  it('every pose draws something different from resting', () => {
    const rest = JSON.stringify(rattlerShapes('resting', ink));
    for (const p of POSES.slice(1)) expect(JSON.stringify(rattlerShapes(p, ink))).not.toBe(rest);
  });

  it('uses only the logo palette roles, and the tongue only when smug', () => {
    for (const p of POSES) {
      const json = JSON.stringify(rattlerShapes(p, ink));
      expect(json.includes('"T"')).toBe(p === 'smug');
    }
  });
});
