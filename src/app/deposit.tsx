import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Close } from '../components/icons';
import { Button, formatMoney, MockNote, Screen, Tap } from '../components/ui';
import { DEPOSIT_PRESETS, depositBonus, FIRST_DEPOSIT_MATCH_CAP } from '../data/promos';
import { feel } from '../lib/feel';
import { useApp } from '../store/useApp';
import { fonts, type } from '../theme/type';
import { makeStyles, useColors } from '../theme/useTheme';

/** Mock deposit sheet. No payment code lives here: it only moves the mock balance. */
export default function Deposit() {
  const s = useStyles();
  const c = useColors();
  const params = useLocalSearchParams<{ amount?: string }>();
  const balance = useApp((st) => st.balance);
  const matchUsed = useApp((st) => st.matchUsed);
  const deposit = useApp((st) => st.deposit);
  const preset = Number(params.amount);
  const [amount, setAmount] = useState(DEPOSIT_PRESETS.includes(preset) ? preset : 50);
  const bonus = depositBonus(amount, matchUsed);

  const onAdd = () => {
    deposit(amount);
    feel.entered();
    router.back();
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={s.grabber} />
      <View style={s.topRow}>
        <Tap accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} style={s.close}>
          <Close color={c.textMuted} size={22} />
        </Tap>
      </View>
      <View style={s.body}>
        <View style={{ gap: 4 }}>
          <Text style={s.title}>Add mock funds</Text>
          <Text style={s.meta}>Balance {formatMoney(balance)}</Text>
        </View>

        <View style={s.grid} accessibilityRole="radiogroup">
          {DEPOSIT_PRESETS.map((a) => {
            const on = a === amount;
            return (
              <Tap
                key={a}
                testID={`deposit-${a}`}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() => {
                  if (!on) feel.select();
                  setAmount(a);
                }}
                style={[s.preset, on && { borderColor: c.text, backgroundColor: c.surfaceAlt }]}
              >
                <Text style={[s.presetText, { color: on ? c.text : c.textMuted }]}>{formatMoney(a)}</Text>
              </Tap>
            );
          })}
        </View>

        <View style={s.lines}>
          <Line label="You add" value={formatMoney(amount)} />
          {matchUsed ? null : (
            <Line label={`First deposit match (up to ${formatMoney(FIRST_DEPOSIT_MATCH_CAP)})`} value={`+${formatMoney(bonus)}`} tint={c.primary} />
          )}
          <Line label="New balance" value={formatMoney(balance + amount + bonus)} strong />
        </View>
        <MockNote text="Mock funds for testing only. No card is charged. They have no cash value and cannot be withdrawn." />
      </View>
      <View style={s.footer}>
        <Button testID="deposit-confirm" label={`Add ${formatMoney(amount)} (mock)`} onPress={onAdd} />
      </View>
    </Screen>
  );
}

function Line({ label, value, tint, strong }: { label: string; value: string; tint?: string; strong?: boolean }) {
  const s = useStyles();
  const c = useColors();
  return (
    <View style={s.line}>
      <Text style={[s.lineLabel, strong && { color: c.text }]}>{label}</Text>
      <Text style={[s.lineValue, { color: tint ?? c.text }, strong && { fontSize: 17 }]}>{value}</Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: c.border, marginTop: 8 },
  topRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 8 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, padding: 20, paddingTop: 0, gap: 22 },
  title: { ...type.display40, color: c.text },
  meta: { ...type.small, color: c.textMuted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  preset: { minWidth: 96, flexGrow: 1, height: 56, borderRadius: 14, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
  presetText: { fontFamily: fonts.display, fontSize: 24 },
  lines: { borderTopWidth: 1, borderTopColor: c.border },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 44, borderBottomWidth: 1, borderBottomColor: c.border, gap: 12 },
  lineLabel: { ...type.small, color: c.textMuted, flex: 1 },
  lineValue: { fontFamily: fonts.mono, fontSize: 14 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: c.border },
}));
