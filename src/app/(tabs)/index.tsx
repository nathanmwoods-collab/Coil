import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Image, Text, View } from 'react-native';

import { ContestCard } from '../../components/ContestCard';
import { PromoRail } from '../../components/PromoRail';
import { Button, Chip, clockLabel, clockSpeed, formatMoney, Screen, Tap } from '../../components/ui';
import { CONTESTS, contestsFor, DEFAULT_SPORT, SPORTS, type SportInfo } from '../../data';
import type { Contest } from '../../engine';
import { useApp } from '../../store/useApp';
import { BRANDS } from '../../theme/brands';
import { fonts, type } from '../../theme/type';
import { makeStyles, useColors, useTheme } from '../../theme/useTheme';

type Filter = 'All' | 'Fast' | 'Slow';

/** Chip labels say what drafters actually filter on: the pick clock. */
const CLOCK_FOR: Record<'Fast' | 'Slow', string> = (() => {
  const of = (sp: 'Fast' | 'Slow') => CONTESTS.find((c) => clockSpeed(c.pickClockSec) === sp)?.pickClockSec;
  const f = of('Fast');
  const sl = of('Slow');
  return { Fast: f ? `${clockLabel(f)} picks` : 'Fast', Slow: sl ? `${clockLabel(sl)} picks` : 'Slow' };
})();

export default function Lobby() {
  const s = useStyles();
  const c = useColors();
  const brand = useTheme();
  const balance = useApp((st) => st.balance);
  const entries = useApp((st) => st.entries);
  const matchUsed = useApp((st) => st.matchUsed);
  const [filter, setFilter] = useState<Filter>('All');
  // Only live sports can be selected; a "soon" chip explains itself instead.
  const [sport] = useState(DEFAULT_SPORT);
  const [soon, setSoon] = useState<SportInfo | null>(null);

  const { featured, rest } = useMemo(() => {
    const sorted = [...contestsFor(sport)].sort((a, b) => b.prizePool - a.prizePool);
    const flagship = sorted.find((x) => x.tag === 'flagship') ?? sorted[0];
    const others = sorted.filter((x) => x !== flagship && (filter === 'All' || clockSpeed(x.pickClockSec) === filter));
    return { featured: flagship, rest: others };
  }, [filter, sport]);

  const open = useCallback((id: string) => router.push(`/contest/${id}`), []);

  const renderItem = useCallback(
    ({ item }: { item: Contest }) => <ContestCard contest={item} myEntries={entries[item.id] ?? 0} onPress={() => open(item.id)} />,
    [entries, open],
  );

  const isCoil = brand.name === BRANDS.coil.name;

  return (
    <Screen>
      <View style={s.header}>
        <View style={s.brandRow} accessibilityRole="header" accessibilityLabel={brand.name}>
          {isCoil ? <Image source={require('../../../assets/logo-mark.png')} style={s.logo} accessibilityIgnoresInvertColors /> : null}
          <Text style={s.brand}>{isCoil ? 'coil' : brand.name}</Text>
          {isCoil ? <View style={[s.dot, { backgroundColor: c.accent }]} /> : null}
        </View>
        <View style={s.money}>
          <View style={s.balance} accessibilityLabel={`Mock balance ${formatMoney(balance)}`}>
            <Text style={s.balanceValue} testID="lobby-balance">{formatMoney(balance)}</Text>
            <Text style={s.balanceLabel}>mock balance</Text>
          </View>
          <Button small testID="lobby-deposit" label="Deposit" onPress={() => router.push('/deposit')} />
        </View>
      </View>
      <FlatList
        data={rest}
        keyExtractor={(x) => x.id}
        renderItem={renderItem}
        contentContainerStyle={s.list}
        ItemSeparatorComponent={Sep}
        ListHeaderComponent={
          <View style={{ gap: 18, marginBottom: 12 }}>
            <Text style={s.tagline}>{brand.tagline}</Text>
            <View style={{ gap: 8 }}>
              <View style={s.sports} accessibilityRole="tablist">
                {SPORTS.map((sp) =>
                  sp.status === 'live' ? (
                    <Chip key={sp.key} label={sp.label} active={sp.key === sport} onPress={() => setSoon(null)} />
                  ) : (
                    <Tap
                      key={sp.key}
                      testID={`sport-${sp.key}`}
                      accessibilityRole="button"
                      accessibilityLabel={`${sp.label}, coming soon`}
                      accessibilityState={{ expanded: soon?.key === sp.key }}
                      onPress={() => setSoon(soon?.key === sp.key ? null : sp)}
                      style={[s.soonChip, soon?.key === sp.key && { borderColor: c.textMuted }]}
                    >
                      <Text style={s.soonLabel}>{sp.label}</Text>
                      <Text style={s.soonTag}>soon</Text>
                    </Tap>
                  ),
                )}
              </View>
              {soon ? (
                <Text style={s.soonNote} testID="sport-soon-note" accessibilityLiveRegion="polite">
                  {soon.soonNote}
                </Text>
              ) : null}
            </View>
            <PromoRail hide={matchUsed ? ['first-draft-match'] : undefined} />
            {featured ? (
              <ContestCard contest={featured} featured myEntries={entries[featured.id] ?? 0} onPress={() => open(featured.id)} />
            ) : null}
            <View style={s.sectionRow}>
              <Text style={s.section}>Pick a pod</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {(['All', 'Fast', 'Slow'] as Filter[]).map((f) => (
                  <Chip key={f} label={f === 'All' ? 'All' : CLOCK_FOR[f]} active={filter === f} onPress={() => setFilter(f)} />
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

const Sep = () => <View style={{ height: 10 }} />;

const useStyles = makeStyles((c) => ({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 },
  brandRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  logo: { width: 30, height: 30, marginBottom: 3 },
  brand: { fontFamily: fonts.displayHeavy, fontSize: 36, lineHeight: 38, color: c.text, letterSpacing: 0.3 },
  dot: { width: 7, height: 7, borderRadius: 4, marginBottom: 9, marginLeft: -2 },
  tagline: { ...type.small, color: c.textMuted, marginTop: -6 },
  balance: { alignItems: 'flex-end' },
  balanceLabel: { ...type.micro, color: c.warning },
  balanceValue: { fontFamily: fonts.display, fontSize: 26, lineHeight: 28, color: c.text },
  money: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sports: { flexDirection: 'row', gap: 6 },
  soonChip: { minHeight: 34, paddingHorizontal: 13, borderRadius: 17, borderWidth: 1, borderColor: c.border, borderStyle: 'dashed', flexDirection: 'row', alignItems: 'center', gap: 6 },
  soonLabel: { fontFamily: fonts.strong, fontSize: 13, color: c.textMuted },
  soonTag: { ...type.micro, fontSize: 10, color: c.textMuted },
  soonNote: { ...type.small, color: c.textMuted },
  list: { padding: 16, paddingTop: 8, paddingBottom: 32 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  section: { ...type.display24, color: c.text },
  footer: { ...type.micro, color: c.textMuted, textAlign: 'center', marginTop: 24 },
}));
