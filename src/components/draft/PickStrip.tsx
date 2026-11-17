import { memo, useEffect, useMemo, useRef } from 'react';
import { Animated, FlatList, Text, View } from 'react-native';

import { slotForPick, totalPicks, type DraftState, type Player } from '../../engine';
import { ME, useApp } from '../../store/useApp';
import { motion, NATIVE_DRIVER, useReducedMotion } from '../../theme/motion';
import { fonts, type } from '../../theme/type';
import { makeStyles, useColors } from '../../theme/useTheme';
import { MeBadge, shortName } from '../ui';
import { Breath } from './Breath';

const W = 92;

interface Cell {
  overall: number;
  round: number;
  inRound: number;
  entrantName: string;
  mine: boolean;
  player?: Player;
}

/** Horizontal strip of recent and upcoming picks centered on the current pick. */
export const PickStrip = memo(function PickStrip({ state, players }: { state: DraftState; players: Map<string, Player> }) {
  const s = useStyles();
  const ref = useRef<FlatList<Cell>>(null);
  const teams = state.config.teams;
  const current = state.picks.length + 1;
  const drafting = state.status === 'drafting';
  const myTurnNow = drafting && state.entrants[slotForPick(current, teams)]?.id === ME;
  const cells = useMemo(() => {
    const out: Cell[] = [];
    const total = totalPicks(state.config);
    for (let o = 1; o <= total; o++) {
      const slot = slotForPick(o, teams);
      const pick = state.picks[o - 1];
      const e = state.entrants[slot];
      out.push({
        overall: o,
        round: Math.ceil(o / teams),
        inRound: ((o - 1) % teams) + 1,
        entrantName: e?.name ?? '',
        mine: e?.id === ME,
        player: pick ? players.get(pick.playerId) : undefined,
      });
    }
    return out;
  }, [state.picks, state.config, state.entrants, teams, players]);
  const lastMine = useMemo(() => {
    for (let i = state.picks.length - 1; i >= 0; i--) if (state.picks[i].entrantId === ME) return state.picks[i].overall;
    return -1;
  }, [state.picks]);

  useEffect(() => {
    const idx = Math.max(0, Math.min(cells.length - 1, current - 3));
    ref.current?.scrollToOffset({ offset: idx * W, animated: true });
  }, [current, cells.length]);

  return (
    <FlatList
      ref={ref}
      horizontal
      data={cells}
      keyExtractor={(x) => String(x.overall)}
      showsHorizontalScrollIndicator={false}
      getItemLayout={(_, i) => ({ length: W, offset: W * i, index: i })}
      initialScrollIndex={Math.max(0, Math.min(cells.length - 1, current - 3))}
      contentContainerStyle={{ paddingHorizontal: 8 }}
      style={s.strip}
      windowSize={5}
      extraData={`${current}:${lastMine}:${myTurnNow ? state.clockEndsAt : ''}`}
      renderItem={({ item }) => (
        <StripCell
          cell={item}
          isCurrent={item.overall === current && drafting}
          latestMine={item.overall === lastMine}
          endsAt={item.overall === current && myTurnNow ? state.clockEndsAt : null}
        />
      )}
    />
  );
});

const StripCell = memo(function StripCell({
  cell,
  isCurrent,
  latestMine,
  endsAt,
}: {
  cell: Cell;
  isCurrent: boolean;
  latestMine: boolean;
  endsAt: number | null;
}) {
  const s = useStyles();
  const c = useColors();
  const badge = useApp((st) => st.badge);
  const reduced = useReducedMotion();
  const color = cell.player ? c[cell.player.position] : undefined;
  const fill = useRef(new Animated.Value(cell.player ? 1 : 0)).current;
  const pop = useRef(new Animated.Value(1)).current;
  const dot = useRef(new Animated.Value(latestMine ? 1 : 0)).current;
  const had = useRef(!!cell.player);

  // A new pick: a quick color fill. Your pick also springs in and gets the mint dot.
  useEffect(() => {
    if (!cell.player || had.current) return;
    had.current = true;
    if (reduced) {
      fill.setValue(1);
      return;
    }
    Animated.timing(fill, { toValue: 1, duration: motion.snap.duration, easing: motion.snap.easing, useNativeDriver: NATIVE_DRIVER }).start();
    if (cell.mine) {
      pop.setValue(0.86);
      Animated.spring(pop, { toValue: 1, ...motion.spring, useNativeDriver: NATIVE_DRIVER }).start();
    }
  }, [cell.player, cell.mine, reduced, fill, pop]);

  useEffect(() => {
    if (reduced) return dot.setValue(latestMine ? 1 : 0);
    Animated.spring(dot, { toValue: latestMine ? 1 : 0, ...motion.spring, useNativeDriver: NATIVE_DRIVER }).start();
  }, [latestMine, reduced, dot]);

  return (
    <View style={{ width: W, padding: 3 }}>
      <Animated.View style={[s.cell, cell.mine && s.mine, isCurrent && !endsAt && s.current, { transform: [{ scale: pop }] }]}>
        {color ? (
          <Animated.View pointerEvents="none" style={[s.fill, { backgroundColor: color + '2A', opacity: fill }]} />
        ) : null}
        {endsAt !== null ? <Breath endsAt={endsAt} color={c.accent} radius={10} /> : null}
        <View style={s.topRow}>
          <Text style={[s.pickNo, cell.mine && { color: c.primary }]}>
            {cell.round}.{String(cell.inRound).padStart(2, '0')}
          </Text>
          {cell.mine ? <MeBadge color={badge.color} tag={badge.tag} size={14} /> : null}
        </View>
        {cell.player ? (
          <>
            <Text style={s.player} numberOfLines={1}>
              {shortName(cell.player.name)}
            </Text>
            <Text style={[s.sub, { color }]} numberOfLines={1}>
              {cell.player.position} · {cell.player.team}
            </Text>
          </>
        ) : (
          <>
            <Text style={[s.player, cell.mine && { color: c.primary }]} numberOfLines={1}>
              {cell.mine ? 'You' : cell.entrantName}
            </Text>
            <Text style={s.sub}>{isCurrent ? 'picking' : ' '}</Text>
          </>
        )}
        {cell.mine ? <Animated.View style={[s.dot, { opacity: dot, transform: [{ scale: dot }] }]} /> : null}
      </Animated.View>
    </View>
  );
});

const useStyles = makeStyles((c) => ({
  strip: { flexGrow: 0, paddingVertical: 6 },
  cell: { height: 56, borderRadius: 10, backgroundColor: c.surface, paddingHorizontal: 8, paddingVertical: 6, justifyContent: 'space-between', overflow: 'hidden' },
  fill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  mine: { backgroundColor: c.primary + '1F', borderWidth: 1, borderColor: c.primary + '55' },
  current: { borderWidth: 1, borderColor: c.textMuted },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 10 },
  pickNo: { fontFamily: fonts.mono, fontSize: 10, color: c.textMuted },
  player: { ...type.smallStrong, color: c.text, lineHeight: 16 },
  sub: { ...type.label, fontSize: 10, color: c.textMuted, lineHeight: 12 },
  dot: { position: 'absolute', top: 7, right: 7, width: 7, height: 7, borderRadius: 4, backgroundColor: c.accent },
}));
