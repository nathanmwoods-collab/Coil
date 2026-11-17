/**
 * Clutch, the Rattler: pure geometry, no React. Every pose is a delta from the
 * logo mark (viewBox 0 0 128 128, same path data as the app icon), so the
 * character is always recognisably the logo. Kept free of imports so the
 * drawing can be rendered and checked outside the app.
 *
 * Six shapes only: body arc, head, eye, fang, three rattle segments.
 * Expression comes from the eye, the head angle, coil tightness and the rattle.
 */
export type RattlerPose = 'resting' | 'asleep' | 'rattle' | 'sweating' | 'strike' | 'smug' | 'bust';

export type RattlerInk = {
  /** Body, head and fang. */
  body: string;
  /** Whatever is behind the figure: the eye is a cut-out in this colour. */
  cut: string;
  rattle: string;
  /** Sleep coils. */
  muted: string;
  tongue: string;
  sweat: string;
};

/** Animation inputs. All optional; the defaults give the still for each pose. */
export type RattlerFrame = {
  /** Degrees added to the rattle's angle (the shake). */
  swing?: number;
  /** Motion arcs beside the rattle are visible. */
  buzz?: boolean;
  /** 0..1 progress of the sweat drop's slide. */
  drop?: number;
  /** 0..1 how far the tongue is out. */
  tongue?: number;
  /** 0..1 rise of the sleep coils. */
  doze?: number;
  /** Strike beat. `lunge` is also the still for the pose. */
  beat?: 'wind' | 'lunge';
};

export type Shape =
  | { t: 'path'; d: string; fill?: string; stroke?: string; strokeWidth?: number; cap?: 'butt' | 'round'; opacity?: number; transform?: string }
  | { t: 'rect'; x: number; y: number; w: number; h: number; rx: number; fill: string; transform?: string }
  | { t: 'circle'; cx: number; cy: number; r: number; fill: string; opacity?: number }
  | { t: 'g'; transform?: string; children: Shape[] };

export const RATTLER_VIEWBOX = 128;

// --- Logo geometry, verbatim -------------------------------------------------
const BODY = 'M69.8 33.3A38 38 0 1 0 69.8 108.7';
const CENTRE = '65 71';
const HEAD = 'M60 22L94 14L124 34L122 44L100 47L112 60L84 62L66 44Z';
const FANG = 'M103 45L111 44L107 56Z';
const EYE = 'M88 25L106 34L92 36Z';
const NECK = '70 33';
const TAIL = '69.8 108.7';

// --- Pose parts ---------------------------------------------------------------
/** Alert: the slit opens to twice its height. */
const EYE_ALERT = 'M87 20L107 33.5L91 39Z';
/** Smug: only the lower half of the slit shows, under a flat lid. */
const EYE_SMUG = 'M90 31L106 34L92 36.5Z';
/** Asleep: a closed lid, one curved stroke. */
const EYE_SHUT = 'M87 30Q95 36 104 33';
/** Strike: the skull without its lower jaw, and the jaw dropped open. */
const HEAD_UPPER = 'M60 22L94 14L124 34L122 44L100 47L80 50L66 44Z';
const JAW = 'M66 44L80 50L100 50L112 60L84 62Z';
const HINGE = '70 47';

const rot = (deg: number, about: string) => `rotate(${deg} ${about})`;

function rattle(ink: RattlerInk, angle: number): Shape {
  return {
    t: 'g',
    transform: rot(angle, TAIL),
    children: [
      { t: 'rect', x: 68, y: 92, w: 13, h: 24, rx: 5, fill: ink.rattle, transform: 'rotate(-20 74.5 104)' },
      { t: 'rect', x: 82, y: 88, w: 12, h: 20, rx: 5, fill: ink.rattle, transform: 'rotate(-40 88 98)' },
      { t: 'rect', x: 93, y: 81, w: 10, h: 15, rx: 4.5, fill: ink.rattle, transform: 'rotate(-58 98 88.5)' },
    ],
  };
}

/** The whole figure laid out flat for `bust`: uncoiled, face down, out cold. */
function bust(ink: RattlerInk, f: RattlerFrame): Shape[] {
  const x = (cx: number, cy: number): Shape[] => [
    { t: 'path', d: `M${cx - 4} ${cy - 4}L${cx + 4} ${cy + 4}`, stroke: ink.cut, strokeWidth: 2.6, cap: 'round' },
    { t: 'path', d: `M${cx + 4} ${cy - 4}L${cx - 4} ${cy + 4}`, stroke: ink.cut, strokeWidth: 2.6, cap: 'round' },
  ];
  return [
    {
      t: 'g',
      transform: `rotate(${f.swing ?? 0} 30 86)`,
      children: [
        { t: 'rect', x: 17, y: 79, w: 12, h: 13, rx: 5, fill: ink.rattle },
        { t: 'rect', x: 9, y: 80.5, w: 10, h: 11, rx: 4.5, fill: ink.rattle },
        { t: 'rect', x: 2, y: 82, w: 8.5, h: 9, rx: 4, fill: ink.rattle },
      ],
    },
    { t: 'path', d: 'M28 86C46 100 62 70 84 84', stroke: ink.body, strokeWidth: 15, cap: 'butt' },
    {
      t: 'g',
      // The logo head at 62%, chin on the floor.
      transform: 'translate(36 70) rotate(14 70 33) scale(0.62)',
      children: [
        { t: 'path', d: HEAD, fill: ink.body },
        { t: 'g', transform: 'translate(96 31) scale(1.6) translate(-96 -31)', children: x(96, 31) },
      ],
    },
  ];
}

export function rattlerShapes(pose: RattlerPose, ink: RattlerInk, f: RattlerFrame = {}): Shape[] {
  if (pose === 'bust') return bust(ink, f);

  const swing = f.swing ?? 0;
  const out: Shape[] = [];

  // Rattle: up when alert, flat when asleep, upright and still when smug.
  const base = pose === 'asleep' ? 30 : pose === 'rattle' || pose === 'sweating' ? -22 : pose === 'smug' ? -14 : 0;
  const tail = rattle(ink, base + swing);

  // Body: the logo arc. Sweating and the strike wind-up coil it tighter.
  const tight = pose === 'sweating' ? 0.92 : pose === 'strike' && f.beat === 'wind' ? 0.88 : 1;
  const body: Shape = { t: 'path', d: BODY, stroke: ink.body, strokeWidth: tight < 1 ? 24 : 22, cap: 'butt' };

  // Head: angle carries most of the expression.
  const lunge = pose === 'strike' && f.beat !== 'wind';
  const angle =
    pose === 'asleep' ? 34 : pose === 'rattle' ? -12 : pose === 'sweating' ? -14 : pose === 'smug' ? -20 : pose === 'strike' ? (lunge ? -8 : -22) : 0;
  const head: Shape[] = [];
  if (lunge) {
    // Mouth open: the jaw drops on its hinge, the fang stays on the skull.
    head.push({ t: 'path', d: JAW, fill: ink.body, transform: rot(28, HINGE) });
    head.push({ t: 'path', d: HEAD_UPPER, fill: ink.body });
    head.push({ t: 'path', d: FANG, fill: ink.body });
  } else {
    head.push({ t: 'path', d: HEAD, fill: ink.body });
    if (pose !== 'asleep') head.push({ t: 'path', d: FANG, fill: ink.body });
  }
  if (pose === 'asleep') head.push({ t: 'path', d: EYE_SHUT, stroke: ink.cut, strokeWidth: 3.2, cap: 'round' });
  else if (pose === 'sweating') {
    head.push({ t: 'circle', cx: 95, cy: 30, r: 7.5, fill: ink.cut });
    head.push({ t: 'circle', cx: 97.5, cy: 30.5, r: 2.6, fill: ink.body });
  } else head.push({ t: 'path', d: pose === 'rattle' || pose === 'strike' ? EYE_ALERT : pose === 'smug' ? EYE_SMUG : EYE, fill: ink.cut });
  if (pose === 'smug') {
    const k = f.tongue ?? 1;
    if (k > 0.05) {
      const tx = 123 + 9 * k;
      head.push({ t: 'path', d: `M122 40L${tx.toFixed(1)} 41.5`, stroke: ink.tongue, strokeWidth: 2.8, cap: 'round' });
      head.push({ t: 'path', d: `M${tx.toFixed(1)} 41.5l${(6 * k).toFixed(1)} -4`, stroke: ink.tongue, strokeWidth: 2.4, cap: 'round' });
      head.push({ t: 'path', d: `M${tx.toFixed(1)} 41.5l${(6 * k).toFixed(1)} 4.5`, stroke: ink.tongue, strokeWidth: 2.4, cap: 'round' });
    }
  }
  const headG: Shape = { t: 'g', transform: `${lunge ? 'translate(8 2) ' : ''}${rot(angle, NECK)}`, children: head };

  const coil: Shape[] = pose === 'asleep' ? [tail, body, headG] : [body, headG, tail];
  out.push(tight < 1 ? { t: 'g', transform: `translate(65 71) scale(${tight}) translate(-65 -71)`, children: coil } : { t: 'g', children: coil });

  if ((pose === 'rattle' || pose === 'sweating') && f.buzz !== false) {
    // Two short arcs either side of the raised rattle: it is shaking.
    out.push({ t: 'path', d: 'M72 76Q68 82 71 89', stroke: ink.rattle, strokeWidth: 2.8, cap: 'round', opacity: 0.55 });
    out.push({ t: 'path', d: 'M103 74Q108 80 106 88', stroke: ink.rattle, strokeWidth: 2.8, cap: 'round', opacity: 0.55 });
  }
  if (pose === 'sweating') {
    const k = f.drop ?? 0.25;
    const x = 66 - 8 * k;
    const y = 8 + 14 * k;
    out.push({
      t: 'path',
      d: `M${x} ${y - 6}C${x + 5} ${y + 1} ${x + 4.5} ${y + 5} ${x} ${y + 5}C${x - 4.5} ${y + 5} ${x - 5} ${y + 1} ${x} ${y - 6}Z`,
      fill: ink.sweat,
      opacity: 0.85 * (1 - Math.max(0, k - 0.6) / 0.4),
    });
  }
  if (pose === 'asleep') {
    // Small coils in place of "zzz".
    const k = f.doze ?? 0.35;
    const fade = k < 0.15 ? k / 0.15 : k > 0.7 ? Math.max(0, (1 - k) / 0.3) : 1;
    const lift = -12 * k;
    out.push({ t: 'path', d: `M109 ${(26 + lift).toFixed(1)}a4.5 4.5 0 1 0 5 6`, stroke: ink.muted, strokeWidth: 2.6, cap: 'round', opacity: fade });
    out.push({ t: 'path', d: `M119 ${(11 + lift).toFixed(1)}a3 3 0 1 0 3.4 4`, stroke: ink.muted, strokeWidth: 2.2, cap: 'round', opacity: fade * 0.8 });
  }
  return out;
}

/** Just the three rattle segments, for the tab-bar badge. viewBox 0 0 44 44. */
export function rattleOnly(colour: string, swing = 0): Shape[] {
  return [
    {
      t: 'g',
      transform: `rotate(${swing} 8 36)`,
      children: [
        { t: 'rect', x: 3, y: 18, w: 13, h: 24, rx: 5, fill: colour, transform: 'rotate(-20 9.5 30)' },
        { t: 'rect', x: 17, y: 14, w: 12, h: 20, rx: 5, fill: colour, transform: 'rotate(-40 23 24)' },
        { t: 'rect', x: 28, y: 7, w: 10, h: 15, rx: 4.5, fill: colour, transform: 'rotate(-58 33 14.5)' },
      ],
    },
  ];
}
