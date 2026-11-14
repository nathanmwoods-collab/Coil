import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Button, Card, formatMoney, MockNote, Screen } from '../../components/ui';
import { ACTIVE_BRAND, BRANDS } from '../../theme/brands';
import { useApp } from '../../store/useApp';
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
  const resetAll = useApp((st) => st.resetAll);
  const drafts = useApp((st) => st.drafts);
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
        <View>
          <Text style={s.brand}>{brand.name}</Text>
          <Text style={s.tagline}>{brand.tagline}</Text>
        </View>

        <Card style={{ gap: 12 }}>
          <Text style={s.label}>Mock balance</Text>
          <Text style={s.balance}>{formatMoney(balance)}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {AMOUNTS.map((a) => (
              <Button key={a} small variant="secondary" label={`+ ${formatMoney(a)}`} onPress={() => addFunds(a)} style={{ flex: 1 }} />
            ))}
          </View>
          <MockNote text="Mock funds for testing only. They have no cash value and cannot be withdrawn." />
        </Card>

        <View style={s.stats}>
          <Stat label="Drafts" value={`${stats.total}`} />
          <Stat label="Completed" value={`${stats.done}`} />
          <Stat label="Mock fees" value={formatMoney(stats.spent)} />
        </View>

        <View style={{ gap: 10 }}>
          <Text style={s.section}>Brand options (preview)</Text>
          {(Object.keys(BRANDS) as BrandKey[]).map((k) => {
            const b = BRANDS[k];
            const active = k === activeKey;
            return (
              <Pressable
                key={k}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                onPress={() => setBrandOverride(k === ACTIVE_BRAND ? null : k)}
                style={[s.brandRow, { backgroundColor: b.colors.bg, borderColor: active ? b.colors.primary : c.border }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: b.colors.text, fontSize: 16, fontWeight: '900' }}>{b.name}</Text>
                  <Text style={{ color: b.colors.textMuted, fontSize: 12 }}>{b.tagline}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  {[b.colors.primary, b.colors.accent, b.colors.QB, b.colors.RB, b.colors.WR, b.colors.TE].map((col, i) => (
                    <View key={i} style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: col }} />
                  ))}
                </View>
                {active ? <Text style={{ color: b.colors.primary, fontWeight: '900', marginLeft: 8 }}>✓</Text> : null}
              </Pressable>
            );
          })}
          <Text style={s.fine}>Previews the theme on this device. The shipped brand is set in one line (ACTIVE_BRAND).</Text>
        </View>

        <Button variant="ghost" label="Reset mock account" onPress={resetAll} />

        <Text style={s.legal}>
          Not available where prohibited. Mock currency only. {brand.name} is a demo product for simulation and entertainment; no real-money
          contests are offered. Terms · Privacy · Responsible play (placeholders).
        </Text>
      </ScrollView>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const s = useStyles();
  return (
    <Card style={{ flex: 1, padding: 12 }}>
      <Text style={s.label}>{label}</Text>
      <Text style={s.statValue}>{value}</Text>
    </Card>
  );
}

const useStyles = makeStyles((c) => ({
  body: { padding: 16, gap: 18, paddingBottom: 40 },
  brand: { color: c.text, fontSize: 28, fontWeight: '900' },
  tagline: { color: c.textMuted, fontSize: 13 },
  label: { color: c.textMuted, fontSize: 12, fontWeight: '600' },
  balance: { color: c.text, fontSize: 34, fontWeight: '900' },
  stats: { flexDirection: 'row', gap: 8 },
  statValue: { color: c.text, fontSize: 18, fontWeight: '800', marginTop: 2 },
  section: { color: c.text, fontSize: 16, fontWeight: '800' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, borderWidth: 2, minHeight: 60 },
  fine: { color: c.textMuted, fontSize: 11 },
  legal: { color: c.textMuted, fontSize: 11, lineHeight: 16, textAlign: 'center' },
}));
