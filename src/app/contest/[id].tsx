import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Button, clockLabel, clockSpeed, Empty, formatMoney, MockNote, Screen } from '../../components/ui';
import { DEFAULT_LINEUP } from '../../engine';
import { contestById, MISSES_FOR_AUTOPILOT, useApp } from '../../store/useApp';
import { makeStyles, useColors } from '../../theme/useTheme';

export default function ContestDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useStyles();
  const c = useColors();
  const contest = contestById(String(id));
  const balance = useApp((st) => st.balance);
  const mine = useApp((st) => (contest ? st.entries[contest.id] ?? 0 : 0));
  const enterContest = useApp((st) => st.enterContest);
  const [error, setError] = useState<string | null>(null);
  // A double-tap fires onPress twice before navigation; only the first may enter (and charge).
  const entering = useRef(false);

  if (!contest) {
    return (
      <Screen>
        <Empty title="Contest not found" action={<Button label="Back to lobby" onPress={() => router.back()} />} />
      </Screen>
    );
  }

  const filled = Math.min(contest.maxEntries, contest.filled + mine);
  const canAfford = balance >= contest.entryFee;
  const atMax = mine >= contest.maxPerUser;
  const lineup = DEFAULT_LINEUP;

  const onEnter = () => {
    if (entering.current) return;
    const r = enterContest(contest.id);
    if (!r.ok) return setError(r.error);
    entering.current = true;
    setError(null);
    router.replace(`/draft/${r.draftId}`);
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={s.grabber} />
      <View style={s.topRow}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} style={s.close}>
          <Text style={s.closeText}>✕</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={s.body}>
        <Text style={s.kicker}>{clockSpeed(contest.pickClockSec).toUpperCase()} DRAFT · {clockLabel(contest.pickClockSec)} PICK CLOCK</Text>
        <Text style={s.title}>{contest.name}</Text>
        <View style={s.hero}>
          <View>
            <Text style={s.label}>Prize pool</Text>
            <Text style={s.prize}>{formatMoney(contest.prizePool)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.label}>Entry</Text>
            <Text style={s.fee}>{formatMoney(contest.entryFee)}</Text>
          </View>
        </View>
        <View style={s.grid}>
          <Info label="Teams per draft" value={`${contest.teams}`} />
          <Info label="Rounds" value={`${contest.rounds}`} />
          <Info label="Entries" value={`${filled.toLocaleString()} / ${contest.maxEntries.toLocaleString()}`} />
          <Info label="Your entries" value={`${mine} / ${contest.maxPerUser}`} />
        </View>
        <View style={s.section}>
          <Text style={s.sectionTitle}>How it works</Text>
          <Text style={s.p}>
            Draft once, no lineups to set. Every week your highest-scoring legal lineup counts automatically:{' '}
            {lineup.QB} QB · {lineup.RB} RB · {lineup.WR} WR · {lineup.TE} TE · {lineup.FLEX} FLEX (RB/WR/TE). Half-PPR scoring.
          </Text>
          <Text style={s.p}>
            Miss your pick and we draft from your queue (then best available by ADP). Miss {MISSES_FOR_AUTOPILOT} in a row and autopilot takes over until you turn it off.
          </Text>
        </View>
        <MockNote text="Mock currency – no real money. Entry fees and prizes are simulated." />
      </ScrollView>
      <View style={s.footer}>
        {error ? <Text style={{ color: c.danger, fontWeight: '700', marginBottom: 8 }}>{error}</Text> : null}
        <View style={s.balanceRow}>
          <Text style={s.label}>Mock balance</Text>
          <Text style={[s.label, { color: canAfford ? c.text : c.danger }]}>{formatMoney(balance)}</Text>
        </View>
        <Button
          testID="enter-contest"
          label={atMax ? 'Max entries reached' : canAfford ? `Enter · ${formatMoney(contest.entryFee)}` : 'Insufficient mock balance'}
          onPress={onEnter}
          disabled={atMax || !canAfford}
        />
      </View>
    </Screen>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  const s = useStyles();
  return (
    <View style={s.info}>
      <Text style={s.label}>{label}</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: c.border, marginTop: 8 },
  topRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 8 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: c.textMuted, fontSize: 20, fontWeight: '700' },
  body: { padding: 16, paddingTop: 0, gap: 16 },
  kicker: { color: c.accent, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  title: { color: c.text, fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  hero: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: c.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: c.border },
  label: { color: c.textMuted, fontSize: 12, fontWeight: '600' },
  prize: { color: c.accent, fontSize: 30, fontWeight: '900' },
  fee: { color: c.text, fontSize: 24, fontWeight: '800' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  info: { width: '48%', flexGrow: 1, backgroundColor: c.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: c.border },
  infoValue: { color: c.text, fontSize: 17, fontWeight: '800', marginTop: 2 },
  section: { gap: 8 },
  sectionTitle: { color: c.text, fontSize: 16, fontWeight: '800' },
  p: { color: c.textMuted, fontSize: 14, lineHeight: 20 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.bg },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
}));
