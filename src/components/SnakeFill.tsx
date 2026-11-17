import { memo, useMemo, useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

const H = 14;
const AMP = 3.5;
const PERIOD = 46;

/** A short snaking line that fills along its path, in place of a flat progress bar. */
export const SnakeFill = memo(function SnakeFill({ value, color, track }: { value: number; color: string; track: string }) {
  const [w, setW] = useState(0);
  const { d, len, end } = useMemo(() => {
    if (w <= 0) return { d: '', len: 0, end: [0, 0] as [number, number] };
    const pts: [number, number][] = [];
    for (let x = 3; x <= w - 3; x += 2) pts.push([x, H / 2 + AMP * Math.sin((x / PERIOD) * Math.PI * 2)]);
    let total = 0;
    for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    const pct = Math.max(0, Math.min(1, value));
    const head = pts[Math.min(pts.length - 1, Math.round(pct * (pts.length - 1)))];
    return { d: pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' '), len: total, end: head };
  }, [w, value]);
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={{ height: H }} onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width))}>
      {w > 0 ? (
        <Svg width={w} height={H}>
          <Path d={d} stroke={track} strokeWidth={2} strokeLinecap="round" fill="none" />
          <Path d={d} stroke={color} strokeWidth={2.4} strokeLinecap="round" fill="none" strokeDasharray={`${len * pct} ${len}`} />
          {pct > 0 ? <Circle cx={end[0]} cy={end[1]} r={3} fill={color} /> : null}
        </Svg>
      ) : null}
    </View>
  );
});
