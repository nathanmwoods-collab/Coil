import { router } from 'expo-router';
import { memo, useMemo, useState } from 'react';
import { FlatList, SectionList, Text, View } from 'react-native';

import { ChevronRight } from '../../components/icons';
import { SnakeFill } from '../../components/SnakeFill';
import { Button, Card, Empty, formatMoney, formatPts, ordinal, relativeDay, Screen, Segmented, Tap } from '../../components/ui';
import { SEASON_WEEKS } from '../../data';
import { groupBy, liveSummary, onTheClock, picksUntilTurn, POSITIONS, totalPicks } from '../../engine';
import { liveTeam, type LiveTeam } from '../../store/results';
import { contestById, ME, teamName, useApp, type DraftEntry } from '../../store/useApp';
import { fonts, type } from '../../theme/type';
import { makeStyles, useColors } from '../../theme/useTheme';

type Tab = 'active' | 'completed' | 'live' | 'results';

export default function Drafts() {
  const s = useStyles();
  const drafts = useApp((st) => st.drafts);
  const week = useApp((st) => st.currentWeek);
  const { active, done } = useMemo(() => {
    const all = Object.values(drafts).sort((a, b) => b.createdAt - a.createdAt);
    return { active: all.filter((d) => d.state.status !== 'complete'), done: all.filter((d) => d.state.status === 'complete') };
  }, [drafts]);
  const [tab, setTab] = useState<Tab>(active.length || !done.length ? 'active' : 'live');
  const teams = useMemo(() => (tab === 'active' ? [] : done.map((d) => liveTeam(d, tab === 'results' ? SEASON_WEEKS : week))), [done, week, tab]);
  const seasonOver = week >= SEASON_WEEKS;

  const findPod = <Button small label="Find a pod" onPress={() => router.navigate('/')} />;

  return (
    <Screen>
      <View style={s.header}>
        <Text style={s.title}>Your drafts</Text>
        <Segmented<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { key: 'active', label: 'Active', badge: active.length },
            { key: 'completed', label: 'Completed' },
            { key: 'live', label: 'Live' },
            { key: 'results', label: 'Results' },
          ]}
        />
      </View>
      {tab === 'active' ? (
        <FlatList
          data={active}
          keyExtractor={(d) => d.id}
          contentContainerStyle={s.list}
          renderItem={({ item }) => <ActiveRow d={item} />}
          ListEmptyComponent={<Empty title="Nothing on the clock." body="30-second pods fill fast. You'll be picking in a minute." action={findPod} />}
        />
      ) : tab === 'completed' ? (
        <FlatList
          data={teams}
          keyExtractor={(t) => t.id}
          contentContainerStyle={s.list}
          renderItem={({ item }) => <CompletedRow t={item} />}
          ListEmptyComponent={<Empty title="No teams in the books." body="Finish a draft and it lands here." action={findPod} />}
        />
      ) : tab === 'live' ? (
        <LiveView teams={teams} week={week} empty={<Empty title="No teams in the season yet." body="Finish a draft and it starts scoring here." action={findPod} />} />
      ) : seasonOver ? (
        <FlatList
          data={teams}
          keyExtractor={(t) => t.id}
          contentContainerStyle={s.list}
          renderItem={({ item }) => <ResultRow t={item} />}
          ListEmptyComponent={<Empty title="No finishes yet." body="Draft a team and play the season out." action={findPod} />}
        />
      ) : (
        <Empty
          title="Season's still on."
          body={`Week ${week} of ${SEASON_WEEKS} (mock). Final finishes land here when it wraps. Move the week in You, under Lab.`}
          action={<Button small variant="secondary" label="See live standings" onPress={() => setTab('live')} />}
        />
      )}
    </Screen>
  );
}

function ActiveRow({ d }: { d: DraftEntry }) {
  const s = useStyles();
  const c = useColors();
  const contest = contestById(d.contestId);
  const mine = onTheClock(d.state)?.id === ME;
  const until = picksUntilTurn(d.state, ME);
  const total = totalPicks(d.state.config);
  const hands = d.background ? 'Autodrafting from your rankings' : d.autodraft || d.autopilot ? 'Autopilot on' : null;
  return (
    <Card onPress={() => router.push(`/draft/${d.id}`)} style={[s.row, mine && !d.background && { borderWidth: 1, borderColor: c.accent }]} testID={`active-${d.id}`}>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={s.name} numberOfLines={1}>
          {contest?.name ?? 'Draft'} · {teamName(d)}
        </Text>
        <Text style={s.meta}>
          {d.state.status === 'filling' ? 'Finding drafters…' : `Pick ${d.state.picks.length + 1} of ${total}`}
          {hands ? ` · ${hands}` : ''}
        </Text>
      </View>
      {d.background ? null : (
        <Text style={[s.status, { color: mine ? c.accent : c.textMuted }]}>
          {mine ? "You're up" : until === null ? 'Roster full' : `${until} ${until === 1 ? 'pick' : 'picks'} away`}
        </Text>
      )}
    </Card>
  );
}

/** Roster shape at a glance: a dot per position with its count. */
const PosDots = memo(function PosDots({ counts }: { counts: LiveTeam['counts'] }) {
  const s = useStyles();
  const c = useColors();
  return (
    <View style={s.dots} accessibilityLabel={POSITIONS.map((p) => `${counts[p]} ${p}`).join(', ')}>
      {POSITIONS.map((p) => (
        <View key={p} style={s.dotCell}>
          <View style={[s.dot, { backgroundColor: c[p] }]} />
          <Text style={s.dotText}>{counts[p]}</Text>
        </View>
      ))}
    </View>
  );
});

function CompletedRow({ t }: { t: LiveTeam }) {
  const s = useStyles();
  const c = useColors();
  const contest = contestById(t.contestId);
  return (
    <Card onPress={() => router.push(`/draft/${t.id}`)} style={s.row} testID={`completed-${t.id}`}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={s.name} numberOfLines={1}>
          {t.name}
        </Text>
        <Text style={s.meta} numberOfLines={1}>
          {contest?.name ?? 'Draft'} · {formatMoney(t.fee)} · {relativeDay(t.createdAt)}
        </Text>
        <PosDots counts={t.counts} />
      </View>
      <ChevronRight color={c.textMuted} size={20} />
    </Card>
  );
}

function ResultRow({ t }: { t: LiveTeam }) {
  const s = useStyles();
  const c = useColors();
  const contest = contestById(t.contestId);
  return (
    <Card onPress={() => router.push(`/results/${t.id}`)} style={s.row} testID={`result-${t.id}`}>
      <View style={s.rank}>
        <Text style={s.rankNum}>{t.rank ? ordinal(t.rank) : '–'}</Text>
        <Text style={s.rankOf}>of {t.of}</Text>
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={s.name} numberOfLines={1}>
          {t.name}
        </Text>
        <Text style={s.meta} numberOfLines={1}>
          {contest?.name ?? 'Draft'} · {formatPts(t.points)} pts
        </Text>
      </View>
      <Text style={[s.won, !t.winning && { color: c.textMuted }]}>{t.winning ? formatMoney(t.winning) : '$0'}</Text>
    </Card>
  );
}

function LiveView({ teams, week, empty }: { teams: LiveTeam[]; week: number; empty: React.ReactElement }) {
  const s = useStyles();
  const c = useColors();
  const sum = useMemo(() => liveSummary(teams.map((t) => ({ fee: t.fee, winning: t.winning }))), [teams]);
  const sections = useMemo(
    () =>
      groupBy(teams, (t) => t.contestId).map((g) => ({
        key: g.key,
        name: contestById(g.key)?.name ?? 'Contest',
        winning: liveSummary(g.items.map((t) => ({ fee: t.fee, winning: t.winning }))).winning,
        data: [...g.items].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99) || b.points - a.points),
      })),
    [teams],
  );
  if (!teams.length) return empty;
  const weekLine = week <= 0 ? 'Kicks off week 1' : week >= SEASON_WEEKS ? 'Final' : `Through week ${week} of ${SEASON_WEEKS}`;
  return (
    <SectionList
      sections={sections}
      keyExtractor={(t) => t.id}
      stickySectionHeadersEnabled={false}
      contentContainerStyle={s.list}
      ListHeaderComponent={
        <View style={s.overview} testID="live-overview">
          <View style={s.ovTop}>
            <Text style={s.ovSeason}>2026 season</Text>
            <Text style={s.ovWeek}>{weekLine} · mock</Text>
          </View>
          <View style={s.ovStats}>
            <Stat label="Entries" value={String(sum.entries)} />
            <Stat label="At stake" value={formatMoney(sum.atStake)} />
            <Stat label="Winning" value={formatMoney(sum.winning)} />
          </View>
          <SnakeFill value={Math.min(1, week / SEASON_WEEKS)} color={c.primary} track={c.border} />
        </View>
      }
      renderSectionHeader={({ section }) => (
        <View style={s.group}>
          <Text style={s.groupName} numberOfLines={1}>
            {section.name}
          </Text>
          <Text style={s.meta}>
            {section.data.length} {section.data.length === 1 ? 'entry' : 'entries'} · winning {formatMoney(section.winning)}
          </Text>
          <Tap accessibilityRole="link" onPress={() => router.navigate('/exposure')} style={s.exposure} scaleTo={0.99} testID={`exposure-${section.key}`}>
            <Text style={s.exposureText}>Exposure</Text>
            <ChevronRight color={c.textMuted} size={18} />
          </Tap>
        </View>
      )}
      renderItem={({ item: t }) => (
        <Tap accessibilityRole="button" onPress={() => router.push(`/results/${t.id}`)} style={s.team} scaleTo={0.99} testID={`live-${t.id}`}>
          <View style={s.rank}>
            <Text style={s.rankNum}>{t.rank ? ordinal(t.rank) : '–'}</Text>
            <Text style={s.rankOf}>of {t.of}</Text>
          </View>
          <View style={{ flex: 1, gap: 5, minWidth: 0 }}>
            <Text style={s.name} numberOfLines={1}>
              {t.name}
            </Text>
            <PosDots counts={t.counts} />
          </View>
          <View style={{ alignItems: 'flex-end', gap: 3 }}>
            <Text style={s.pts}>{formatPts(t.points)}</Text>
            <Text style={[s.metaStrong, { color: t.winning ? c.text : c.textMuted }]}>
              {t.winning ? `${t.advancing ? 'Advancing · ' : ''}${formatMoney(t.winning)}` : 'Outside the money'}
            </Text>
          </View>
        </Tap>
      )}
    />
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const s = useStyles();
  return (
    <View style={{ flex: 1 }}>
      <Text style={s.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  header: { padding: 16, paddingBottom: 0, gap: 8 },
  title: { ...type.display40, color: c.text },
  list: { padding: 16, gap: 10, paddingBottom: 32 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 72 },
  name: { ...type.bodyStrong, color: c.text },
  meta: { ...type.small, color: c.textMuted },
  metaStrong: { ...type.label },
  status: { ...type.smallStrong },
  rank: { width: 52, alignItems: 'center' },
  rankNum: { fontFamily: fonts.display, fontSize: 30, lineHeight: 30, color: c.primary },
  rankOf: { ...type.micro, fontSize: 10, color: c.textMuted },
  won: { fontFamily: fonts.display, fontSize: 24, lineHeight: 26, color: c.text },
  pts: { fontFamily: fonts.mono, fontSize: 14, color: c.text },
  dots: { flexDirection: 'row', gap: 10 },
  dotCell: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  dotText: { fontFamily: fonts.mono, fontSize: 11, color: c.textMuted },
  overview: { backgroundColor: c.surface, borderRadius: 18, padding: 16, gap: 14 },
  ovTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  ovSeason: { ...type.title, color: c.text },
  ovWeek: { ...type.micro, color: c.textMuted },
  ovStats: { flexDirection: 'row', gap: 12 },
  statValue: { fontFamily: fonts.displayHeavy, fontSize: 34, lineHeight: 36, color: c.text },
  statLabel: { ...type.micro, color: c.textMuted },
  group: { marginTop: 14, gap: 2 },
  groupName: { ...type.display24, color: c.text },
  exposure: { flexDirection: 'row', alignItems: 'center', minHeight: 44, marginTop: 6, borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.border },
  exposureText: { ...type.bodyStrong, color: c.text, flex: 1 },
  team: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: c.border + '99' },
}));
