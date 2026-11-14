import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Check, ChevronRight } from '../../components/icons';
import { Button, formatMoney, MockNote, Screen, Tap } from '../../components/ui';
import { SEASON_WEEKS } from '../../data';
import { useApp } from '../../store/useApp';
import { ACTIVE_BRAND, BRANDS } from '../../theme/brands';
import { fonts, type } from '../../theme/type';
import { makeStyles, useColors, useTheme, type BrandKey } from '../../theme/useTheme';

const AMOUNTS = [25, 100, 500];

export default function Account() {
  const s = useStyles();
  const c = useColors();
  const brand = useTheme();
  const balance = useApp((st) => st.balance);
  const addFunds = useApp((st) => st.addFunds);
  const override = useApp((st) => st.brandOverride);
  const setBrandOverride = useApp((st) => st.setBrandOverride);
  const haptics = useApp((st) => st.haptics);
  const setHaptics = useApp((st) => st.setHaptics);
  const resetAll = useApp((st) => st.resetAll);
  const drafts = useApp((st) => st.drafts);
  const week = useApp((st) => st.currentWeek);
  const setWeek = useApp((st) => st.setWeek);
  const [lab, setLab] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const stats = useMemo(() => {
    const all = Object.values(drafts);
    return {
      total: all.length,
      done: all.filter((d) => d.state.status === 'complete').length,
      spent: all.reduce((n, d) => n + d.entryFee, 0),
    };
  }, [drafts]);
  const activeKey = (override && override in BRANDS ? override : ACTIVE_BRAND) as BrandKey;

  return (
    <Screen>
      <ScrollView contentContainerStyle={s.body}>
        <Text style={s.title}>You</Text>

        <View style={{ gap: 10 }}>
          <View>
            <Text style={s.balance}>{formatMoney(balance)}</Text>
            <Text style={s.label}>Mock balance</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {AMOUNTS.map((a) => (
              <Button key={a} small variant="secondary" label={`Add ${formatMoney(a)}`} onPress={() => addFunds(a)} style={{ flex: 1 }} />
            ))}
          </View>
          <MockNote text="Mock funds for testing only. They have no cash value and cannot be withdrawn." />
        </View>

        <View style={s.list}>
          <Row label="Drafts" value={`${stats.total}`} />
          <Row label="Finished" value={`${stats.done}`} />
          <Row label="Mock fees" value={formatMoney(stats.spent)} />
        </View>

        <View style={s.list}>
          <Tap accessibilityRole="button" onPress={() => router.push('/rankings')} style={s.row} testID="rankings-row" scaleTo={0.99}>
            <View style={{ flex: 1 }}>
              <Text style={s.rowLabel}>Rankings</Text>
              <Text style={s.hint}>Your order for autopick, per draft type.</Text>
            </View>
            <ChevronRight color={c.textMuted} size={18} />
          </Tap>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: haptics }}
            accessibilityLabel="Haptics"
            onPress={() => setHaptics(!haptics)}
            style={s.row}
            testID="haptics-toggle"
          >
            <View style={{ flex: 1 }}>
              <Text style={s.rowLabel}>Haptics</Text>
              <Text style={s.hint}>A knock when you're up, a snap when your pick lands.</Text>
            </View>
            <View style={[s.track, { backgroundColor: haptics ? c.accent : c.border }]}>
              <View style={[s.knob, { alignSelf: haptics ? 'flex-end' : 'flex-start', backgroundColor: haptics ? c.bg : c.text }]} />
            </View>
          </Pressable>
          <Tap accessibilityRole="button" accessibilityState={{ expanded: lab }} onPress={() => setLab(!lab)} style={s.row} testID="lab-row" scaleTo={0.99}>
            <Text style={[s.rowLabel, { flex: 1 }]}>Lab</Text>
            <Text style={s.rowValue}>{BRANDS[activeKey].name}</Text>
            <View style={{ transform: [{ rotate: lab ? '90deg' : '0deg' }] }}>
              <ChevronRight color={c.textMuted} size={18} />
            </View>
          </Tap>
          {lab ? (
            <View style={{ gap: 8, paddingVertical: 12 }}>
              <View style={s.weekRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.rowLabel}>Season week (mock)</Text>
                  <Text style={s.hint}>{week === 0 ? 'Preseason.' : week >= SEASON_WEEKS ? 'Season over. Results are final.' : `Live standings run through week ${week}.`}</Text>
                </View>
                <Button small variant="secondary" label="Back" disabled={week <= 0} onPress={() => setWeek(week - 1)} testID="week-back" />
                <Text style={s.weekValue} testID="week-value">{week}</Text>
                <Button small variant="secondary" label="Advance" disabled={week >= SEASON_WEEKS} onPress={() => setWeek(week + 1)} testID="week-advance" />
              </View>
              <Text style={s.hint}>Theme preview, for the team. Only changes this device.</Text>
              {(Object.keys(BRANDS) as BrandKey[]).map((k) => {
                const b = BRANDS[k];
                const active = k === activeKey;
                return (
                  <Pressable
                    key={k}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active }}
                    accessibilityLabel={`${b.name} theme`}
                    onPress={() => setBrandOverride(k === ACTIVE_BRAND ? null : k)}
                    style={[s.brandRow, { backgroundColor: b.colors.bg, borderColor: active ? b.colors.text : c.border }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: b.colors.text, fontFamily: fonts.strong, fontSize: 15 }}>{b.name}</Text>
                      <Text style={{ color: b.colors.textMuted, fontFamily: fonts.body, fontSize: 12 }}>{b.tagline}</Text>
                    </View>
                    <View style={{ width: 28, height: 6, borderRadius: 3, backgroundColor: b.colors.primary }} />
                    <View style={{ width: 28, height: 6, borderRadius: 3, backgroundColor: b.colors.accent }} />
                    {active ? <Check color={b.colors.text} size={18} /> : <View style={{ width: 18 }} />}
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>

        {confirm ? (
          <View style={s.confirm}>
            <Text style={s.confirmText}>
              Wipe {stats.total} {stats.total === 1 ? 'draft' : 'drafts'} and reset your {formatMoney(balance)} mock balance? Can't undo.
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button small variant="secondary" label="Keep everything" onPress={() => setConfirm(false)} style={{ flex: 1 }} />
              <Button
                small
                variant="danger"
                label="Wipe it"
                testID="confirm-reset"
                onPress={() => {
                  resetAll();
                  setConfirm(false);
                }}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        ) : (
          <Button variant="ghost" label="Start over" onPress={() => setConfirm(true)} testID="start-over" />
        )}

        <Text style={s.legal}>
          Not available where prohibited. Mock currency only. {brand.name} is a demo product for simulation and entertainment; no real-money
          contests are offered. Terms · Privacy · Responsible play (placeholders).
        </Text>
      </ScrollView>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const s = useStyles();
  return (
    <View style={s.row}>
      <Text style={[s.rowLabel, { flex: 1 }]}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  body: { padding: 16, gap: 26, paddingBottom: 40 },
  title: { ...type.display40, color: c.text },
  label: { ...type.small, color: c.textMuted },
  balance: { fontFamily: fonts.displayHeavy, fontSize: 56, lineHeight: 58, color: c.text },
  list: { borderTopWidth: 1, borderTopColor: c.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.border },
  rowLabel: { ...type.body, color: c.text },
  rowValue: { fontFamily: fonts.mono, fontSize: 14, color: c.textMuted },
  hint: { ...type.small, color: c.textMuted },
  track: { width: 44, height: 26, borderRadius: 13, padding: 3, justifyContent: 'center' },
  knob: { width: 20, height: 20, borderRadius: 10 },
  weekRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 8 },
  weekValue: { fontFamily: fonts.display, fontSize: 26, lineHeight: 28, color: c.text, minWidth: 30, textAlign: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderRadius: 14, borderWidth: 1, minHeight: 60 },
  confirm: { gap: 12, padding: 16, borderRadius: 18, backgroundColor: c.surface },
  confirmText: { ...type.bodyStrong, color: c.text },
  legal: { ...type.micro, color: c.textMuted, lineHeight: 16, textAlign: 'center' },
}));
