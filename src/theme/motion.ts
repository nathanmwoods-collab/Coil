import { useEffect, useState } from 'react';
import { AccessibilityInfo, Easing, Platform } from 'react-native';

/** Native driver where it exists; web runs the same animations in JS without the warning. */
export const NATIVE_DRIVER = Platform.OS !== 'web';

const outQuint = Easing.bezier(0.22, 1, 0.36, 1);

/** "Wind, then release" motion tokens (personality spec §2.4). */
export const motion = {
  tap: { duration: 90, easing: Easing.out(Easing.quad), scale: 0.96 },
  snap: { duration: 180, easing: outQuint },
  spring: { damping: 14, stiffness: 220, mass: 0.9 },
  settle: { duration: 280, easing: outQuint },
  wind: { duration: 900, easing: Easing.inOut(Easing.cubic) },
} as const;

/** On-the-clock pulse period: it speeds up as the clock runs down. */
export function breathMs(msLeft: number) {
  if (msLeft < 5_000) return 300;
  if (msLeft < 10_000) return 600;
  return 1200;
}

/** True when the OS asks for reduced motion. Springs and draws become instant, the pulse holds still. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => alive && setReduced(v))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      alive = false;
      sub?.remove?.();
    };
  }, []);
  return reduced;
}
