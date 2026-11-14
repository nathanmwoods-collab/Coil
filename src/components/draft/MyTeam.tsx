import { memo, useMemo } from 'react';
import { SectionList, Text, View } from 'react-native';

import { POSITIONS, rosterOf, type DraftState, type Player, type Position } from '../../engine';
import { ME } from '../../store/useApp';
import { fonts, type } from '../../theme/type';
import { makeStyles, useColors } from '../../theme/useTheme';
import { Empty, PosPill } from '../ui';

/** Typical best-ball build ranges for an 18-round draft, scaled to the draft's rounds. */
export function rosterTargets(rounds: number): Record<Position, [number, number]> {
  const k = rounds / 18;
  const r = (lo: number, hi: number, min: number): [number, number] => [Math.max(min, Math.round(lo * k)), Math.max(min, Math.round(hi * k))];
  return { QB: r(2, 3, 1), RB: r(5, 7, 2), WR: r(7, 9, 3), TE: r(2, 3, 1) };
}

export const MyTeam = memo(function MyTeam({ state, players }: { state: DraftState; players: Map<string, Player> }) {
  const s = useStyles();
  const c = useColors();
  const targets = useMemo(() => rosterTargets(state.config.rounds), [state.config.rounds]);
  const sections = useMemo(() => {
    const picks = rosterOf(state, ME);
    return POSITIONS.map((pos) => ({
      pos,
      data: picks
        .map((p) => ({ pick: p, player: players.get(p.playerId) }))
        .filter((x): x is { pick: typeof x.pick; player: Player } => !!x.player && x.player.position === pos),
    }));
  }, [state, players]);
  const total = sections.reduce((n, x) => n + x.data.length, 0);

  return (
    <SectionList
      sections={sections}
      keyExtractor={(x) => x.player.id}
      stickySectionHeadersEnabled={false}
      contentContainerStyle={{ paddingBottom: 32 }}
      ListHeaderComponent={
        <View style={s.summary}>
          {POSITIONS.map((pos) => {
            const n = sections.find((x) => x.pos === pos)?.data.length ?? 0;
            const [lo, hi] = targets[pos];
            const color = n < lo ? c.textMuted : n > hi ? c.warning : c.text;
            return (
              <View key={pos} style={s.sumCell}>
                <Text style={[s.sumPos, { color: c[pos] }]}>{pos}</Text>
                <Text style={[s.sumCount, { color }]}>{n}</Text>
                <Text style={s.sumTarget}>
                  aim for {lo} to {hi}
                </Text>
              </View>
            );
          })}
        </View>
      }
      ListEmptyComponent={<Empty title="Your first pick lands here." />}
      renderSectionHeader={({ section }) => (
        <View style={s.sectionHead}>
          <PosPill pos={section.pos} />
          <Text style={s.sectionText}>
            {section.data.length} of {targets[section.pos][0]} to {targets[section.pos][1]}
          </Text>
          {total === 0 ? null : <View style={{ flex: 1 }} />}
        </View>
      )}
      renderItem={({ item }) => (
        <View style={s.row}>
          <Text style={s.pickNo}>
            {item.pick.round}.{String(item.pick.pickInRound).padStart(2, '0')}
          </Text>
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{item.player.name}</Text>
            <Text style={s.meta}>
              {item.player.team} · Bye {item.player.bye} · ADP {item.player.adp.toFixed(1)}
              {item.pick.auto ? ' · autopick' : ''}
            </Text>
          </View>
          <Text style={s.proj}>{Math.round(item.player.projPoints)}</Text>
        </View>
      )}
      renderSectionFooter={({ section }) =>
        section.data.length === 0 ? <Text style={s.none}>Open</Text> : null
      }
    />
  );
});

const useStyles = makeStyles((c) => ({
  summary: { flexDirection: 'row', gap: 8, padding: 12 },
  sumCell: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  sumPos: { ...type.label },
  sumCount: { fontFamily: fonts.display, fontSize: 32, lineHeight: 34 },
  sumTarget: { ...type.micro, color: c.textMuted, fontSize: 10 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
  sectionText: { ...type.micro, color: c.textMuted, fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: c.border + '99' },
  pickNo: { fontFamily: fonts.mono, color: c.textMuted, fontSize: 12, width: 40 },
  name: { ...type.bodyStrong, color: c.text },
  meta: { ...type.micro, color: c.textMuted, fontSize: 12 },
  proj: { fontFamily: fonts.mono, fontSize: 13, color: c.text },
  none: { ...type.micro, color: c.textMuted, fontSize: 12, paddingHorizontal: 16, paddingBottom: 4 },
}));
