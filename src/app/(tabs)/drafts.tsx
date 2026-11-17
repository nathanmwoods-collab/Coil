import { router } from 'expo-router';
import { memo, useMemo, useState } from 'react';
import { FlatList, SectionList, Text, View } from 'react-native';

import { Check, ChevronRight } from '../../components/icons';
import { SnakeFill } from '../../components/SnakeFill';
import { DraftCoil } from '../../components/draft/DraftCoil';
import { Button, Card, Chip, Empty, formatMoney, formatPts, ordinal, relativeDay, Screen, Segmented, Tap } from '../../components/ui';
import { SEASON_WEEKS, SPORTS } from '../../data';
import { groupBy, type Sport, liveSummary, onTheClock, picksUntilTurn, POSITIONS, totalPicks } from '../../engine';
import { setRenameSelection } from '../../lib/renameSelection';
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
  // Seasons are per sport: Live and Results show one sport at a time.
  const [sport, setSport] = useState<Sport>('nfl');
  const sportLabel = SPORTS.find((x) => x.key === sport)?.label ?? 'NFL';
  const teams = useMemo(
    () =>
      tab === 'active'
        ? []
        : done
            .filter((d) => (contestById(d.contestId)?.sport ?? 'nfl') === sport || tab === 'completed')
            .map((d) => liveTeam(d, tab === 'results' ? SEASON_WEEKS : week)),
    [done, week, tab, sport],
  );
  const seasonOver = week >= SEASON_WEEKS;
  // Rename mode: rows turn into checkboxes on Completed and Live.
  const [picked, setPicked] = useState<Set<string> | null>(null);
  const canRename = (tab === 'completed' || tab === 'live') && teams.length > 0;
  const selecting = canRename && picked !== null;
  const toggle = (ids: string[]) =>
    setPicked((cur) => {
      const next = new Set(cur ?? []);
      const allIn = ids.every((id) => next.has(id));
      for (const id of ids) allIn ? next.delete(id) : next.add(id);
      return next;
    });
  const sel: Selection | undefined = selecting ? { picked: picked!, toggle } : undefined;
  const count = selecting ? teams.filter((t) => picked!.has(t.id)).length : 0;

  const findPod = <Button small label="Find a pod" onPress={() => router.navigate('/')} />;

  return (
    <Screen>
      <View style={s.header}>
        <Text style={s.title}>Your drafts</Text>
        <Segmented<Tab>
          value={tab}
          onChange={(t) => {
            setTab(t);
            setPicked(null);
          }}
          options={[
            { key: 'active', label: 'Active', badge: active.length },
            { key: 'completed', label: 'Completed' },
            { key: 'live', label: 'Live' },
            { key: 'results', label: 'Results' },
          ]}
        />
        {tab === 'live' || tab === 'results' ? (
          <View style={s.sports} accessibilityRole="tablist">
            {SPORTS.map((sp) => (
              <Chip key={sp.key} label={sp.label} active={sport === sp.key} onPress={() => setSport(sp.key)} />
            ))}
          </View>
        ) : null}
        {canRename ? (
          <View style={s.tools}>
            {selecting ? (
              <>
                <Tap accessibilityRole="button" onPress={() => toggle(teams.map((t) => t.id))} style={s.tool} testID="select-all">
                  <Text style={s.toolText}>{count === teams.length ? 'Clear all' : 'Select all'}</Text>
                </Tap>
                <Tap accessibilityRole="button" onPress={() => setPicked(null)} style={s.tool} testID="select-cancel">
                  <Text style={s.toolText}>Cancel</Text>
                </Tap>
              </>
            ) : (
              <Tap accessibilityRole="button" onPress={() => setPicked(new Set())} style={s.tool} testID="rename-teams">
                <Text style={s.toolText}>Rename teams</Text>
              </Tap>
            )}
          </View>
        ) : null}
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
          extraData={picked}
          renderItem={({ item }) => <CompletedRow t={item} sel={sel} />}
          ListEmptyComponent={<Empty title="No teams in the books." body="Finish a draft and it lands here." action={findPod} />}
        />
      ) : tab === 'live' ? (
        <LiveView
          teams={teams}
          week={week}
          sel={sel}
          season={`${sportLabel} 2026 season`}
          empty={<Empty title={`No ${sportLabel} teams in the season yet.`} body="Finish a draft and it starts scoring here." action={findPod} />}
        />
      ) : seasonOver ? (
        <FlatList
          data={teams}
          keyExtractor={(t) => t.id}
          contentContainerStyle={s.list}
          renderItem={({ item }) => <ResultRow t={item} />}
          ListEmptyComponent={<Empty title="No scars yet." body="Draft a team. The season will hand you some." action={findPod} />}
        />
      ) : (
        <Empty
          title="Season's still on."
          body={`Week ${week} of ${SEASON_WEEKS} (mock). Final finishes land here when it wraps. Move the week in You, under Lab.`}
          action={<Button small variant="secondary" label="See live standings" onPress={() => setTab('live')} />}
        />
      )}
      {selecting ? (
        <View style={s.bar}>
          <Text style={s.barText}>{count === 0 ? 'Tap the teams to name.' : `${count} ${count === 1 ? 'team' : 'teams'} picked`}</Text>
          <Button
            small
            testID="rename-next"
            label={count > 1 ? `Name ${count} teams` : 'Name team'}
            disabled={count === 0}
            onPress={() => {
              setRenameSelection(teams.filter((t) => picked!.has(t.id)).map((t) => t.id));
              setPicked(null);
              router.push('/rename');
            }}
          />
        </View>
      ) : null}
    </Screen>
  );
}

interface Selection {
  picked: Set<string>;
  toggle: (ids: string[]) => void;
}

function Tick({ on }: { on: boolean }) {
  const c = useColors();
  return (
    <View
      style={{
        width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center',
        borderColor: on ? c.primary : c.border, backgroundColor: on ? c.primary : 'transparent',
      }}
    >
      {on ? <Check color={c.primaryText} size={14} /> : null}
    </View>
  );
}

function ActiveRow({ d }: { d: DraftEntry }) {
  const s = useStyles();
  const c = useColors();
  const contest = contestById(d.contestId);
  const mine = onTheClock(d.state)?.id === ME;
  const until = picksUntilTurn(d.state, ME);
  const total = totalPicks(d.state.config);
  const hands = d.background ? 'Your list is driving' : d.autodraft || d.autopilot ? 'Autopilot on' : null;
  return (
    <Card onPress={() => router.push(`/draft/${d.id}`)} style={[s.row, mine && !d.background && { borderWidth: 1, borderColor: c.accent }]} testID={`active-${d.id}`}>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={s.name} numberOfLines={1}>
          {contest?.name ?? 'Draft'} · {teamName(d)}
        </Text>
        {d.state.status === 'filling' ? (
          <Text style={s.meta}>Finding drafters</Text>
        ) : (
          <DraftCoil state={d.state} compact label={`${d.state.picks.length + 1}/${total}`} />
        )}
        {hands ? <Text style={s.meta}>{hands}</Text> : null}
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

function CompletedRow({ t, sel }: { t: LiveTeam; sel?: Selection }) {
  const s = useStyles();
  const c = useColors();
  const on = !!sel?.picked.has(t.id);
  const contest = contestById(t.contestId);
  return (
    <Card
      onPress={() => (sel ? sel.toggle([t.id]) : router.push(`/draft/${t.id}`))}
      style={[s.row, on && { borderWidth: 1, borderColor: c.primary }]}
      testID={`completed-${t.id}`}
    >
      {sel ? <Tick on={on} /> : null}
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={s.name} numberOfLines={1}>
          {t.name}
        </Text>
        <Text style={s.meta} numberOfLines={1}>
          {contest?.name ?? 'Draft'} · {formatMoney(t.fee)} · {relativeDay(t.createdAt)}
        </Text>
        <PosDots counts={t.counts} />
      </View>
      {sel ? null : <ChevronRight color={c.textMuted} size={20} />}
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

function LiveView({ teams, week, sel, empty, season }: { teams: LiveTeam[]; week: number; sel?: Selection; empty: React.ReactElement; season: string }) {
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
      extraData={sel?.picked}
      contentContainerStyle={s.list}
      ListHeaderComponent={
        <View style={s.overview} testID="live-overview">
          <View style={s.ovTop}>
            <Text style={s.ovSeason}>{season}</Text>
            <Text style={s.ovWeek}>{weekLine} · mock</Text>
          </View>
          <View>
            <Text style={[s.statValue, { color: sum.winning ? c.accent : c.text }]} numberOfLines={1} adjustsFontSizeToFit>
              {formatMoney(sum.winning)}
              <Text style={s.onPace}>{sum.winning ? ' on pace' : ' so far'}</Text>
            </Text>
            <Text style={s.ovSub}>
              {sum.entries} {sum.entries === 1 ? 'entry' : 'entries'} · {formatMoney(sum.atStake)} paid in (mock)
            </Text>
          </View>
          <SnakeFill value={Math.min(1, week / SEASON_WEEKS)} color={c.primary} track={c.border} humps={SEASON_WEEKS} amp={4} height={16} />
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
          {sel ? (
            <Tap accessibilityRole="button" onPress={() => sel.toggle(section.data.map((t) => t.id))} style={s.exposure} scaleTo={0.99} testID={`select-group-${section.key}`}>
              <Text style={s.exposureText}>
                {section.data.every((t) => sel.picked.has(t.id)) ? 'Clear this contest' : `Select all ${section.data.length} here`}
              </Text>
            </Tap>
          ) : (
            <Tap accessibilityRole="link" onPress={() => router.navigate('/exposure')} style={s.exposure} scaleTo={0.99} testID={`exposure-${section.key}`}>
              <Text style={s.exposureText}>Exposure</Text>
              <ChevronRight color={c.textMuted} size={18} />
            </Tap>
          )}
        </View>
      )}
      renderItem={({ item: t }) => (
        <Tap
          accessibilityRole={sel ? 'checkbox' : 'button'}
          accessibilityState={sel ? { checked: sel.picked.has(t.id) } : undefined}
          onPress={() => (sel ? sel.toggle([t.id]) : router.push(`/results/${t.id}`))}
          style={s.team}
          scaleTo={0.99}
          testID={`live-${t.id}`}
        >
          {sel ? <Tick on={sel.picked.has(t.id)} /> : null}
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
              {t.rank === null
                ? 'Kicks off week 1'
                : t.winning
                ? `${t.advancing ? 'Through · ' : ''}${formatMoney(t.winning)}`
                : week >= SEASON_WEEKS
                  ? 'Missed the cut'
                  : t.gap !== null
                    ? `${formatPts(t.gap)} pts back`
                    : 'Missed the cut'}
            </Text>
          </View>
        </Tap>
      )}
    />
  );
}

const useStyles = makeStyles((c) => ({
  header: { padding: 16, paddingBottom: 0, gap: 8 },
  title: { ...type.display40, color: c.text },
  sports: { flexDirection: 'row', gap: 6 },
  tools: { flexDirection: 'row', justifyContent: 'flex-end', gap: 4, marginBottom: -8 },
  tool: { minHeight: 40, paddingHorizontal: 8, justifyContent: 'center' },
  toolText: { ...type.smallStrong, color: c.textMuted },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.bg },
  barText: { ...type.small, color: c.textMuted, flex: 1 },
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
  onPace: { fontFamily: fonts.display, fontSize: 22, color: c.textMuted },
  ovSub: { ...type.small, color: c.textMuted, marginTop: 2 },
  statValue: { fontFamily: fonts.displayHeavy, fontSize: 34, lineHeight: 36, color: c.text },
  group: { marginTop: 14, gap: 2 },
  groupName: { ...type.display24, color: c.text },
  exposure: { flexDirection: 'row', alignItems: 'center', minHeight: 44, marginTop: 6, borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.border },
  exposureText: { ...type.bodyStrong, color: c.text, flex: 1 },
  team: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: c.border + '99' },
}));
