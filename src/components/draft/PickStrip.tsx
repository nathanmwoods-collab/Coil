import { memo, useEffect, useMemo, useRef } from 'react';
import { FlatList, Text, View } from 'react-native';

import { slotForPick, totalPicks, type DraftState, type Player } from '../../engine';
import { ME } from '../../store/useApp';
import { shortName } from '../ui';
import { makeStyles, useColors } from '../../theme/useTheme';

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
  const c = useColors();
  const ref = useRef<FlatList<Cell>>(null);
  const teams = state.config.teams;
  const current = state.picks.length + 1;
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
        entrantName: e?.name ?? '—',
        mine: e?.id === ME,
        player: pick ? players.get(pick.playerId) : undefined,
      });
    }
    return out;
  }, [state.picks, state.config, state.entrants, teams, players]);

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
      renderItem={({ item }) => {
        const isCurrent = item.overall === current && state.status === 'drafting';
        const color = item.player ? c[item.player.position] : undefined;
        return (
          <View style={{ width: W, padding: 3 }}>
            <View
              style={[
                s.cell,
                item.mine && s.mine,
                isCurrent && s.current,
                color ? { borderLeftColor: color, borderLeftWidth: 3 } : null,
              ]}
            >
              <Text style={s.pickNo}>
                {item.round}.{String(item.inRound).padStart(2, '0')}
                {isCurrent ? ' · NOW' : ''}
              </Text>
              {item.player ? (
                <>
                  <Text style={s.player} numberOfLines={1}>
                    {shortName(item.player.name)}
                  </Text>
                  <Text style={[s.sub, { color }]} numberOfLines={1}>
                    {item.player.position} · {item.player.team}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={[s.player, item.mine && { color: c.accent }]} numberOfLines={1}>
                    {item.mine ? 'You' : item.entrantName}
                  </Text>
                  <Text style={s.sub}>{isCurrent ? 'on the clock' : 'upcoming'}</Text>
                </>
              )}
            </View>
          </View>
        );
      }}
    />
  );
});

const useStyles = makeStyles((c) => ({
  strip: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: c.border, paddingVertical: 6 },
  cell: { height: 58, borderRadius: 10, backgroundColor: c.surface, padding: 7, justifyContent: 'space-between', borderWidth: 1, borderColor: c.border },
  mine: { backgroundColor: c.surfaceAlt, borderColor: c.accent + '66' },
  current: { borderColor: c.primary, borderWidth: 2 },
  pickNo: { color: c.textMuted, fontSize: 10, fontWeight: '800' },
  player: { color: c.text, fontSize: 13, fontWeight: '800' },
  sub: { color: c.textMuted, fontSize: 10, fontWeight: '700' },
}));
