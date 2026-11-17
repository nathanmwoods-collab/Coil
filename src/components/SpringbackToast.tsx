import { router, usePathname } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { announce } from '../lib/feel';
import { useApp } from '../store/useApp';
import { motion, NATIVE_DRIVER, useReducedMotion } from '../theme/motion';
import { type } from '../theme/type';
import { makeStyles, useColors } from '../theme/useTheme';
import { ChevronRight } from './icons';
import { SpringGlyph } from './SpringGauge';
import { formatCents, Tap } from './ui';

const SHOW_MS = 7000;

/**
 * "Springback landed": shown app-wide when a Wednesday payout arrives. Flat and
 * literal, because it's money. Tapping it opens the Springback screen, where
 * the spring lets go. It never covers the Springback screen itself.
 */
export function SpringbackToast() {
  const s = useStyles();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const landed = useApp((st) => st.sbLanded);
  const path = usePathname();
  const [hiddenAt, setHiddenAt] = useState<number | null>(null);
  const v = useRef(new Animated.Value(0)).current;
  const show = !!landed && landed.at !== hiddenAt && path !== '/springback';
  const text = landed ? `Springback landed: ${formatCents(landed.amount)} in entry credit` : '';
  const at = landed?.at;

  useEffect(() => {
    if (!show || at == null) return;
    announce(`${text}. Mock.`);
    v.setValue(reduced ? 1 : 0);
    if (!reduced) Animated.spring(v, { toValue: 1, ...motion.spring, useNativeDriver: NATIVE_DRIVER }).start();
    const t = setTimeout(() => setHiddenAt(at), SHOW_MS);
    return () => clearTimeout(t);
  }, [show, at, text, reduced, v]);

  if (!show || !landed) return null;
  return (
    <Animated.View
      pointerEvents="box-none"
      style={[s.wrap, { top: insets.top + 8, opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [-18, 0] }) }] }]}
    >
      <Tap
        testID="springback-toast"
        accessibilityRole="button"
        accessibilityLabel={`${text}. Mock. See your Springback.`}
        onPress={() => {
          setHiddenAt(landed.at);
          router.push('/springback');
        }}
        scaleTo={0.98}
        style={s.toast}
      >
        <SpringGlyph color={c.accent} size={26} />
        <View style={{ flex: 1 }}>
          <Text style={s.title}>{text}</Text>
          <Text style={s.sub}>Mock credit. No playthrough. Tap to see it.</Text>
        </View>
        <ChevronRight color={c.textMuted} size={18} />
      </Tap>
    </Animated.View>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: { position: 'absolute', left: 12, right: 12, zIndex: 50 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 60,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: c.surfaceAlt,
    borderWidth: 1,
    borderColor: c.accent,
  },
  title: { ...type.bodyStrong, color: c.text },
  sub: { ...type.micro, color: c.textMuted },
}));
