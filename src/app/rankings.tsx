import { router, useLocalSearchParams } from 'expo-router';
import { memo, useCallback, useMemo, useState } from 'react';
import { FlatList, Text, TextInput, View } from 'react-native';

import { ArrowDown, ArrowUp, ChevronLeft } from '../components/icons';
import { PlayerAvatar } from '../components/PlayerAvatar';
import { Button, Empty, PosPill, Screen, Segmented, Tap } from '../components/ui';
import {
  DRAFT_TYPES,
  isCustomized,
  moveRank,
  moveRankToTop,
  tierNumbers,
  toggleExcluded,
  toggleTierBreak,
  type DraftType,
  type Player,
} from '../engine';
import { PLAYERS } from '../data';
import { feel } from '../lib/feel';
import { searchPlayers } from '../lib/search';
import { PLAYER_BY_ID } from '../store/results';
import { rankingsFor, useApp } from '../store/useApp';
import { fonts, type } from '../theme/type';
import { makeStyles, useColors } from '../theme/useTheme';

interface RowData {
  player: Player;
  rank: number;
  tier: number;
  tierStart: boolean;
  excluded: boolean;
}

export default function RankingsScreen() {
  const s = useStyles();
  const c = useColors();
  const params = useLocalSearchParams<{ type?: string }>();
  const initial = DRAFT_TYPES.some((t) => t.key === params.type) ? (params.type as DraftType) : 'fast12';
  const [kind, setKind] = useState<DraftType>(initial);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const all = useApp((st) => st.rankings);
  const editRankings = useApp((st) => st.editRankings);
  const resetRankings = useApp((st) => st.resetRankings);

  const r = useMemo(() => rankingsFor(all, kind), [all, kind]);
  const custom = useMemo(() => isCustomized(all[kind], PLAYERS), [all, kind]);
  const rows = useMemo(() => {
    const tiers = tierNumbers(r);
    const breaks = new Set(r.tiers);
    const no = new Set(r.excluded);
    const list: RowData[] = [];
    r.order.forEach((id, i) => {
      const player = PLAYER_BY_ID.get(id);
      if (player) list.push({ player, rank: i + 1, tier: tiers[i], tierStart: i > 0 && breaks.has(id), excluded: no.has(id) });
    });
    if (!q.trim()) return list;
    const hits = new Map(list.map((x) => [x.player, x]));
    return searchPlayers(q, list.map((x) => x.player)).map((p) => hits.get(p)!);
  }, [r, q]);

  const blurb = DRAFT_TYPES.find((t) => t.key === kind)?.blurb ?? '';
  const act = useCallback(
    (fn: Parameters<typeof editRankings>[1], nudge = true) => {
      if (nudge) feel.nudge();
      editRankings(kind, fn);
    },
    [editRankings, kind],
  );
  const onUp = useCallback((id: string) => act((x) => moveRank(x, id, -1)), [act]);
  const onDown = useCallback((id: string) => act((x) => moveRank(x, id, 1)), [act]);
  const onTop = useCallback((id: string) => act((x) => moveRankToTop(x, id)), [act]);
  const onTier = useCallback((id: string) => act((x) => toggleTierBreak(x, id), false), [act]);
  const onExclude = useCallback((id: string) => act((x) => toggleExcluded(x, id), false), [act]);
  const onOpen = useCallback((id: string) => setOpen((cur) => (cur === id ? null : id)), []);

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={s.header}>
        <Tap accessibilityRole="button" accessibilityLabel="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/account'))} style={s.iconBtn}>
          <ChevronLeft color={c.text} />
        </Tap>
        <Text style={s.title}>Your rankings</Text>
        {custom ? (
          <Tap accessibilityRole="button" onPress={() => setConfirmReset(true)} style={s.reset} testID="rankings-reset">
            <Text style={s.resetText}>Reset to ADP</Text>
          </Tap>
        ) : null}
      </View>
      <View style={{ paddingHorizontal: 16 }}>
        <Segmented<DraftType>
          value={kind}
          onChange={(k) => {
            setKind(k);
            setOpen(null);
            setConfirmReset(false);
          }}
          options={DRAFT_TYPES.map((t) => ({ key: t.key, label: t.label }))}
        />
      </View>
      {confirmReset ? (
        <View style={s.confirm}>
          <Text style={s.confirmText}>Put this list back in ADP order? Your moves, tiers and do-not-drafts go.</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button small variant="secondary" label="Keep my list" onPress={() => setConfirmReset(false)} style={{ flex: 1 }} />
            <Button
              small
              variant="danger"
              label="Reset it"
              testID="rankings-reset-confirm"
              onPress={() => {
                resetRankings(kind);
                setConfirmReset(false);
              }}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      ) : (
        <Text style={s.blurb}>
          {blurb}. Autopick goes queue, then this list, then ADP. {custom ? 'Yours.' : 'Matches ADP until you move someone.'}
        </Text>
      )}
      <View style={s.searchRow}>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Name, team or nickname"
          placeholderTextColor={c.textMuted}
          style={s.search}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
          testID="rankings-search"
        />
      </View>
      <FlatList
        data={rows}
        keyExtractor={(x) => x.player.id}
        extraData={open}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={14}
        windowSize={9}
        contentContainerStyle={{ paddingBottom: 32 }}
        ListEmptyComponent={<Empty art={false} title="Nobody by that name." body="Try a team, a position or a nickname." />}
        renderItem={({ item }) => (
          <RankRow
            item={item}
            open={open === item.player.id}
            showTier={!q.trim()}
            last={item.rank === r.order.length}
            onOpen={onOpen}
            onUp={onUp}
            onDown={onDown}
            onTop={onTop}
            onTier={onTier}
            onExclude={onExclude}
          />
        )}
      />
    </Screen>
  );
}

const RankRow = memo(function RankRow({
  item,
  open,
  showTier,
  last,
  onOpen,
  onUp,
  onDown,
  onTop,
  onTier,
  onExclude,
}: {
  item: RowData;
  open: boolean;
  showTier: boolean;
  last: boolean;
  onOpen: (id: string) => void;
  onUp: (id: string) => void;
  onDown: (id: string) => void;
  onTop: (id: string) => void;
  onTier: (id: string) => void;
  onExclude: (id: string) => void;
}) {
  const s = useStyles();
  const c = useColors();
  const { player: p, rank, excluded } = item;
  const first = rank === 1;
  return (
    <View>
      {showTier && item.tierStart ? (
        <View style={s.tier}>
          <View style={s.tierLine} />
          <Text style={s.tierText}>Tier {item.tier}</Text>
          <View style={s.tierLine} />
        </View>
      ) : null}
      <View style={[s.row, open && { backgroundColor: c.surface }]}>
        <Tap
          accessibilityRole="button"
          accessibilityLabel={`${p.name}, ranked ${rank}${excluded ? ', do not draft' : ''}. More options`}
          accessibilityState={{ expanded: open }}
          onPress={() => onOpen(p.id)}
          scaleTo={0.99}
          style={s.main}
          testID={`rank-${p.id}`}
        >
          <Text style={[s.rank, excluded && { color: c.textMuted }]}>{rank}</Text>
          <PlayerAvatar player={p} size={34} dim={excluded} />
          <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              <PosPill pos={p.position} small />
              <Text style={[s.name, excluded && s.nameOut]} numberOfLines={1}>
                {p.name}
              </Text>
            </View>
            <Text style={s.meta} numberOfLines={1}>
              {excluded ? "Won't draft" : `${p.team} · ADP ${p.adp.toFixed(1)}`}
            </Text>
          </View>
        </Tap>
        <Tap accessibilityRole="button" accessibilityLabel={`Move ${p.name} up`} disabled={first} onPress={() => onUp(p.id)} style={s.arrow} testID={`rank-up-${p.id}`}>
          <ArrowUp color={first ? c.border : c.text} size={20} />
        </Tap>
        <Tap accessibilityRole="button" accessibilityLabel={`Move ${p.name} down`} disabled={last} onPress={() => onDown(p.id)} style={s.arrow} testID={`rank-down-${p.id}`}>
          <ArrowDown color={last ? c.border : c.text} size={20} />
        </Tap>
      </View>
      {open ? (
        <View style={s.actions}>
          <Button small variant="secondary" label="Move to top" disabled={first} onPress={() => onTop(p.id)} testID="rank-top" />
          <Button small variant="secondary" label={item.tierStart ? 'Remove tier break' : 'Tier break above'} disabled={first} onPress={() => onTier(p.id)} testID="rank-tier" />
          <Button small variant={excluded ? 'secondary' : 'ghost'} label={excluded ? 'Draft him again' : "Don't draft"} onPress={() => onExclude(p.id)} testID="rank-exclude" />
        </View>
      ) : null}
    </View>
  );
});

const useStyles = makeStyles((c) => ({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingTop: 4, gap: 2 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { ...type.display32, color: c.text, flex: 1 },
  reset: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center' },
  resetText: { ...type.smallStrong, color: c.textMuted },
  blurb: { ...type.small, color: c.textMuted, paddingHorizontal: 16, paddingTop: 10 },
  confirm: { gap: 10, margin: 16, marginBottom: 0, padding: 14, borderRadius: 16, backgroundColor: c.surface },
  confirmText: { ...type.bodyStrong, color: c.text },
  searchRow: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border + '99' },
  search: { height: 40, borderRadius: 20, backgroundColor: c.surface, color: c.text, paddingHorizontal: 14, fontSize: 14, fontFamily: fonts.body },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 58, paddingRight: 6, borderBottomWidth: 1, borderBottomColor: c.border + '99' },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 58, paddingLeft: 12, minWidth: 0 },
  rank: { fontFamily: fonts.mono, fontSize: 13, color: c.primary, width: 30, textAlign: 'right' },
  name: { ...type.bodyStrong, color: c.text, flexShrink: 1 },
  nameOut: { color: c.textMuted, textDecorationLine: 'line-through' },
  meta: { ...type.micro, fontSize: 12, color: c.textMuted },
  arrow: { width: 42, height: 44, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.border + '99' },
  tier: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 6 },
  tierLine: { flex: 1, height: 1, backgroundColor: c.primary + '66' },
  tierText: { ...type.label, color: c.primary },
}));
