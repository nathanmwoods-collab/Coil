import { memo, useMemo } from 'react';
import { FlatList, ScrollView, Text, View } from 'react-native';

import type { DraftState, Player } from '../../engine';
import { ME } from '../../store/useApp';
import { shortName } from '../ui';
import { makeStyles, useColors } from '../../theme/useTheme';

const CELL_W = 76;
const CELL_H = 52;

function overallFor(round: number, slot: number, teams: number) {
  return round % 2 === 1 ? (round - 1) * teams + slot + 1 : (round - 1) * teams + (teams - slot);
}

/** Full snake grid: entrants as columns, rounds as rows, cells tinted by position. */
export const BoardGrid = memo(function BoardGrid({ state, players }: { state: DraftState; players: Map<string, Player> }) {
  const s = useStyles();
  const c = useColors();
  const teams = state.config.teams;
  const rounds = useMemo(() => Array.from({ length: state.config.rounds }, (_, i) => i + 1), [state.config.rounds]);
  const current = state.status === 'drafting' ? state.picks.length + 1 : -1;
  const width = 36 + CELL_W * teams;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ width }}>
      <View style={{ width, flex: 1 }}>
        <View style={s.headerRow}>
          <View style={s.roundCol} />
          {state.entrants.map((e) => (
            <View key={e.id} style={[s.head, e.id === ME && s.headMine]}>
              <Text style={[s.headText, e.id === ME && { color: c.accent }]} numberOfLines={1}>
                {e.id === ME ? 'You' : e.name}
              </Text>
            </View>
          ))}
        </View>
        <FlatList
          data={rounds}
          keyExtractor={(r) => String(r)}
          getItemLayout={(_, i) => ({ length: CELL_H, offset: CELL_H * i, index: i })}
          extraData={state.picks.length}
          renderItem={({ item: round }) => (
            <View style={{ flexDirection: 'row', height: CELL_H }}>
              <View style={s.roundCol}>
                <Text style={s.roundText}>{round}</Text>
                <Text style={s.dir}>{round % 2 === 1 ? '→' : '←'}</Text>
              </View>
              {state.entrants.map((e, slot) => {
                const o = overallFor(round, slot, teams);
                const pick = state.picks[o - 1];
                const pl = pick ? players.get(pick.playerId) : undefined;
                const col = pl ? c[pl.position] : undefined;
                const isCur = o === current;
                return (
                  <View key={e.id} style={{ width: CELL_W, padding: 2 }}>
                    <View
                      style={[
                        s.cell,
                        col ? { backgroundColor: col + '30', borderColor: col + '80' } : null,
                        e.id === ME && !pl ? { borderColor: c.accent + '55' } : null,
                        isCur && { borderColor: c.primary, borderWidth: 2 },
                      ]}
                    >
                      {pl ? (
                        <>
                          <Text style={s.cellName} numberOfLines={1}>
                            {shortName(pl.name)}
                          </Text>
                          <Text style={[s.cellSub, { color: col }]}>
                            {pl.position} {pl.team}
                          </Text>
                        </>
                      ) : (
                        <Text style={s.cellEmpty}>
                          {round}.{String(((o - 1) % teams) + 1).padStart(2, '0')}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        />
      </View>
    </ScrollView>
  );
});

const useStyles = makeStyles((c) => ({
  headerRow: { flexDirection: 'row', height: 34, borderBottomWidth: 1, borderBottomColor: c.border },
  head: { width: CELL_W, justifyContent: 'center', paddingHorizontal: 4 },
  headMine: { backgroundColor: c.surfaceAlt },
  headText: { color: c.textMuted, fontSize: 10, fontWeight: '800', textAlign: 'center' },
  roundCol: { width: 36, alignItems: 'center', justifyContent: 'center' },
  roundText: { color: c.textMuted, fontWeight: '800', fontSize: 12 },
  dir: { color: c.border, fontSize: 10 },
  cell: { flex: 1, borderRadius: 6, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, padding: 4, justifyContent: 'center' },
  cellName: { color: c.text, fontSize: 11, fontWeight: '800' },
  cellSub: { fontSize: 9, fontWeight: '700' },
  cellEmpty: { color: c.border, fontSize: 10, fontWeight: '700', textAlign: 'center' },
}));
