import { memo } from 'react';
import { View } from 'react-native';
import Svg, { ClipPath, Defs, Path, Pattern, Rect } from 'react-native-svg';

/**
 * Scales from the logo's C-arc: overlapping half-circles, alternate rows
 * offset by half a tile. Always faint (4-6%), always clipped to a corner,
 * never under body text or across a whole screen.
 */
export const ScalePattern = memo(function ScalePattern({
  width,
  height,
  color = '#F4F3FF',
  opacity = 0.06,
  corner = 'top-right',
  id = 'scales',
}: {
  width: number;
  height: number;
  color?: string;
  opacity?: number;
  corner?: 'top-right' | 'top-left';
  id?: string;
}) {
  // A quarter-ellipse out of the corner, so the texture fades into the card by shape, not gradient.
  const clip =
    corner === 'top-right'
      ? `M${width} 0 L${width} ${height} A${width} ${height} 0 0 1 0 0 Z`
      : `M0 0 L${width} 0 A${width} ${height} 0 0 1 0 ${height} Z`;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, [corner === 'top-right' ? 'right' : 'left']: 0, width, height }}>
      <Svg width={width} height={height}>
        <Defs>
          <Pattern id={id} patternUnits="userSpaceOnUse" width={16} height={24}>
            <Path d="M0 12 A8 8 0 0 1 16 12" stroke={color} strokeWidth={1} fill="none" />
            <Path d="M-8 24 A8 8 0 0 1 8 24 M8 24 A8 8 0 0 1 24 24" stroke={color} strokeWidth={1} fill="none" />
          </Pattern>
          <ClipPath id={`${id}-clip`}>
            <Path d={clip} />
          </ClipPath>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill={`url(#${id})`} opacity={opacity} clipPath={`url(#${id}-clip)`} />
      </Svg>
    </View>
  );
});
