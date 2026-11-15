import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { ChevronLeft } from '../components/icons';
import { SpringGauge } from '../components/SpringGauge';
import { Button, formatCents, formatMoney, formatPct, MockNote, ProgressBar, Screen, Tap } from '../components/ui';
import { SPRINGBACK_GAUGES, SPRINGBACK_RULES } from '../data/springback';
import { TOURNAMENT_RAKE_PCT } from '../data/contests';
import { effectiveRatePct, gaugeFor, nextGauge, nextPayout, springLoad } from '../engine';
import { announce, feel } from '../lib/feel';
import { springbackPending, useApp, type SpringbackItem } from '../store/useApp';
import { fonts, type } from '../theme/type';
import { makeStyles, useColors } from '../theme/useTheme';

const day = (ts: number) => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

/** One sentence on marginal versus effective, in plain words. */
function rateSentence(seasonRake: number) {
  const marginal = gaugeFor(seasonRake).ratePct;
  const effective = effectiveRatePct(seasonRake);
  if (!(seasonRake > 0)) return `Your first entry starts the spring. ${marginal}% of the rake you pay comes back, and the rate climbs as your season does.`;
  if (effective > marginal - 0.05) return `Every dollar of rake you pay springs back ${formatPct(marginal)}. That's your rate on the whole season so far, too.`;
  return `Every new dollar of rake springs back ${formatPct(marginal)}. Across your whole season it works out to ${formatPct(effective)}, because each rate only covers rake paid after you reach it.`;
}

/**
 * Springback: the whole loyalty program on one screen. No points, no tiers to
 * learn. Violet is you (your gauge, your row). Mint is the credit you can act on.
 * Everything here is MOCK currency.
 */
export default function Springback() {
  const s = useStyles();
  const c = useColors();
  const seasonRake = useApp((st) => st.seasonRake);
  const credit = useApp((st) => st.sbCredit);
  const ledger = useApp((st) => st.sbLedger);
  const useCreditFirst = useApp((st) => st.useCreditFirst);
  const setUseCreditFirst = useApp((st) => st.setUseCreditFirst);
  const landed = useApp((st) => st.sbLanded);
  const dismissLanded = useApp((st) => st.dismissLanded);
  const advance = useApp((st) => st.advanceToWednesday);
  const skew = useApp((st) => st.sbSkewMs);
  const [releaseKey, setReleaseKey] = useState(0);
  const [justLanded, setJustLanded] = useState<number | null>(null);
  const [labNote, setLabNote] = useState<string | null>(null);

  const gauge = gaugeFor(seasonRake);
  const gaugeIndex = SPRINGBACK_GAUGES.indexOf(gauge);
  const next = nextGauge(seasonRake);
  const pending = springbackPending(ledger);
  const firstPending = ledger.reduce<number | null>(
    (min, x) => (x.kind === 'entry' && x.paidAt == null && (min === null || x.payOn < min) ? x.payOn : min),
    null,
  );
  const wednesday = firstPending ?? nextPayout(Date.now() + skew);

  // A payout arrived (here or while away): let the spring go, once, then mark it seen.
  const landedAt = landed?.at;
  const landedAmount = landed?.amount;
  useEffect(() => {
    if (landedAt == null || landedAmount == null) return;
    const t = setTimeout(() => {
      setJustLanded(landedAmount);
      setReleaseKey((k) => k + 1);
      announce(`Springback landed: ${formatCents(landedAmount)} in entry credit. Mock.`);
      dismissLanded();
    }, 350);
    return () => clearTimeout(t);
  }, [landedAt, landedAmount, dismissLanded]);

  const onSkip = () => {
    const paid = advance();
    setLabNote(paid > 0 ? null : pending > 0 ? 'Under a cent pending. It rolls to next Wednesday.' : 'Nothing pending. Enter a contest with cash first.');
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={s.header}>
        <Tap
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/account'))}
          style={s.iconBtn}
          testID="springback-back"
        >
          <ChevronLeft color={c.text} />
        </Tap>
        <Text style={s.headerTitle} accessibilityRole="header">
          Springback
        </Text>
      </View>
      <ScrollView contentContainerStyle={s.body} testID="springback-screen">
        <View style={s.hero}>
          <SpringGauge load={springLoad(seasonRake)} wire={gaugeIndex} releaseKey={releaseKey} onRelease={feel.landed} />
          <View style={s.heroText}>
            <View>
              <Text style={s.kicker}>Your gauge</Text>
              <Text style={s.gauge} testID="springback-gauge" numberOfLines={1} adjustsFontSizeToFit>
                {gauge.name}
              </Text>
              <Text style={s.mono}>{formatPct(gauge.ratePct)} on new rake</Text>
            </View>
            <View>
              <Text style={s.pending} testID="springback-pending">
                {formatCents(pending)}
              </Text>
              <Text style={s.pendingLabel}>springs back Wednesday, {day(wednesday)}</Text>
            </View>
          </View>
        </View>

        <Text style={s.lead}>{rateSentence(seasonRake)}</Text>

        {justLanded !== null ? (
          <View style={s.landed} testID="springback-landed" accessibilityLiveRegion="polite">
            <Text style={s.landedText}>Springback landed: {formatCents(justLanded)} in entry credit</Text>
            <Text style={s.hint}>It goes first on your next entry. Whatever that team wins is cash.</Text>
          </View>
        ) : null}

        <View style={s.list}>
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={s.rowLabel}>Springback credit</Text>
              <Text style={s.hint}>Separate from your cash balance. Good for entries only.</Text>
            </View>
            <Text style={[s.credit, credit > 0 && { color: c.accent }]} testID="springback-credit">
              {formatCents(credit)}
            </Text>
          </View>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: useCreditFirst }}
            accessibilityLabel="Spend credit first"
            onPress={() => setUseCreditFirst(!useCreditFirst)}
            style={s.row}
            testID="credit-first-toggle"
          >
            <View style={{ flex: 1 }}>
              <Text style={s.rowLabel}>Spend credit first</Text>
              <Text style={s.hint}>{useCreditFirst ? 'Entries use credit before cash.' : 'Entries use cash. Credit waits.'}</Text>
            </View>
            <View style={[s.track, { backgroundColor: useCreditFirst ? c.accent : c.border }]}>
              <View style={[s.knob, { alignSelf: useCreditFirst ? 'flex-end' : 'flex-start', backgroundColor: useCreditFirst ? c.bg : c.text }]} />
            </View>
          </Pressable>
          <View style={s.row}>
            <Text style={[s.rowLabel, { flex: 1 }]}>Rake paid this season</Text>
            <Text style={s.rowValue} testID="springback-rake">
              {formatCents(seasonRake)}
            </Text>
          </View>
        </View>

        <View style={{ gap: 8 }}>
          {next ? (
            <>
              <ProgressBar value={next.progress} color={c.primary} track={c.border} />
              <Text style={s.p} testID="springback-next">
                {formatCents(next.rakeToGo)} more rake to {next.gauge.name}. That unlocks {formatPct(next.ratePct)} on everything after it.
              </Text>
              <Text style={s.hint}>
                About {formatMoney(Math.max(5, Math.round(next.rakeToGo / (TOURNAMENT_RAKE_PCT / 100) / 5) * 5))} in entry fees at {TOURNAMENT_RAKE_PCT}% rake.
              </Text>
            </>
          ) : (
            <Text style={s.p} testID="springback-next">
              Max Load. {formatPct(gauge.ratePct)} of every new dollar of rake springs back. There's no higher gauge.
            </Text>
          )}
        </View>

        <View style={{ gap: 10 }}>
          <Text style={s.section}>The rate card</Text>
          <View style={s.table} accessibilityRole="list">
            <View style={s.tr}>
              <Text style={[s.th, s.colGauge]}>Gauge</Text>
              <Text style={[s.th, s.colRake]}>Season rake paid</Text>
              <Text style={[s.th, s.colRate]}>Springs back</Text>
            </View>
            {SPRINGBACK_GAUGES.map((g, i) => {
              const to = SPRINGBACK_GAUGES[i + 1]?.fromRake;
              const you = g === gauge;
              const range = to ? `${formatMoney(g.fromRake)} to ${formatMoney(to)}` : `${formatMoney(g.fromRake)} and up`;
              return (
                <View
                  key={g.key}
                  style={[s.tr, you && s.trYou]}
                  accessibilityRole="text"
                  accessibilityLabel={`${g.name}: ${range} of rake, ${g.ratePct}% springs back${you ? '. Your gauge.' : ''}`}
                  testID={`rate-${g.key}`}
                >
                  <View style={[s.colGauge, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                    <Text style={[s.tdName, you && { color: c.primary }]}>{g.name}</Text>
                    {you ? <Text style={s.you}>you</Text> : null}
                  </View>
                  <Text style={[s.td, s.colRake]}>{range}</Text>
                  <Text style={[s.td, s.colRate, { color: c.text }]}>{g.ratePct}%</Text>
                </View>
              );
            })}
          </View>
          <Text style={s.hint}>One card for everyone. Each rate covers only the rake inside its row, so moving up never costs you.</Text>
        </View>

        <View style={{ gap: 10 }}>
          <Text style={s.section}>The rules, all of them</Text>
          {SPRINGBACK_RULES.map((r) => (
            <Text key={r.title} style={s.p}>
              <Text style={s.ruleTitle}>{r.title} </Text>
              {r.body}
            </Text>
          ))}
        </View>

        <View style={{ gap: 4 }}>
          <Text style={s.section}>Ledger</Text>
          {ledger.length === 0 ? (
            <Text style={s.p}>Nothing yet. Your first cash entry shows up here with its rake and what springs back.</Text>
          ) : (
            <View style={s.list}>
              {ledger.slice(0, 40).map((x) => (
                <LedgerRow key={x.id} item={x} />
              ))}
            </View>
          )}
        </View>

        <View style={{ gap: 8 }}>
          <Button variant="ghost" label="Lab: advance to Wednesday" onPress={onSkip} testID="springback-advance" />
          {labNote ? <Text style={[s.hint, { textAlign: 'center' }]}>{labNote}</Text> : null}
          <MockNote text="Mock currency. Springback, credit and rake here are simulated and have no cash value. Program terms are placeholders pending legal review." />
        </View>
      </ScrollView>
    </Screen>
  );
}

function LedgerRow({ item }: { item: SpringbackItem }) {
  const s = useStyles();
  const c = useColors();
  if (item.kind === 'payout') {
    return (
      <View style={s.row} testID="ledger-payout">
        <View style={{ flex: 1 }}>
          <Text style={s.rowLabel}>Wednesday payout</Text>
          <Text style={s.hint}>
            {day(item.at)} · {item.entries} {item.entries === 1 ? 'entry' : 'entries'} · paid as credit
          </Text>
        </View>
        <Text style={[s.rowValue, { color: c.accent }]}>+{formatCents(item.amount)}</Text>
      </View>
    );
  }
  const allCredit = item.fromCredit >= item.fees - 1e-9;
  return (
    <View style={s.row} testID="ledger-entry">
      <View style={{ flex: 1 }}>
        <Text style={s.rowLabel} numberOfLines={1}>
          {item.contest}
          {item.count > 1 ? ` ×${item.count}` : ''}
        </Text>
        <Text style={s.hint}>
          {day(item.at)} · {formatMoney(item.fees)} in
          {item.fromCredit > 0 ? ` (${formatCents(item.fromCredit)} credit)` : ''} · {formatCents(item.rake)} rake counted
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={s.rowValue}>{allCredit ? 'no Springback' : `+${formatCents(item.amount)}`}</Text>
        {allCredit ? null : <Text style={s.hint}>{item.paidAt != null ? 'paid' : `pending ${day(item.payOn)}`}</Text>}
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingTop: 4, gap: 2 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...type.display24, color: c.text },
  body: { padding: 20, paddingTop: 8, gap: 28, paddingBottom: 40 },
  hero: { flexDirection: 'row', gap: 18, alignItems: 'stretch' },
  heroText: { flex: 1, justifyContent: 'space-between', paddingVertical: 4 },
  kicker: { ...type.label, color: c.primary },
  gauge: { fontFamily: fonts.displayHeavy, fontSize: 56, lineHeight: 58, color: c.text },
  mono: { fontFamily: fonts.mono, fontSize: 13, color: c.textMuted },
  pending: { fontFamily: fonts.displayHeavy, fontSize: 48, lineHeight: 50, color: c.text },
  pendingLabel: { ...type.small, color: c.textMuted },
  lead: { ...type.body, fontSize: 16, lineHeight: 23, color: c.text, marginTop: -6 },
  landed: { gap: 2, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, borderColor: c.accent, marginTop: -8 },
  landedText: { ...type.bodyStrong, color: c.text },
  list: { borderTopWidth: 1, borderTopColor: c.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.border },
  rowLabel: { ...type.body, color: c.text },
  rowValue: { fontFamily: fonts.mono, fontSize: 14, color: c.textMuted },
  credit: { fontFamily: fonts.display, fontSize: 26, lineHeight: 28, color: c.text },
  hint: { ...type.small, color: c.textMuted },
  track: { width: 44, height: 26, borderRadius: 13, padding: 3, justifyContent: 'center' },
  knob: { width: 20, height: 20, borderRadius: 10 },
  p: { ...type.body, color: c.textMuted, lineHeight: 22 },
  ruleTitle: { fontFamily: fonts.strong, color: c.text },
  section: { ...type.display24, color: c.text },
  table: { borderTopWidth: 1, borderTopColor: c.border },
  tr: { flexDirection: 'row', alignItems: 'center', minHeight: 44, borderBottomWidth: 1, borderBottomColor: c.border, paddingHorizontal: 2 },
  trYou: { backgroundColor: c.primary + '1F' },
  th: { ...type.label, color: c.textMuted },
  td: { fontFamily: fonts.mono, fontSize: 13, color: c.textMuted },
  tdName: { ...type.bodyStrong, color: c.text },
  you: { ...type.label, color: c.primary },
  colGauge: { flex: 1.25, paddingLeft: 6 },
  colRake: { flex: 1.5 },
  colRate: { width: 84, textAlign: 'right', paddingRight: 6 },
}));
