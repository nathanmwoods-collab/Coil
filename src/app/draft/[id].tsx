import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';

import { BoardGrid } from '../../components/draft/BoardGrid';
import { Countdown } from '../../components/draft/Countdown';
import { MyTeam } from '../../components/draft/MyTeam';
import { PickStrip } from '../../components/draft/PickStrip';
import { PLAYER_ROW_HEIGHT, PlayerRow, type StackTag } from '../../components/draft/PlayerRow';
import { QueueList } from '../../components/draft/QueueList';
import { Button, Chip, Empty, Screen, Segmented } from '../../components/ui';
import { PLAYERS } from '../../data';
import { onTheClock, picksUntilTurn, rosterPlayers, roundOf, totalPicks, type Player, type Position } from '../../engine';
import { exposureFor, PLAYER_BY_ID } from '../../store/results';
import { contestById, ME, useApp, type DraftEntry } from '../../store/useApp';
import { makeStyles, useColors } from '../../theme/useTheme';

type Tab = 'players' | 'queue' | 'team' | 'board';
type PosFilter = 'All' | Position;
type Sort = 'adp' | 'proj';

export default function DraftRoom() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const draftId = String(id);
  const d = useApp((s) => s.drafts[draftId]);
  const hydrated = useApp((s) => s.hydrated);
  const s = useStyles();

  if (!d) {
    return (
      <Screen>
        {hydrated ? (
          <Empty title="Draft not found" action={<Button label="Back to lobby" onPress={() => router.replace('/')} />} />
        ) : (
          <Empty title="Loading draft…" />
        )}
      </Screen>
    );
  }
  return (
    <Screen>
      <View style={s.flex}>
        <Room d={d} />
      </View>
    </Screen>
  );
}

function Room({ d }: { d: DraftEntry }) {
  const s = useStyles();
  const c = useColors();
  const state = d.state;
  const contest = contestById(d.contestId);
  const draftPlayer = useApp((st) => st.draftPlayer);
  const toggleQueue = useApp((st) => st.toggleQueue);
  const moveQueue = useApp((st) => st.moveQueue);
  const setAutodraft = useApp((st) => st.setAutodraft);
  const botSpeed = useApp((st) => st.botSpeed);
  const setBotSpeed = useApp((st) => st.setBotSpeed);
  // Ids of my other completed drafts as a stable string, so ticks elsewhere don't re-render.
  const doneKey = useApp((st) =>
    Object.values(st.drafts)
      .filter((x) => x.state.status === 'complete' && x.id !== d.id)
      .map((x) => x.id)
      .join(','),
  );

  const [tab, setTab] = useState<Tab>('players');
  const [pos, setPos] = useState<PosFilter>('All');
  const [sort, setSort] = useState<Sort>('adp');
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);

  const clock = onTheClock(state);
  const myTurn = clock?.id === ME;
  const untilTurn = picksUntilTurn(state, ME);
  const current = state.picks.length + 1;
  const total = totalPicks(state.config);
  const complete = state.status === 'complete';

  const taken = useMemo(() => new Set(state.picks.map((p) => p.playerId)), [state.picks]);
  const queued = useMemo(() => new Set(d.queue), [d.queue]);

  // Stack tags: shares an NFL team with my roster; "QB stack" if paired with my QB.
  const { myTeams, myQbTeams } = useMemo(() => {
    const roster = rosterPlayers(state, ME, PLAYER_BY_ID);
    return {
      myTeams: new Set(roster.map((p) => p.team)),
      myQbTeams: new Set(roster.filter((p) => p.position === 'QB').map((p) => p.team)),
    };
  }, [state]);

  // Exposure from my other completed drafts, shown on rows.
  const exposureMap = useMemo(() => {
    if (!doneKey) return null;
    const all = useApp.getState().drafts;
    const done = doneKey.split(',').map((k) => all[k]).filter((x): x is DraftEntry => !!x);
    return new Map(exposureFor(done).map((r) => [r.player.id, r.pct]));
  }, [doneKey]);

  const available = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = PLAYERS.filter(
      (p) =>
        !taken.has(p.id) &&
        (pos === 'All' || p.position === pos) &&
        (!needle || p.name.toLowerCase().includes(needle) || p.team.toLowerCase() === needle),
    );
    return list.sort(sort === 'adp' ? (a, b) => a.adp - b.adp : (a, b) => b.projPoints - a.projPoints);
  }, [taken, pos, sort, q]);

  const onDraft = useCallback(
    (pid: string) => {
      const err = draftPlayer(d.id, pid);
      setError(err);
    },
    [draftPlayer, d.id],
  );
  const onStar = useCallback((pid: string) => toggleQueue(d.id, pid), [toggleQueue, d.id]);
  const onMove = useCallback((pid: string, dir: -1 | 1) => moveQueue(d.id, pid, dir), [moveQueue, d.id]);

  const stackFor = useCallback(
    (p: Player): StackTag => {
      if (p.position !== 'QB' && myQbTeams.has(p.team)) return 'QB stack';
      if (p.position === 'QB' && myTeams.has(p.team)) return 'QB stack';
      if (myTeams.has(p.team)) return 'Stack';
      return null;
    },
    [myTeams, myQbTeams],
  );

  const renderPlayer = useCallback(
    ({ item }: { item: Player }) => (
      <PlayerRow
        player={item}
        queued={queued.has(item.id)}
        canDraft={myTurn}
        stack={stackFor(item)}
        exposurePct={exposureMap?.get(item.id)}
        onDraft={onDraft}
        onStar={onStar}
      />
    ),
    [queued, myTurn, stackFor, exposureMap, onDraft, onStar],
  );

  const auto = d.autodraft || d.autopilot;

  return (
    <View style={s.flex}>
      {/* Header */}
      <View style={s.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Leave draft room" onPress={() => (router.canGoBack() ? router.back() : router.replace('/drafts'))} style={s.back}>
          <Text style={s.backText}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.contestName} numberOfLines={1}>
            {contest?.name ?? 'Draft'}
          </Text>
          <Text style={s.sub}>
            {complete ? `Complete · ${total} picks` : `Round ${roundOf(current, state.config.teams)} of ${state.config.rounds} · Pick ${current} of ${total}`}
          </Text>
        </View>
        {myTurn ? (
          <Countdown endsAt={state.clockEndsAt} totalMs={state.config.pickClockSec * 1000} mine compact />
        ) : null}
      </View>

      {/* On-the-clock banner */}
      {complete ? (
        <View style={[s.banner, { backgroundColor: c.success + '22', borderColor: c.success }]}>
          <View style={{ flex: 1 }}>
            <Text style={[s.bannerTitle, { color: c.success }]}>Draft complete</Text>
            <Text style={s.bannerSub}>Your team is locked. See how the season plays out.</Text>
          </View>
          <Button small label="Results" onPress={() => router.replace(`/results/${d.id}`)} testID="view-results" />
        </View>
      ) : myTurn ? (
        <View style={[s.banner, { backgroundColor: c.primary, borderColor: c.primary }]} testID="on-the-clock">
          <View style={{ flex: 1 }}>
            <Text style={[s.bannerTitle, { color: c.primaryText }]}>You're on the clock</Text>
            <Text style={[s.bannerSub, { color: c.primaryText, opacity: 0.85 }]}>
              {auto ? 'Autodraft is picking for you…' : d.queue.length ? `Queue: ${PLAYER_BY_ID.get(d.queue[0])?.name ?? ''} is up first` : 'Tap Draft on any player'}
            </Text>
          </View>
        </View>
      ) : (
        <View style={s.banner}>
          <View style={{ flex: 1 }}>
            <Text style={s.bannerTitle} numberOfLines={1}>
              {clock?.name ?? '—'} is picking
            </Text>
            <Text style={s.bannerSub}>
              {untilTurn === null ? 'No picks left for you' : untilTurn === 1 ? "You're up next" : `Your pick in ${untilTurn}`}
            </Text>
          </View>
          {untilTurn !== null ? (
            <View style={s.untilBadge}>
              <Text style={s.untilNum}>{untilTurn}</Text>
              <Text style={s.untilLabel}>picks away</Text>
            </View>
          ) : null}
        </View>
      )}

      {d.autopilot ? (
        <View style={[s.autopilot]} testID="autopilot-banner">
          <Text style={s.autopilotText}>Autopilot on — you missed {d.missed} picks in a row, so we're drafting for you.</Text>
          <Button small variant="secondary" label="Turn off" onPress={() => setAutodraft(d.id, false)} />
        </View>
      ) : null}

      {!complete ? (
        <View style={s.controls}>
          <Toggle label="Autodraft" on={d.autodraft} onPress={() => setAutodraft(d.id, !d.autodraft)} testID="autodraft-toggle" />
          <Toggle label="Fast bots" on={botSpeed === 'fast'} onPress={() => setBotSpeed(botSpeed === 'fast' ? 'normal' : 'fast')} />
        </View>
      ) : null}

      <PickStrip state={state} players={PLAYER_BY_ID} />

      <View style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
        <Segmented<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { key: 'players', label: 'Players' },
            { key: 'queue', label: 'Queue', badge: d.queue.length },
            { key: 'team', label: 'My Team' },
            { key: 'board', label: 'Board' },
          ]}
        />
      </View>

      {error ? (
        <Pressable onPress={() => setError(null)} style={s.error}>
          <Text style={{ color: c.danger, fontWeight: '700' }}>{error}</Text>
        </Pressable>
      ) : null}

      <View style={s.flex}>
        {tab === 'players' ? (
          <View style={s.flex}>
            <View style={s.filters}>
              <TextInput
                value={q}
                onChangeText={setQ}
                placeholder="Search players or team"
                placeholderTextColor={c.textMuted}
                style={s.search}
                autoCorrect={false}
                autoCapitalize="none"
                clearButtonMode="while-editing"
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Sort by ${sort === 'adp' ? 'projection' : 'ADP'}`}
                onPress={() => setSort(sort === 'adp' ? 'proj' : 'adp')}
                style={s.sortBtn}
              >
                <Text style={s.sortLabel}>SORT</Text>
                <Text style={s.sortValue}>{sort === 'adp' ? 'ADP' : 'Proj'}</Text>
              </Pressable>
            </View>
            <View style={s.chips}>
              {(['All', 'QB', 'RB', 'WR', 'TE'] as PosFilter[]).map((p) => (
                <Chip key={p} label={p} active={pos === p} color={p === 'All' ? undefined : c[p]} onPress={() => setPos(p)} />
              ))}
            </View>
            <FlatList
              data={available}
              keyExtractor={(p) => p.id}
              renderItem={renderPlayer}
              extraData={myTurn}
              getItemLayout={(_, i) => ({ length: PLAYER_ROW_HEIGHT, offset: PLAYER_ROW_HEIGHT * i, index: i })}
              initialNumToRender={14}
              windowSize={7}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={<Empty title="No players match" body="Try a different search or position." />}
            />
          </View>
        ) : tab === 'queue' ? (
          <QueueList queue={d.queue} players={PLAYER_BY_ID} canDraft={myTurn} onMove={onMove} onRemove={onStar} onDraft={onDraft} />
        ) : tab === 'team' ? (
          <MyTeam state={state} players={PLAYER_BY_ID} />
        ) : (
          <BoardGrid state={state} players={PLAYER_BY_ID} />
        )}
      </View>
    </View>
  );
}

function Toggle({ label, on, onPress, testID }: { label: string; on: boolean; onPress: () => void; testID?: string }) {
  const s = useStyles();
  const c = useColors();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      accessibilityLabel={label}
      onPress={onPress}
      style={s.toggle}
    >
      <View style={[s.track, { backgroundColor: on ? c.primary : c.surfaceAlt }]}>
        <View style={[s.knob, { alignSelf: on ? 'flex-end' : 'flex-start' }]} />
      </View>
      <Text style={[s.toggleLabel, on && { color: c.text }]}>{label}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 16, paddingLeft: 4, paddingVertical: 6 },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  backText: { color: c.text, fontSize: 32, lineHeight: 34, fontWeight: '300' },
  contestName: { color: c.text, fontSize: 16, fontWeight: '800' },
  sub: { color: c.textMuted, fontSize: 12, fontWeight: '600' },
  banner: {
    marginHorizontal: 12,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
  },
  bannerTitle: { color: c.text, fontSize: 17, fontWeight: '900' },
  bannerSub: { color: c.textMuted, fontSize: 12, fontWeight: '600', marginTop: 2 },
  untilBadge: { alignItems: 'center', minWidth: 56 },
  untilNum: { color: c.accent, fontSize: 24, fontWeight: '900' },
  untilLabel: { color: c.textMuted, fontSize: 10, fontWeight: '700' },
  autopilot: {
    marginHorizontal: 12,
    marginTop: 8,
    padding: 10,
    borderRadius: 12,
    backgroundColor: c.warning + '22',
    borderWidth: 1,
    borderColor: c.warning,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  autopilotText: { color: c.warning, flex: 1, fontSize: 12, fontWeight: '700' },
  controls: { flexDirection: 'row', gap: 16, paddingHorizontal: 12, paddingTop: 4 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  track: { width: 40, height: 24, borderRadius: 12, padding: 3, justifyContent: 'center' },
  knob: { width: 18, height: 18, borderRadius: 9, backgroundColor: c.text },
  toggleLabel: { color: c.textMuted, fontWeight: '700', fontSize: 13 },
  error: { marginHorizontal: 12, marginBottom: 6, padding: 10, borderRadius: 10, backgroundColor: c.danger + '1F' },
  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: 12 },
  search: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.border,
    color: c.text,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  sortBtn: { width: 64, height: 44, borderRadius: 12, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
  sortLabel: { color: c.textMuted, fontSize: 9, fontWeight: '800' },
  sortValue: { color: c.text, fontSize: 13, fontWeight: '800' },
  chips: { flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.border },
}));
