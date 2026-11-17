import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Check, Close } from '../../components/icons';
import { SnakeFill } from '../../components/SnakeFill';
import { SpringGlyph } from '../../components/SpringGauge';
import { Button, clockLabel, Empty, formatCents, formatMoney, MockNote, Screen, Tap } from '../../components/ui';
import { isSitAndGo } from '../../data';
import { clampEntries, DEFAULT_LINEUP, entryLimit, gaugeFor, planEntries, rakeFor, slateInfo, slateOf } from '../../engine';
import { feel } from '../../lib/feel';
import { contestById, MISSES_FOR_AUTOPILOT, spendable, useApp } from '../../store/useApp';
import { fonts, type } from '../../theme/type';
import { makeStyles, useColors } from '../../theme/useTheme';

export default function ContestDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useStyles();
  const c = useColors();
  const contest = contestById(String(id));
  const balance = useApp((st) => st.balance);
  const credit = useApp((st) => st.sbCredit);
  const useCreditFirst = useApp((st) => st.useCreditFirst);
  const setUseCreditFirst = useApp((st) => st.setUseCreditFirst);
  const seasonRake = useApp((st) => st.seasonRake);
  const mine = useApp((st) => (contest ? st.entries[contest.id] ?? 0 : 0));
  const enterContest = useApp((st) => st.enterContest);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(1);
  const [mode, setMode] = useState<'self' | 'auto'>('self');
  // A double-tap fires onPress twice before navigation; only the first may enter (and charge).
  const entering = useRef(false);

  if (!contest) {
    return (
      <Screen>
        <Empty title="That contest's gone." action={<Button label="Back to the lobby" onPress={() => router.replace('/')} />} />
      </Screen>
    );
  }

  const filled = Math.min(contest.maxEntries, contest.filled + mine);
  const funds = spendable({ balance, sbCredit: credit, useCreditFirst });
  const limit = entryLimit(contest, mine, funds);
  const atMax = limit.perUserLeft < 1;
  const full = limit.seatsLeft < 1;
  const n = clampEntries(count, limit);
  // Same pricing the store uses: credit first (if on), and only the cash part earns Springback.
  const plan = planEntries({ entryFee: contest.entryFee, rakePct: contest.rakePct, count: n, seasonRake, credit, useCredit: useCreditFirst });
  const total = plan.total;
  const canAfford = funds >= total;
  const short = Math.round((total - funds) * 100) / 100;
  const rakeEach = rakeFor(contest.entryFee, contest.rakePct);
  const entryWord = n === 1 ? 'This entry' : `These ${n} entries`;
  const springLine =
    plan.springback > 0
      ? `${entryWord} ${n === 1 ? 'springs' : 'spring'} back ${formatCents(plan.springback)} on Wednesday`
      : `${entryWord} ${n === 1 ? 'is' : 'are'} paid with Springback credit, so ${n === 1 ? 'it earns' : 'they earn'} no Springback`;
  const lineup = DEFAULT_LINEUP;
  const sitGo = isSitAndGo(contest);
  const multi = contest.maxPerUser > 1;
  const listName = slateInfo(slateOf(contest)).label;

  const onEnter = () => {
    if (entering.current) return;
    const r = enterContest(contest.id, { count: n, autodraft: mode === 'auto' });
    if (!r.ok) {
      feel.pickRejected();
      return setError(r.error);
    }
    entering.current = true;
    feel.entered();
    setError(null);
    // One hand-drafted entry goes straight to the room. Anything else lands on the Drafts tab.
    if (mode === 'self' && r.draftIds.length === 1) router.replace(`/draft/${r.draftId}`);
    else if (router.canGoBack()) {
      router.back();
      router.navigate('/drafts');
    } else router.replace('/drafts');
  };

  const cta = atMax
    ? `All ${contest.maxPerUser} of your entries are in`
    : full
      ? 'This one is full'
      : mode === 'auto'
        ? `Autodraft ${n === 1 ? '' : `${n} `}for ${formatMoney(total)}`
        : n === 1
          ? `Draft for ${formatMoney(total)}`
          : `Enter ${n} for ${formatMoney(total)}`;

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
            {clockLabel(contest.pickClockSec)} picks · {contest.rounds} rounds
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

        <View style={{ gap: 6 }} testID="contest-seats">
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={s.label}>Seats gone</Text>
            <Text style={s.seatsNum}>
              {filled.toLocaleString()} of {contest.maxEntries.toLocaleString()}
            </Text>
          </View>
          <SnakeFill value={filled / contest.maxEntries} color={c.accent} track={c.border} height={18} amp={4} />
        </View>

        <View style={s.facts}>
          <Fact label="Your entries" value={`${mine} of ${contest.maxPerUser}`} highlight={mine > 0} />
          <Fact label="Coil's rake" value={`${contest.rakePct}% · ${formatCents(rakeEach)} of each ${formatMoney(contest.entryFee)}`} testID="contest-rake" />
        </View>

        {atMax || full ? null : (
          <View style={s.section}>
            {multi ? (
              <View style={s.stepRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.sectionTitle}>Entries</Text>
                  <Text style={s.stepHint}>
                    {limit.max <= n
                      ? limit.boundBy === 'balance'
                        ? `Your balance covers ${limit.max}.`
                        : limit.boundBy === 'seats'
                          ? `Only ${limit.seatsLeft} seats left.`
                          : `${limit.perUserLeft} of ${contest.maxPerUser} left for you.`
                      : `Up to ${limit.max} right now.`}
                  </Text>
                </View>
                <View style={s.stepper}>
                  <Tap
                    accessibilityRole="button"
                    accessibilityLabel="One fewer entry"
                    disabled={n <= 1}
                    onPress={() => setCount(n - 1)}
                    style={s.stepBtn}
                    testID="entries-minus"
                  >
                    <Text style={[s.stepSign, n <= 1 && { color: c.border }]}>−</Text>
                  </Tap>
                  <Text style={s.stepValue} testID="entries-count" accessibilityLabel={`${n} entries`}>
                    {n}
                  </Text>
                  <Tap
                    accessibilityRole="button"
                    accessibilityLabel="One more entry"
                    disabled={n >= limit.max}
                    onPress={() => setCount(n + 1)}
                    style={s.stepBtn}
                    testID="entries-plus"
                  >
                    <Text style={[s.stepSign, n >= limit.max && { color: c.border }]}>+</Text>
                  </Tap>
                </View>
              </View>
            ) : null}
            <View accessibilityRole="radiogroup" style={s.modes}>
              <Mode
                on={mode === 'self'}
                label={n === 1 ? 'Draft it myself' : 'Draft them myself'}
                hint={n === 1 ? 'Straight to the room.' : `${n} rooms, ${n} clocks. They're all in Drafts.`}
                onPress={() => setMode('self')}
                testID="mode-self"
              />
              <Mode
                on={mode === 'auto'}
                label="Autodraft from my rankings"
                hint={`Your ${listName} list drafts for you. Over in seconds, no take-backs.`}
                onPress={() => setMode('auto')}
                testID="mode-auto"
              />
            </View>
          </View>
        )}

        <View style={s.section}>
          <Text style={s.sectionTitle}>Draft once. That's the whole job.</Text>
          <Text style={s.p}>
            No lineups to set. Every week your best legal lineup counts on its own: {lineup.QB} QB, {lineup.RB} RB, {lineup.WR} WR,{' '}
            {lineup.TE} TE and {lineup.FLEX} flex (RB/WR/TE). Half-PPR.
          </Text>
          <Text style={s.p}>
            Miss a pick and autopick goes to your queue first, then your rankings, then best ADP. Miss {MISSES_FOR_AUTOPILOT} in a row and autopilot drafts for you
            until you take it back.
          </Text>
        </View>
        <MockNote text="Mock currency. No real money. Entry fees and prizes are simulated." />
      </ScrollView>
      <View style={s.footer}>
        {error ? <Text style={s.error}>{error}</Text> : null}
        {atMax || full ? null : (
          <Tap
            accessibilityRole="button"
            accessibilityLabel={`${springLine}. Mock. ${gaugeFor(seasonRake).name} gauge. Open Springback.`}
            onPress={() => router.push('/springback')}
            scaleTo={0.99}
            style={s.spring}
            testID="contest-springback"
          >
            <SpringGlyph color={c.primary} size={18} />
            <Text style={s.springText}>
              {springLine}
              <Text style={s.springMock}> (mock)</Text>
            </Text>
          </Tap>
        )}
        {credit > 0 && !atMax && !full ? (
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: useCreditFirst }}
            accessibilityLabel={`Use Springback credit, ${formatCents(credit)}`}
            onPress={() => setUseCreditFirst(!useCreditFirst)}
            style={s.creditRow}
            testID="contest-credit-toggle"
          >
            <Text style={[s.label, { flex: 1 }]} testID="contest-credit">
              {useCreditFirst && plan.fromCredit > 0
                ? `${formatCents(plan.fromCredit)} Springback credit goes first, ${formatCents(plan.fromCash)} from cash`
                : `${formatCents(credit)} Springback credit, not used`}
            </Text>
            <View style={[s.track, { backgroundColor: useCreditFirst ? c.accent : c.border }]}>
              <View style={[s.knob, { alignSelf: useCreditFirst ? 'flex-end' : 'flex-start', backgroundColor: useCreditFirst ? c.bg : c.text }]} />
            </View>
          </Pressable>
        ) : null}
        <View style={s.balanceRow}>
          <Text style={s.label}>
            {n > 1 ? `${n} × ${formatMoney(contest.entryFee)} · ` : ''}Mock balance
          </Text>
          <Text style={[s.balance, { color: canAfford ? c.text : c.danger }]}>{formatMoney(balance)}</Text>
        </View>
        {!atMax && !full && !canAfford ? (
          <>
            <Text style={s.short}>You're {formatMoney(short)} short (mock).</Text>
            <Button testID="contest-deposit" label="Add funds" onPress={() => router.push('/deposit')} />
          </>
        ) : (
          <Button testID="enter-contest" label={cta} onPress={onEnter} disabled={atMax || full} />
        )}
      </View>
    </Screen>
  );
}

function Mode({ on, label, hint, onPress, testID }: { on: boolean; label: string; hint: string; onPress: () => void; testID: string }) {
  const s = useStyles();
  const c = useColors();
  return (
    <Tap
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      onPress={() => {
        if (!on) feel.select();
        onPress();
      }}
      scaleTo={0.99}
      style={[s.mode, on && { borderColor: c.text, backgroundColor: c.surface }]}
      testID={testID}
    >
      <View style={[s.radio, on && { borderColor: c.text }]}>{on ? <Check color={c.text} size={14} /> : null}</View>
      <View style={{ flex: 1 }}>
        <Text style={s.modeLabel}>{label}</Text>
        <Text style={s.stepHint}>{hint}</Text>
      </View>
    </Tap>
  );
}

function Fact({ label, value, highlight, testID }: { label: string; value: string; highlight?: boolean; testID?: string }) {
  const s = useStyles();
  const c = useColors();
  return (
    <View style={s.fact}>
      <Text style={s.factLabel}>{label}</Text>
      <Text style={[s.factValue, highlight && { color: c.primary }]} testID={testID}>
        {value}
      </Text>
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
  seatsNum: { fontFamily: fonts.mono, fontSize: 12, color: c.text },
  prize: { fontFamily: fonts.displayHeavy, fontSize: 48, lineHeight: 50, color: c.text },
  fee: { fontFamily: fonts.display, fontSize: 32, lineHeight: 34, color: c.text },
  facts: { borderTopWidth: 1, borderTopColor: c.border },
  fact: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 44, borderBottomWidth: 1, borderBottomColor: c.border },
  factLabel: { ...type.small, color: c.textMuted },
  factValue: { fontFamily: fonts.mono, fontSize: 14, color: c.text },
  section: { gap: 10 },
  sectionTitle: { ...type.title, color: c.text },
  p: { ...type.body, color: c.textMuted, lineHeight: 22 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepHint: { ...type.small, color: c.textMuted },
  stepper: { flexDirection: 'row', alignItems: 'center', borderRadius: 24, borderWidth: 1, borderColor: c.border },
  stepBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  stepSign: { fontFamily: fonts.display, fontSize: 26, lineHeight: 28, color: c.text },
  stepValue: { fontFamily: fonts.display, fontSize: 28, lineHeight: 30, color: c.text, minWidth: 36, textAlign: 'center' },
  modes: { gap: 8 },
  mode: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, borderWidth: 1, borderColor: c.border },
  modeLabel: { ...type.bodyStrong, color: c.text },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
  short: { ...type.smallStrong, color: c.danger, marginBottom: 8 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.bg },
  error: { ...type.smallStrong, color: c.danger, marginBottom: 8 },
  spring: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 32, marginBottom: 8 },
  springText: { ...type.smallStrong, color: c.text, flex: 1 },
  springMock: { ...type.small, color: c.textMuted },
  creditRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 36, marginBottom: 6 },
  track: { width: 40, height: 24, borderRadius: 12, padding: 3, justifyContent: 'center' },
  knob: { width: 18, height: 18, borderRadius: 9 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  balance: { fontFamily: fonts.mono, fontSize: 13 },
}));
