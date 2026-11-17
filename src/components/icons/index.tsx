import { memo } from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

/**
 * Coil icon set (personality spec §2.9): one 2px round-cap stroke, drawn in
 * the logo's grammar, with the mint dot as the active state.
 */
type IconProps = { size?: number; color: string; strokeWidth?: number };

function Stroke({ d, color, strokeWidth = 2 }: { d: string; color: string; strokeWidth?: number }) {
  return <Path d={d} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill="none" />;
}

export const ChevronLeft = memo(function ChevronLeft({ size = 24, color, strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Stroke d="M15 5l-7 7 7 7" color={color} strokeWidth={strokeWidth} />
    </Svg>
  );
});

export const ChevronRight = memo(function ChevronRight({ size = 24, color, strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Stroke d="M9 5l7 7-7 7" color={color} strokeWidth={strokeWidth} />
    </Svg>
  );
});

export const ArrowUp = memo(function ArrowUp({ size = 20, color, strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Stroke d="M12 19V5M6 11l6-6 6 6" color={color} strokeWidth={strokeWidth} />
    </Svg>
  );
});

export const ArrowDown = memo(function ArrowDown({ size = 20, color, strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Stroke d="M12 5v14M6 13l6 6 6-6" color={color} strokeWidth={strokeWidth} />
    </Svg>
  );
});

export const Close = memo(function Close({ size = 20, color, strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Stroke d="M6 6l12 12M18 6L6 18" color={color} strokeWidth={strokeWidth} />
    </Svg>
  );
});

export const Check = memo(function Check({ size = 20, color, strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Stroke d="M5 12.5l4.5 4.5L19 7.5" color={color} strokeWidth={strokeWidth} />
    </Svg>
  );
});

export const Alert = memo(function Alert({ size = 16, color, strokeWidth }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={strokeWidth ?? 2} fill="none" />
      <Stroke d="M12 7.5v5.5" color={color} strokeWidth={strokeWidth} />
      <Circle cx={12} cy={16.5} r={1.2} fill={color} />
    </Svg>
  );
});

export const More = memo(function More({ size = 24, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={5.5} cy={12} r={1.7} fill={color} />
      <Circle cx={12} cy={12} r={1.7} fill={color} />
      <Circle cx={18.5} cy={12} r={1.7} fill={color} />
    </Svg>
  );
});

/**
 * Queue marker: Clutch's rattle, three fanned segments. Outlined when the
 * player is not queued; filled mint when he is.
 */
export const QueueMark = memo(function QueueMark({
  size = 22,
  color,
  filled,
  fill,
}: IconProps & { filled?: boolean; fill?: string }) {
  const ink = filled ? fill ?? color : color;
  const seg = (x: number, y: number, w: number, h: number, rx: number, rot: number) => (
    <Rect
      x={x}
      y={y}
      width={w}
      height={h}
      rx={rx}
      transform={`rotate(${rot} ${x + w / 2} ${y + h / 2})`}
      fill={filled ? ink : 'none'}
      stroke={ink}
      strokeWidth={1.8}
    />
  );
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {seg(3.2, 9.5, 6, 11, 2.6, -20)}
      {seg(9.6, 7.2, 5.4, 9, 2.4, -40)}
      {seg(15, 3.6, 4.6, 7, 2.2, -58)}
    </Svg>
  );
});

// Spiral for the "You" tab: the logo's curl, drawn as one stroke.
const SPIRAL = (() => {
  const pts: string[] = [];
  for (let i = 0; i <= 64; i++) {
    const t = (i / 64) * Math.PI * 3.1;
    const r = 1.3 + 0.82 * t;
    const x = 12 + r * Math.cos(t - Math.PI / 2);
    const y = 12 + r * Math.sin(t - Math.PI / 2);
    pts.push(`${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return pts.join(' ');
})();

export type TabName = 'index' | 'drafts' | 'exposure' | 'account';

const TAB_PATHS: Record<TabName, { d: string; dot: [number, number] }> = {
  // Three-row snake: the top half of the logo.
  index: { d: 'M4 5.5h13a3.25 3.25 0 0 1 0 6.5H7a3.25 3.25 0 0 0 0 6.5h10', dot: [20.5, 18.5] },
  // Stacked pick cards.
  drafts: { d: 'M9 4h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM4 9v9a2 2 0 0 0 2 2h9', dot: [13.5, 10.5] },
  // Partial ring: a pie wedge in one stroke.
  exposure: { d: 'M12 12V3a9 9 0 1 1-9 9', dot: [4.6, 6.6] },
  account: { d: SPIRAL, dot: [12, 12] },
};

export const TabIcon = memo(function TabIcon({
  name,
  color,
  focused,
  dot,
}: {
  name: string;
  color: string;
  focused: boolean;
  dot: string;
}) {
  const p = TAB_PATHS[name as TabName] ?? TAB_PATHS.index;
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24">
      <Stroke d={p.d} color={color} strokeWidth={focused ? 2.1 : 1.8} />
      {focused ? <Circle cx={p.dot[0]} cy={p.dot[1]} r={2.3} fill={dot} /> : null}
    </Svg>
  );
});
