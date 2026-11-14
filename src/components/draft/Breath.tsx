import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';

import { breathMs, NATIVE_DRIVER, useReducedMotion } from '../../theme/motion';

/**
 * The on-the-clock "breath": a mint border that pulses, faster under 10s and 5s.
 * Place inside a positioned container. Reduced motion holds it as a static border.
 */
export function Breath({
  endsAt,
  color,
  radius,
  width = 2,
}: {
  endsAt: number | null;
  color: string;
  radius: number;
  width?: number;
}) {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(1)).current;
  const [period, setPeriod] = useState(() => breathMs(endsAt === null ? Infinity : endsAt - Date.now()));

  useEffect(() => {
    if (endsAt === null) return;
    const t = setInterval(() => setPeriod(breathMs(endsAt - Date.now())), 250);
    return () => clearInterval(t);
  }, [endsAt]);

  useEffect(() => {
    if (reduced) {
      v.setValue(1);
      return;
    }
    const half = period / 2;
    const ease = Easing.inOut(Easing.sin);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 0.25, duration: half, easing: ease, useNativeDriver: NATIVE_DRIVER }),
        Animated.timing(v, { toValue: 1, duration: half, easing: ease, useNativeDriver: NATIVE_DRIVER }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [period, reduced, v]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { borderRadius: radius, borderWidth: width, borderColor: color, opacity: v }]}
    />
  );
}
