import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Image, Text, View } from 'react-native';

import { ContestCard } from '../../components/ContestCard';
import { Chip, clockSpeed, formatMoney, Screen } from '../../components/ui';
import { CONTESTS } from '../../data';
import type { Contest } from '../../engine';
import { useApp } from '../../store/useApp';
import { BRANDS } from '../../theme/brands';
import { makeStyles, useTheme } from '../../theme/useTheme';

type Filter = 'All' | 'Fast' | 'Slow';

export default function Lobby() {
  const s = useStyles();
  const brand = useTheme();
  const balance = useApp((st) => st.balance);
  const entries = useApp((st) => st.entries);
  const [filter, setFilter] = useState<Filter>('All');

  const { featured, rest } = useMemo(() => {
    const sorted = [...CONTESTS].sort((a, b) => b.prizePool - a.prizePool);
    const flagship = sorted.find((c) => c.tag === 'flagship') ?? sorted[0];
    const others = sorted.filter((c) => c !== flagship && (filter === 'All' || clockSpeed(c.pickClockSec) === filter));
    return { featured: flagship, rest: others };
  }, [filter]);

  const open = useCallback((id: string) => router.push(`/contest/${id}`), []);

  const renderItem = useCallback(
    ({ item }: { item: Contest }) => (
      <ContestCard contest={item} myEntries={entries[item.id] ?? 0} onPress={() => open(item.id)} />
    ),
    [entries, open],
  );

  return (
    <Screen>
      <View style={s.header}>
        <View>
          <View style={s.brandRow}>
            {brand.name === BRANDS.coil.name && (
              <Image source={require('../../../assets/logo-mark.png')} style={s.logo} accessibilityIgnoresInvertColors />
            )}
            <Text style={s.brand}>{brand.name}</Text>
          </View>
          <Text style={s.tagline}>{brand.tagline}</Text>
        </View>
        <View style={s.balance} accessibilityLabel={`Mock balance ${formatMoney(balance)}`}>
          <Text style={s.balanceLabel}>MOCK</Text>
          <Text style={s.balanceValue}>{formatMoney(balance)}</Text>
        </View>
      </View>
      <FlatList
        data={rest}
        keyExtractor={(c) => c.id}
        renderItem={renderItem}
        contentContainerStyle={s.list}
        ItemSeparatorComponent={Sep}
        ListHeaderComponent={
          <View style={{ gap: 14, marginBottom: 12 }}>
            {featured ? (
              <ContestCard contest={featured} featured myEntries={entries[featured.id] ?? 0} onPress={() => open(featured.id)} />
            ) : null}
            <View style={s.sectionRow}>
              <Text style={s.section}>Drafts</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {(['All', 'Fast', 'Slow'] as Filter[]).map((f) => (
                  <Chip key={f} label={f} active={filter === f} onPress={() => setFilter(f)} />
                ))}
              </View>
            </View>
          </View>
        }
        ListFooterComponent={<Text style={s.footer}>Mock currency only. Not available where prohibited.</Text>}
      />
    </Screen>
  );
}

const Sep = () => <View style={{ height: 12 }} />;

const useStyles = makeStyles((c) => ({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 30, height: 30 },
  brand: { color: c.text, fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  tagline: { color: c.textMuted, fontSize: 12, fontWeight: '600' },
  balance: { backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, alignItems: 'flex-end' },
  balanceLabel: { color: c.warning, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  balanceValue: { color: c.text, fontSize: 16, fontWeight: '800' },
  list: { padding: 16, paddingTop: 4, paddingBottom: 32 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  section: { color: c.text, fontSize: 17, fontWeight: '800' },
  footer: { color: c.textMuted, fontSize: 11, textAlign: 'center', marginTop: 24 },
}));
