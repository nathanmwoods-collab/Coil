import { memo, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, Text, View } from 'react-native';

import type { DraftState, Player } from '../../engine';
import { ME, useApp } from '../../store/useApp';
import { PlayerAvatar } from '../PlayerAvatar';
import { MeBadge, PosPill, shortName, Tap } from '../ui';
import { useReducedMotion } from '../../theme/motion';
import { fonts, type } from '../../theme/type';
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
  const [who, setWho] = useState<string | null>(null);
  const badge = useApp((st) => st.badge);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ width }}>
      <View style={{ width, flex: 1 }}>
        <View style={s.headerRow}>
          <View style={s.roundCol} />
          {state.entrants.map((e) => (
            <Tap
              key={e.id}
              accessibilityRole="button"
              accessibilityLabel={`${e.id === ME ? 'Your' : `${e.name}'s`} roster`}
              onPress={() => setWho(e.id)}
              scaleTo={0.97}
              style={[s.head, e.id === ME && s.headMine]}
              testID={`board-head-${e.id}`}
            >
              {e.id === ME ? (
                <View style={s.headMe}>
                  <MeBadge color={badge.color} tag={badge.tag} size={16} />
                  <Text style={[s.headText, { color: c.primary }]}>You</Text>
                </View>
              ) : (
                <Text style={s.headText} numberOfLines={1}>
                  {e.name}
                </Text>
              )}
            </Tap>
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
                        col ? { backgroundColor: col + '2A', borderColor: e.id === ME ? c.primary : 'transparent' } : null,
                        e.id === ME && !pl ? { borderColor: c.primary + '77', backgroundColor: c.primary + '14' } : null,
                        isCur && { borderColor: c.accent, borderWidth: 2 },
                      ]}
                    >
                      {pl ? (
                        <>
                          <Text style={s.cellName} numberOfLines={1}>
                            {shortName(pl.name)}
                          </Text>
                          {e.id === ME ? (
                            <View style={s.cellBadge}>
                              <MeBadge color={badge.color} tag={badge.tag} size={12} />
                            </View>
                          ) : null}
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
      <RosterSheet state={state} players={players} entrantId={who} onClose={() => setWho(null)} />
    </ScrollView>
  );
});

/** One drafter's team, by round. Opened from the board's column headers. */
function RosterSheet({
  state,
  players,
  entrantId,
  onClose,
}: {
  state: DraftState;
  players: Map<string, Player>;
  entrantId: string | null;
  onClose: () => void;
}) {
  const s = useStyles();
  const reduced = useReducedMotion();
  const e = state.entrants.find((x) => x.id === entrantId);
  const picks = state.picks.filter((p) => p.entrantId === entrantId);
  const counts = { QB: 0, RB: 0, WR: 0, TE: 0 };
  for (const p of picks) {
    const pl = players.get(p.playerId);
    if (pl) counts[pl.position]++;
  }
  return (
    <Modal visible={!!e} transparent animationType={reduced ? 'none' : 'slide'} onRequestClose={onClose}>
      <Pressable style={s.scrim} onPress={onClose} accessibilityLabel="Close roster" />
      {e ? (
        <View style={s.sheet} testID="roster-sheet">
          <Text style={s.sheetTitle}>{e.id === ME ? 'Your team' : e.name}</Text>
          <Text style={s.sheetSub}>
            {picks.length ? `QB ${counts.QB} · RB ${counts.RB} · WR ${counts.WR} · TE ${counts.TE}` : 'No picks yet.'}
          </Text>
          <ScrollView style={{ maxHeight: 420 }}>
            {picks.map((p) => {
              const pl = players.get(p.playerId);
              if (!pl) return null;
              return (
                <View key={p.overall} style={s.rosterRow}>
                  <Text style={s.rosterPick}>
                    {p.round}.{String(p.pickInRound).padStart(2, '0')}
                  </Text>
                  <PlayerAvatar player={pl} size={28} />
                  <Text style={s.rosterName} numberOfLines={1}>
                    {pl.name}
                  </Text>
                  <PosPill pos={pl.position} small />
                </View>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
    </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  headerRow: { flexDirection: 'row', height: 34, borderBottomWidth: 1, borderBottomColor: c.border },
  head: { width: CELL_W, justifyContent: 'center', paddingHorizontal: 4 },
  headMine: { backgroundColor: c.primary + '22' },
  headMe: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  cellBadge: { position: 'absolute', top: 3, right: 3 },
  headText: { ...type.label, color: c.textMuted, fontSize: 10, textAlign: 'center' },
  roundCol: { width: 36, alignItems: 'center', justifyContent: 'center' },
  roundText: { fontFamily: fonts.mono, color: c.textMuted, fontSize: 12 },
  cell: { flex: 1, borderRadius: 6, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, padding: 4, justifyContent: 'center' },
  cellName: { ...type.label, color: c.text },
  cellSub: { ...type.micro, fontSize: 9, lineHeight: 12 },
  scrim: { flex: 1, backgroundColor: '#000000AA' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32, gap: 6 },
  sheetTitle: { ...type.display24, color: c.text },
  sheetSub: { fontFamily: fonts.mono, fontSize: 12, color: c.textMuted, marginBottom: 6 },
  rosterRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, borderBottomWidth: 1, borderBottomColor: c.border + '99' },
  rosterPick: { fontFamily: fonts.mono, fontSize: 12, color: c.textMuted, width: 36 },
  rosterName: { ...type.bodyStrong, color: c.text, flex: 1 },
  cellEmpty: { fontFamily: fonts.mono, color: c.border, fontSize: 10, textAlign: 'center' },
}));
