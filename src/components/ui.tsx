import { memo, useEffect, useRef, type ReactNode } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import type { Position } from '../engine';
import { feel } from '../lib/feel';
import { motion, NATIVE_DRIVER, useReducedMotion } from '../theme/motion';
import { fonts, type } from '../theme/type';
import { makeStyles, useColors } from '../theme/useTheme';
import { Alert, UnwoundLine } from './icons';

export const HIT = 44;

export function formatMoney(n: number, opts: { compact?: boolean } = {}) {
  if (opts.compact && Math.abs(n) >= 1000) {
    if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
    return `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`;
  }
  const fixed = Number.isInteger(n) ? 0 : 2;
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: fixed, maximumFractionDigits: 2 })}`;
}

/** Springback amounts: always to the cent, and honest about anything smaller. */
export function formatCents(n: number) {
  if (n > 0 && n < 0.005) return 'under 1¢';
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Rates: 4%, 5.3%. */
export function formatPct(n: number) {
  const v = Math.round(n * 10) / 10;
  return `${Number.isInteger(v) ? v : v.toFixed(1)}%`;
}

/** Points always carry one decimal. */
export function formatPts(n: number) {
  return n.toFixed(1);
}

export function clockLabel(sec: number) {
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.round(sec / 60)}m`;
  return `${Math.round(sec / 3600)}h`;
}

export function clockSpeed(sec: number): 'Fast' | 'Slow' {
  return sec <= 120 ? 'Fast' : 'Slow';
}

export function formatCountdown(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  if (s < 60) return `${s}s`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}h ${m.toString().padStart(2, '0')}m` : `${m}:${sec.toString().padStart(2, '0')}`;
}

/** "Today", "Yesterday", or "Nov 12". */
export function relativeDay(ts: number, now = Date.now()) {
  const day = (t: number) => {
    const d = new Date(t);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  };
  const diff = Math.round((day(now) - day(ts)) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const SUFFIXES = new Set(['jr', 'jr.', 'sr', 'sr.', 'ii', 'iii', 'iv', 'v']);
/** Last name for tight spaces, skipping suffixes like "Jr." or "III". */
export function shortName(full: string) {
  const parts = full.split(' ');
  while (parts.length > 1 && SUFFIXES.has(parts[parts.length - 1].toLowerCase())) parts.pop();
  return parts[parts.length - 1];
}

export function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function Screen({ children, edges = ['top'] }: { children: ReactNode; edges?: Edge[] }) {
  const c = useColors();
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: c.bg }}>
      {children}
    </SafeAreaView>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Pressable with the `tap` press-in: a quick scale down that releases on lift.
 * Every tappable surface goes through here so the whole app has one touch feel.
 */
export function Tap({
  style,
  children,
  scaleTo = motion.tap.scale,
  disabled,
  onPressIn,
  onPressOut,
  ...rest
}: Omit<PressableProps, 'style' | 'children'> & { style?: StyleProp<ViewStyle>; children?: ReactNode; scaleTo?: number }) {
  const scale = useRef(new Animated.Value(1)).current;
  const reduced = useReducedMotion();
  const to = (v: number) =>
    Animated.timing(scale, { toValue: v, duration: motion.tap.duration, easing: motion.tap.easing, useNativeDriver: NATIVE_DRIVER }).start();
  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(e) => {
        if (!disabled && !reduced) to(scaleTo);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        to(1);
        onPressOut?.(e);
      }}
      style={[style, { transform: [{ scale }] }]}
    >
      {children}
    </AnimatedPressable>
  );
}

export const PosPill = memo(function PosPill({ pos, small }: { pos: Position; small?: boolean }) {
  const c = useColors();
  return (
    <View style={[pill.base, small && pill.small, { backgroundColor: c[pos] + '24' }]}>
      <Text style={[pill.text, small && pill.textSmall, { color: c[pos] }]}>{pos}</Text>
    </View>
  );
});

const pill = StyleSheet.create({
  base: { minWidth: 34, paddingHorizontal: 6, height: 22, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  small: { minWidth: 28, height: 18, paddingHorizontal: 4, borderRadius: 4 },
  text: { fontFamily: fonts.strong, fontSize: 11, letterSpacing: 0.6 },
  textSmall: { fontSize: 10 },
});

export function ProgressBar({ value, color, height = 6, track }: { value: number; color?: string; height?: number; track?: string }) {
  const c = useColors();
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: track ?? c.surfaceAlt, overflow: 'hidden' }}>
      <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: color ?? c.primary, borderRadius: height / 2 }} />
    </View>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

/** `primary` is the mint action: one per screen. Violet is never a button color. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  style,
  small,
  testID,
  icon,
}: {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
  testID?: string;
  icon?: ReactNode;
}) {
  const c = useColors();
  const bg =
    variant === 'primary' ? c.accent : variant === 'danger' ? c.danger : variant === 'secondary' ? c.surfaceAlt : 'transparent';
  const fg = variant === 'primary' ? c.bg : variant === 'danger' ? '#FFFFFF' : c.text;
  return (
    <Tap
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      hitSlop={small ? 6 : 0}
      style={[
        {
          minHeight: small ? 36 : 52,
          paddingHorizontal: small ? 14 : 20,
          borderRadius: small ? 18 : 26,
          backgroundColor: disabled && variant === 'primary' ? c.surfaceAlt : bg,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
          borderWidth: variant === 'ghost' ? 1 : 0,
          borderColor: c.border,
        },
        style,
      ]}
    >
      {icon}
      <Text style={{ color: disabled && variant === 'primary' ? c.textMuted : fg, fontFamily: fonts.strong, fontSize: small ? 13 : 16 }}>
        {label}
      </Text>
    </Tap>
  );
}

export function Chip({
  label,
  active,
  onPress,
  color,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  color?: string;
}) {
  const c = useColors();
  const tint = color ?? c.text;
  return (
    <Tap
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      onPress={() => {
        if (!active) feel.select();
        onPress?.();
      }}
      style={{
        minHeight: 34,
        minWidth: 44,
        paddingHorizontal: 13,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: active ? tint + '22' : 'transparent',
        borderWidth: 1,
        borderColor: active ? tint + 'AA' : c.border,
      }}
    >
      <Text style={{ color: active ? tint : c.textMuted, fontFamily: fonts.strong, fontSize: 13 }}>{label}</Text>
    </Tap>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string; badge?: number }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const s = useSegStyles();
  const c = useColors();
  return (
    <View style={s.wrap} accessibilityRole="tablist">
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (!active) feel.select();
              onChange(o.key);
            }}
            style={s.item}
          >
            <Text style={[s.label, { color: active ? c.text : c.textMuted }]}>{o.label}</Text>
            {o.badge ? (
              <View style={s.badge}>
                <Text style={s.badgeText}>{o.badge}</Text>
              </View>
            ) : null}
            {active ? <View style={s.underline} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const useSegStyles = makeStyles((c) => ({
  wrap: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: c.border },
  item: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5 },
  label: { fontFamily: fonts.strong, fontSize: 14 },
  underline: { position: 'absolute', left: '22%', right: '22%', bottom: -1, height: 2, borderRadius: 1, backgroundColor: c.text },
  badge: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: c.primary + '33', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { color: c.primary, fontFamily: fonts.mono, fontSize: 10 },
}));

export function Card({ children, style, onPress, testID }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; testID?: string }) {
  const c = useColors();
  const base: ViewStyle = { backgroundColor: c.surface, borderRadius: 18, padding: 16 };
  if (!onPress) return <View style={[base, style]}>{children}</View>;
  return (
    <Tap testID={testID} accessibilityRole="button" onPress={onPress} scaleTo={0.98} style={[base, style]}>
      {children}
    </Tap>
  );
}

/** Empty state: the logo path let loose, the mint dot waiting off to the side. */
export function Empty({ title, body, action, art = true }: { title: string; body?: string; action?: ReactNode; art?: boolean }) {
  const c = useColors();
  return (
    <View style={{ alignItems: 'center', paddingHorizontal: 32, paddingVertical: 40, gap: 10 }}>
      {art ? (
        <View style={{ marginBottom: 6 }}>
          <UnwoundLine color={c.border} dot={c.accent} />
        </View>
      ) : null}
      <Text style={[type.display24, { color: c.text, textAlign: 'center' }]}>{title}</Text>
      {body ? <Text style={[type.small, { color: c.textMuted, textAlign: 'center', maxWidth: 280 }]}>{body}</Text> : null}
      {action ? <View style={{ marginTop: 8 }}>{action}</View> : null}
    </View>
  );
}

/** Loading state: "Winding up…" with the mint dot breathing. */
export function WindingUp() {
  const c = useColors();
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    if (reduced) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 600, useNativeDriver: NATIVE_DRIVER }),
        Animated.timing(v, { toValue: 0.35, duration: 600, useNativeDriver: NATIVE_DRIVER }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, v]);
  return (
    <View style={{ alignItems: 'center', paddingVertical: 64, gap: 14 }} accessibilityLabel="Winding up">
      <Animated.View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: c.accent, opacity: reduced ? 1 : v }} />
      <Text style={[type.display24, { color: c.textMuted }]}>Winding up…</Text>
    </View>
  );
}

export function MockNote({ text = 'Mock currency only. No real money.' }: { text?: string }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
      <Alert color={c.warning} size={15} />
      <Text style={[type.micro, { color: c.warning, flex: 1 }]}>{text}</Text>
    </View>
  );
}

/** Your drafter badge: your colour and two-letter tag, on your picks in the strip and board. */
export const MeBadge = memo(function MeBadge({ color, tag, size = 18 }: { color: string; tag: string; size?: number }) {
  const ink = readableInk(color);
  return (
    <View
      accessibilityLabel={`You, ${tag}`}
      style={{ minWidth: size, height: size, paddingHorizontal: 3, borderRadius: size * 0.3, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}
    >
      <Text allowFontScaling={false} style={{ fontFamily: fonts.display, fontSize: size * 0.62, lineHeight: size, color: ink, letterSpacing: 0.3 }}>
        {tag}
      </Text>
    </View>
  );
});

function readableInk(hex: string) {
  const n = parseInt(hex.replace('#', ''), 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.6 ? '#0B0B14' : '#FFFFFF';
}
