import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Close } from '../../components/icons';
import { Button, clockLabel, Empty, formatMoney, MockNote, Screen, Tap } from '../../components/ui';
import { isSitAndGo } from '../../data';
import { DEFAULT_LINEUP } from '../../engine';
import { feel } from '../../lib/feel';
import { contestById, MISSES_FOR_AUTOPILOT, useApp } from '../../store/useApp';
import { fonts, type } from '../../theme/type';
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
        <Empty title="That contest's gone." action={<Button label="Back to the lobby" onPress={() => router.back()} />} />
      </Screen>
    );
  }

  const filled = Math.min(contest.maxEntries, contest.filled + mine);
  const canAfford = balance >= contest.entryFee;
  const atMax = mine >= contest.maxPerUser;
  const short = Math.round((contest.entryFee - balance) * 100) / 100;
  const lineup = DEFAULT_LINEUP;
  const sitGo = isSitAndGo(contest);

  const onEnter = () => {
    if (entering.current) return;
    const r = enterContest(contest.id);
    if (!r.ok) {
      feel.pickRejected();
      return setError(r.error);
    }
    entering.current = true;
    feel.entered();
    setError(null);
    router.replace(`/draft/${r.draftId}`);
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={s.grabber} />
      <View style={s.topRow}>
        <Tap accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} style={s.close}>
          <Close color={c.textMuted} size={22} />
        </Tap>
      </View>
      <ScrollView contentContainerStyle={s.body}>
        <View style={{ gap: 6 }}>
          <Text style={s.title}>{contest.name}</Text>
          <Text style={s.meta}>
            {clockLabel(contest.pickClockSec)} picks · {contest.teams}-team {sitGo ? 'sit & go' : 'pods'} · {contest.rounds} rounds
          </Text>
        </View>

        <View style={s.hero}>
          <View style={{ flex: 1 }}>
            <Text style={s.prize}>{formatMoney(contest.prizePool)}</Text>
            <Text style={s.label}>Prize pool (mock)</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.fee}>{formatMoney(contest.entryFee)}</Text>
            <Text style={s.label}>To draft</Text>
          </View>
        </View>

        <View style={s.facts}>
          <Fact label="Seats taken" value={`${filled.toLocaleString()} of ${contest.maxEntries.toLocaleString()}`} />
          <Fact label="Your entries" value={`${mine} of ${contest.maxPerUser}`} highlight={mine > 0} />
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Draft once. That's the whole job.</Text>
          <Text style={s.p}>
            No lineups to set. Every week your best legal lineup counts on its own: {lineup.QB} QB, {lineup.RB} RB, {lineup.WR} WR,{' '}
            {lineup.TE} TE and {lineup.FLEX} flex (RB/WR/TE). Half-PPR.
          </Text>
          <Text style={s.p}>
            Miss a pick and autopick goes to your queue first, then best ADP. Miss {MISSES_FOR_AUTOPILOT} in a row and autopilot drafts for you
            until you take it back.
          </Text>
        </View>
        <MockNote text="Mock currency. No real money. Entry fees and prizes are simulated." />
      </ScrollView>
      <View style={s.footer}>
        {error ? <Text style={s.error}>{error}</Text> : null}
        <View style={s.balanceRow}>
          <Text style={s.label}>Mock balance</Text>
          <Text style={[s.balance, { color: canAfford ? c.text : c.danger }]}>{formatMoney(balance)}</Text>
        </View>
        <Button
          testID="enter-contest"
          label={
            atMax
              ? `All ${contest.maxPerUser} of your entries are in`
              : canAfford
                ? `Draft for ${formatMoney(contest.entryFee)}`
                : `You're ${formatMoney(short)} short (mock). Top up in You.`
          }
          onPress={onEnter}
          disabled={atMax || !canAfford}
        />
      </View>
    </Screen>
  );
}

function Fact({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  const s = useStyles();
  const c = useColors();
  return (
    <View style={s.fact}>
      <Text style={s.factLabel}>{label}</Text>
      <Text style={[s.factValue, highlight && { color: c.primary }]}>{value}</Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: c.border, marginTop: 8 },
  topRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 8 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 20, paddingTop: 0, gap: 24 },
  title: { ...type.display40, color: c.text },
  meta: { ...type.small, color: c.textMuted },
  hero: { flexDirection: 'row', alignItems: 'flex-end' },
  label: { ...type.micro, color: c.textMuted },
  prize: { fontFamily: fonts.displayHeavy, fontSize: 48, lineHeight: 50, color: c.text },
  fee: { fontFamily: fonts.display, fontSize: 32, lineHeight: 34, color: c.text },
  facts: { borderTopWidth: 1, borderTopColor: c.border },
  fact: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 44, borderBottomWidth: 1, borderBottomColor: c.border },
  factLabel: { ...type.small, color: c.textMuted },
  factValue: { fontFamily: fonts.mono, fontSize: 14, color: c.text },
  section: { gap: 10 },
  sectionTitle: { ...type.title, color: c.text },
  p: { ...type.body, color: c.textMuted, lineHeight: 22 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.bg },
  error: { ...type.smallStrong, color: c.danger, marginBottom: 8 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  balance: { fontFamily: fonts.mono, fontSize: 13 },
}));
