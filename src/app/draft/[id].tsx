import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, LayoutAnimation, Modal, Pressable, Text, TextInput, View } from 'react-native';

import { Alert, Check, ChevronLeft, ChevronRight, More } from '../../components/icons';
import { BoardGrid } from '../../components/draft/BoardGrid';
import { Breath } from '../../components/draft/Breath';
import { CoilReveal } from '../../components/draft/CoilReveal';
import { Countdown } from '../../components/draft/Countdown';
import { MyTeam } from '../../components/draft/MyTeam';
import { PickStrip } from '../../components/draft/PickStrip';
import { PlayerSheet } from '../../components/draft/PlayerSheet';
import { PLAYER_ROW_HEIGHT, PlayerRow, type StackTag } from '../../components/draft/PlayerRow';
import { QueueList } from '../../components/draft/QueueList';
import { Button, Chip, Empty, Screen, Segmented, Tap, WindingUp } from '../../components/ui';
import { PLAYERS } from '../../data';
import { onTheClock, picksUntilTurn, rosterPlayers, roundOf, totalPicks, type Player, type Position } from '../../engine';
import { botLine } from '../../lib/banter';
import { announce, feel } from '../../lib/feel';
import { searchPlayers } from '../../lib/search';
import { exposureFor, PLAYER_BY_ID } from '../../store/results';
import { contestById, draftTypeFor, liveAdp, ME, useApp, type DraftEntry } from '../../store/useApp';
import { useReducedMotion } from '../../theme/motion';
import { fonts, type } from '../../theme/type';
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
          <Empty title="That draft's gone." action={<Button label="Back to your drafts" onPress={() => router.replace('/drafts')} />} />
        ) : (
          <WindingUp />
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
  const springbackPaid = useApp((st) => st.sbLedger.some((x) => x.kind === 'entry' && x.paidAt != null && x.draftIds.includes(d.id)));
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
  const [menu, setMenu] = useState(false);
  const [sheetId, setSheetId] = useState<string | null>(null);
  // After the draft, the reveal leads; the full board is one tap away.
  const [showBoard, setShowBoard] = useState(false);
  const reduced = useReducedMotion();

  const clock = onTheClock(state);
  const myTurn = clock?.id === ME;
  const untilTurn = picksUntilTurn(state, ME);
  const current = state.picks.length + 1;
  const total = totalPicks(state.config);
  const complete = state.status === 'complete';
  const clockWords = clockInWords(state.config.pickClockSec);

  // Your turn: the double knock, and a spoken cue for screen readers.
  const wasMine = useRef(false);
  useEffect(() => {
    if (myTurn && !wasMine.current && !(d.autodraft || d.autopilot)) {
      feel.yourTurn();
      announce(`You're up. ${clockWords}.`);
    }
    wasMine.current = myTurn;
  }, [myTurn, clockWords, d.autodraft, d.autopilot]);

  // Draft complete: one Success, the first time this room sees it finish.
  const wasComplete = useRef(complete);
  useEffect(() => {
    if (complete && !wasComplete.current) feel.draftComplete();
    wasComplete.current = complete;
  }, [complete]);

  useEffect(() => {
    if (d.autopilot) feel.autopilot();
  }, [d.autopilot]);

  // Bot banter: the last bot's one-liner, at normal speed only.
  const lastPick = state.picks[state.picks.length - 1];
  const banter = useMemo(() => {
    if (!lastPick || lastPick.entrantId === ME || botSpeed !== 'normal' || complete) return null;
    const who = state.entrants.find((e) => e.id === lastPick.entrantId);
    return who ? { name: who.name, line: botLine(who.name, lastPick.overall) } : null;
  }, [lastPick, botSpeed, complete, state.entrants]);

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

  // ADP for this draft type: the seed blended with what completed drafts actually did.
  const adpTable = useApp((st) => st.adp[draftTypeFor(d)]);
  const adpMap = useMemo(() => new Map(PLAYERS.map((p) => [p.id, liveAdp(adpTable, p.id, p.adp)])), [adpTable]);

  const available = useMemo(() => {
    const adpOf = (p: Player) => adpMap.get(p.id) ?? p.adp;
    const pool = PLAYERS.filter((p) => !taken.has(p.id) && (pos === 'All' || p.position === pos)).sort(
      sort === 'adp' ? (a, b) => adpOf(a) - adpOf(b) : (a, b) => b.projPoints - a.projPoints,
    );
    // Search keeps the sort, with exact matches ("cmc", "eagles wr") leading.
    return searchPlayers(q, pool);
  }, [taken, pos, sort, q, adpMap]);

  const onDraft = useCallback(
    (pid: string) => {
      const err = draftPlayer(d.id, pid);
      if (err === null) {
        feel.pickIn();
        if (!reduced) LayoutAnimation.configureNext(LayoutAnimation.create(180, 'easeInEaseOut', 'opacity'));
      } else {
        feel.pickRejected();
      }
      setError(err);
    },
    [draftPlayer, d.id, reduced],
  );
  const onStar = useCallback((pid: string) => toggleQueue(d.id, pid), [toggleQueue, d.id]);
  const onOpen = useCallback((pid: string) => setSheetId(pid), []);
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
        adp={adpMap.get(item.id)}
        onDraft={onDraft}
        onStar={onStar}
        onOpen={onOpen}
      />
    ),
    [queued, myTurn, stackFor, exposureMap, adpMap, onDraft, onStar, onOpen],
  );

  const auto = d.autodraft || d.autopilot;
  const leave = () => (router.canGoBack() ? router.back() : router.replace('/drafts'));

  return (
    <View style={s.flex}>
      <View style={s.header}>
        <Tap accessibilityRole="button" accessibilityLabel="Leave draft room" onPress={leave} style={s.iconBtn}>
          <ChevronLeft color={c.text} />
        </Tap>
        <View style={{ flex: 1 }}>
          <Text style={s.contestName} numberOfLines={1}>
            {contest?.name ?? 'Draft'}
          </Text>
          <Text style={s.sub}>
            {complete ? `${total} picks in the books` : `Round ${roundOf(current, state.config.teams)} of ${state.config.rounds} · pick ${current} of ${total}`}
          </Text>
        </View>
        {d.autodraft && !complete ? (
          <View style={s.autoChip}>
            <Text style={s.autoChipText}>Autopilot</Text>
          </View>
        ) : null}
        {!complete ? (
          <Tap accessibilityRole="button" accessibilityLabel="Draft settings" onPress={() => setMenu(true)} style={s.iconBtn} testID="draft-menu">
            <More color={c.textMuted} />
          </Tap>
        ) : null}
      </View>

      {complete ? null : myTurn ? (
        <View style={s.banner} testID="on-the-clock">
          <Breath endsAt={state.clockEndsAt} color={c.accent} radius={16} />
          <View style={{ flex: 1 }}>
            <Text style={s.upTitle}>You're up.</Text>
            <Text style={s.bannerSub} numberOfLines={2}>
              {auto
                ? "Autopilot's picking for you."
                : d.queue.length
                  ? `Queue says ${PLAYER_BY_ID.get(d.queue[0])?.name ?? 'go'}. Your call.`
                  : `${clockWords}. Make it count.`}
            </Text>
          </View>
          <Countdown endsAt={state.clockEndsAt} totalMs={state.config.pickClockSec * 1000} mine />
        </View>
      ) : (
        <View style={s.banner}>
          <View style={{ flex: 1 }}>
            <Text style={s.bannerTitle} numberOfLines={1}>
              {clock ? `${clock.name} is on the clock` : 'Waiting on the room'}
            </Text>
            <Text style={s.bannerSub} numberOfLines={1}>
              {banter
                ? `${banter.name}: “${banter.line}”`
                : untilTurn === null
                  ? "Roster's full. Sit back."
                  : untilTurn === 1
                    ? "You're next. Get ready."
                    : `${untilTurn} picks till you`}
            </Text>
          </View>
          {untilTurn !== null ? (
            <View style={s.untilBadge} accessibilityLabel={untilTurn === 1 ? "You're next" : `${untilTurn} picks till you`}>
              <Text style={s.untilNum}>{untilTurn}</Text>
              <Text style={s.untilLabel}>{untilTurn === 1 ? 'pick away' : 'picks away'}</Text>
            </View>
          ) : null}
        </View>
      )}

      {d.autopilot && !complete ? (
        <View style={s.autopilot} testID="autopilot-banner">
          <Alert color={c.warning} size={16} />
          <Text style={s.autopilotText}>{d.missed} missed in a row. Autopilot's got it, queue first.</Text>
          <Button small variant="secondary" label="Take it back" onPress={() => setAutodraft(d.id, false)} />
        </View>
      ) : null}

      {complete && !showBoard ? null : <PickStrip state={state} players={PLAYER_BY_ID} />}

      {complete ? null : (
        <View style={{ paddingHorizontal: 12 }}>
          <Segmented<Tab>
            value={tab}
            onChange={setTab}
            options={[
              { key: 'players', label: 'Players' },
              { key: 'queue', label: 'Queue', badge: d.queue.length },
              { key: 'team', label: 'My team' },
              { key: 'board', label: 'Board' },
            ]}
          />
        </View>
      )}

      {error && !complete ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`${error} Dismiss`} onPress={() => setError(null)} style={s.error}>
          <Alert color={c.danger} size={16} />
          <Text style={s.errorText}>{error}</Text>
        </Pressable>
      ) : null}

      <View style={s.flex}>
        {complete ? (
          showBoard ? (
            <View style={s.flex}>
              <BoardGrid state={state} players={PLAYER_BY_ID} />
              <View style={s.boardFooter}>
                <Button label="Draft again" onPress={() => router.replace(`/contest/${d.contestId}`)} testID="draft-again" />
                <Button variant="ghost" label="Play the season" onPress={() => router.replace(`/results/${d.id}`)} testID="view-results" />
              </View>
            </View>
          ) : (
            <CoilReveal
              state={state}
              players={PLAYER_BY_ID}
              onPlay={() => router.replace(`/results/${d.id}`)}
              onBoard={() => setShowBoard(true)}
              onDraftAgain={() => router.replace(`/contest/${d.contestId}`)}
              springback={{ amount: d.springback ?? 0, paid: springbackPaid }}
              onSpringback={() => router.push('/springback')}
            />
          )
        ) : tab === 'players' ? (
          <View style={s.flex}>
            <View style={s.filters}>
              <TextInput
                value={q}
                onChangeText={setQ}
                placeholder="Search"
                placeholderTextColor={c.textMuted}
                style={s.search}
                autoCorrect={false}
                autoCapitalize="none"
                clearButtonMode="while-editing"
              />
              {(['All', 'QB', 'RB', 'WR', 'TE'] as PosFilter[]).map((p) => (
                <Tap
                  key={p}
                  accessibilityRole="button"
                  accessibilityLabel={p === 'All' ? 'All positions' : p}
                  accessibilityState={{ selected: pos === p }}
                  onPress={() => {
                    if (pos !== p) feel.select();
                    setPos(p);
                  }}
                  style={[s.posBtn, pos === p && { backgroundColor: (p === 'All' ? c.text : c[p]) + '22' }]}
                >
                  <Text style={[s.posText, pos === p && { color: p === 'All' ? c.text : c[p] }]}>{p}</Text>
                </Tap>
              ))}
              <Tap
                accessibilityRole="button"
                accessibilityLabel={`Sort by ${sort === 'adp' ? 'projection' : 'ADP'}`}
                onPress={() => {
                  feel.select();
                  setSort(sort === 'adp' ? 'proj' : 'adp');
                }}
                style={s.sortBtn}
              >
                <Text style={s.sortValue}>{sort === 'adp' ? 'ADP' : 'Proj'}</Text>
              </Tap>
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
              ListEmptyComponent={<Empty title="Nobody by that name left." body="They may already be drafted." />}
            />
          </View>
        ) : tab === 'queue' ? (
          <QueueList queue={d.queue} players={PLAYER_BY_ID} canDraft={myTurn} onMove={onMove} onRemove={onStar} onDraft={onDraft} onOpen={onOpen} />
        ) : tab === 'team' ? (
          <MyTeam state={state} players={PLAYER_BY_ID} />
        ) : (
          <BoardGrid state={state} players={PLAYER_BY_ID} />
        )}
      </View>

      <PlayerSheet
        player={sheetId ? PLAYER_BY_ID.get(sheetId) ?? null : null}
        adp={sheetId ? adpMap.get(sheetId) : undefined}
        queued={sheetId ? queued.has(sheetId) : false}
        canDraft={myTurn && !complete}
        onClose={() => setSheetId(null)}
        onDraft={onDraft}
        onQueue={onStar}
      />

      <Modal visible={menu} transparent animationType={reduced ? 'none' : 'fade'} onRequestClose={() => setMenu(false)}>
        <Pressable style={s.scrim} onPress={() => setMenu(false)} accessibilityLabel="Close settings" />
        <View style={s.sheet} testID="draft-sheet">
          <Text style={s.sheetTitle}>This draft</Text>
          <Toggle
            label="Autopilot"
            hint="Drafts for you. Queue first, then your rankings."
            on={d.autodraft}
            onPress={() => setAutodraft(d.id, !d.autodraft)}
            testID="autodraft-toggle"
          />
          <Toggle
            label="Speed up the bots"
            hint="They pick in a blink."
            on={botSpeed === 'fast'}
            onPress={() => setBotSpeed(botSpeed === 'fast' ? 'normal' : 'fast')}
            testID="fast-bots-toggle"
          />
          <Tap
            accessibilityRole="button"
            onPress={() => {
              setMenu(false);
              router.push(`/rankings?type=${draftTypeFor(d)}`);
            }}
            style={s.sheetLink}
            testID="sheet-rankings"
            scaleTo={0.99}
          >
            <View style={{ flex: 1 }}>
              <Text style={s.sheetLinkLabel}>Your rankings</Text>
              <Text style={s.sheetLinkHint}>Autopick uses these after your queue.</Text>
            </View>
            <ChevronRight color={c.textMuted} size={18} />
          </Tap>
          <Button variant="secondary" label="Done" onPress={() => setMenu(false)} icon={<Check color={c.text} size={18} />} testID="sheet-done" />
        </View>
      </Modal>
    </View>
  );
}

function clockInWords(sec: number) {
  if (sec < 60) return `${sec} seconds`;
  if (sec < 3600) return `${Math.round(sec / 60)} minutes`;
  const h = Math.round(sec / 3600);
  return `${h} ${h === 1 ? 'hour' : 'hours'}`;
}

function Toggle({ label, hint, on, onPress, testID }: { label: string; hint?: string; on: boolean; onPress: () => void; testID?: string }) {
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
      <View style={{ flex: 1 }}>
        <Text style={s.toggleLabel}>{label}</Text>
        {hint ? <Text style={s.toggleHint}>{hint}</Text> : null}
      </View>
      <View style={[s.track, { backgroundColor: on ? c.accent : c.border }]}>
        <View style={[s.knob, { alignSelf: on ? 'flex-end' : 'flex-start', backgroundColor: on ? c.bg : c.text }]} />
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 4, paddingVertical: 4 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  contestName: { ...type.title, color: c.text },
  sub: { ...type.micro, fontSize: 12, color: c.textMuted },
  autoChip: { paddingHorizontal: 10, height: 26, borderRadius: 13, justifyContent: 'center', backgroundColor: c.warning + '22' },
  autoChipText: { ...type.label, color: c.warning },
  banner: {
    marginHorizontal: 12,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: c.surface,
  },
  upTitle: { fontFamily: fonts.displayHeavy, fontSize: 30, lineHeight: 32, color: c.accent },
  bannerTitle: { ...type.title, color: c.text },
  bannerSub: { ...type.small, color: c.textMuted, marginTop: 1 },
  untilBadge: { alignItems: 'center', minWidth: 56 },
  untilNum: { fontFamily: fonts.display, fontSize: 32, lineHeight: 32, color: c.primary },
  untilLabel: { ...type.micro, fontSize: 10, lineHeight: 12, color: c.textMuted },
  autopilot: { marginHorizontal: 12, marginTop: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, backgroundColor: c.warning + '1A', flexDirection: 'row', alignItems: 'center', gap: 10 },
  autopilotText: { ...type.smallStrong, color: c.warning, flex: 1 },
  error: { marginHorizontal: 12, marginTop: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: c.danger + '1F', flexDirection: 'row', alignItems: 'center', gap: 8 },
  errorText: { ...type.smallStrong, color: c.danger, flex: 1 },
  filters: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.border + '99' },
  search: { flex: 1, minWidth: 0, height: 40, borderRadius: 20, backgroundColor: c.surface, color: c.text, paddingHorizontal: 14, fontSize: 14, fontFamily: fonts.body, marginRight: 4 },
  posBtn: { minWidth: 36, height: 40, borderRadius: 20, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  posText: { ...type.label, fontSize: 12, color: c.textMuted },
  sortBtn: { height: 40, borderRadius: 20, paddingHorizontal: 12, marginLeft: 4, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
  sortValue: { fontFamily: fonts.mono, fontSize: 12, color: c.text },
  boardFooter: { padding: 16, gap: 10, borderTopWidth: 1, borderTopColor: c.border },
  scrim: { flex: 1, backgroundColor: '#000000AA' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32, gap: 8 },
  sheetLink: { flexDirection: 'row', alignItems: 'center', minHeight: 56, gap: 10 },
  sheetLinkLabel: { ...type.bodyStrong, color: c.text },
  sheetLinkHint: { ...type.small, color: c.textMuted },
  sheetTitle: { ...type.display24, color: c.text, marginBottom: 4 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60 },
  toggleLabel: { ...type.bodyStrong, color: c.text },
  toggleHint: { ...type.small, color: c.textMuted },
  track: { width: 44, height: 26, borderRadius: 13, padding: 3, justifyContent: 'center' },
  knob: { width: 20, height: 20, borderRadius: 10 },
}));
