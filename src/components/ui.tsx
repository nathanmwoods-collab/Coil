import { memo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import type { Position } from '../engine';
import { makeStyles, useColors } from '../theme/useTheme';

export const HIT = 44;

export function formatMoney(n: number, opts: { compact?: boolean } = {}) {
  if (opts.compact && Math.abs(n) >= 1000) {
    if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
    return `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`;
  }
  const fixed = Number.isInteger(n) ? 0 : 2;
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: fixed, maximumFractionDigits: 2 })}`;
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

export const PosPill = memo(function PosPill({ pos, small }: { pos: Position; small?: boolean }) {
  const c = useColors();
  return (
    <View
      style={[
        pill.base,
        small && pill.small,
        { backgroundColor: c[pos] + '26', borderColor: c[pos] + '66' },
      ]}
    >
      <Text style={[pill.text, small && pill.textSmall, { color: c[pos] }]}>{pos}</Text>
    </View>
  );
});

const pill = StyleSheet.create({
  base: { minWidth: 34, paddingHorizontal: 6, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  small: { minWidth: 26, height: 18, paddingHorizontal: 4, borderRadius: 4 },
  text: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  textSmall: { fontSize: 9 },
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

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  style,
  small,
  testID,
}: {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
  testID?: string;
}) {
  const c = useColors();
  const bg =
    variant === 'primary' ? c.primary : variant === 'danger' ? c.danger : variant === 'secondary' ? c.surfaceAlt : 'transparent';
  const fg = variant === 'primary' ? c.primaryText : variant === 'danger' ? c.primaryText : c.text;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      onPress={disabled ? undefined : onPress}
      hitSlop={small ? 6 : 0}
      style={({ pressed }) => [
        {
          minHeight: small ? 36 : 50,
          paddingHorizontal: small ? 14 : 20,
          borderRadius: small ? 10 : 14,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: variant === 'ghost' ? 1 : 0,
          borderColor: c.border,
          opacity: disabled ? 0.4 : pressed ? 0.8 : 1,
          transform: [{ scale: pressed && !disabled ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      <Text style={{ color: fg, fontWeight: '800', fontSize: small ? 13 : 16 }}>{label}</Text>
    </Pressable>
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
  const tint = color ?? c.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 36,
        minWidth: 44,
        paddingHorizontal: 14,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: active ? tint + '2E' : c.surface,
        borderWidth: 1,
        borderColor: active ? tint : c.border,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Text style={{ color: active ? tint : c.textMuted, fontWeight: '700', fontSize: 13 }}>{label}</Text>
    </Pressable>
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
            onPress={() => onChange(o.key)}
            style={[s.item, active && s.itemActive]}
          >
            <Text style={[s.label, { color: active ? c.text : c.textMuted }]}>{o.label}</Text>
            {o.badge ? (
              <View style={s.badge}>
                <Text style={s.badgeText}>{o.badge}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const useSegStyles = makeStyles((c) => ({
  wrap: { flexDirection: 'row', backgroundColor: c.surface, borderRadius: 12, padding: 3, borderWidth: 1, borderColor: c.border },
  item: { flex: 1, minHeight: 40, borderRadius: 9, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5 },
  itemActive: { backgroundColor: c.surfaceAlt },
  label: { fontWeight: '700', fontSize: 13 },
  badge: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: c.primaryText, fontSize: 10, fontWeight: '800' },
}));

export function Card({ children, style, onPress, testID }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; testID?: string }) {
  const c = useColors();
  const base: ViewStyle = { backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.border, padding: 14 };
  if (!onPress) return <View style={[base, style]}>{children}</View>;
  return (
    <Pressable testID={testID} accessibilityRole="button" onPress={onPress} style={({ pressed }) => [base, style, pressed && { opacity: 0.85 }]}>
      {children}
    </Pressable>
  );
}

export function Empty({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  const c = useColors();
  return (
    <View style={{ alignItems: 'center', padding: 32, gap: 8 }}>
      <Text style={{ color: c.text, fontSize: 17, fontWeight: '800', textAlign: 'center' }}>{title}</Text>
      {body ? <Text style={{ color: c.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20 }}>{body}</Text> : null}
      {action}
    </View>
  );
}

export function MockNote({ text = 'Mock currency only — no real money.' }: { text?: string }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, backgroundColor: c.warning + '1A', borderWidth: 1, borderColor: c.warning + '55' }}>
      <Text style={{ color: c.warning, fontWeight: '900' }}>!</Text>
      <Text style={{ color: c.warning, fontSize: 12, fontWeight: '600', flex: 1 }}>{text}</Text>
    </View>
  );
}
