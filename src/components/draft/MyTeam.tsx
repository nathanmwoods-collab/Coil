import { memo, useMemo } from 'react';
import { SectionList, Text, View } from 'react-native';

import { POSITIONS, rosterOf, type DraftState, type Player, type Position } from '../../engine';
import { ME } from '../../store/useApp';
import { fonts, type } from '../../theme/type';
import { makeStyles, useColors } from '../../theme/useTheme';
import { PlayerAvatar } from '../PlayerAvatar';
import { Empty, PosPill } from '../ui';

export const MyTeam = memo(function MyTeam({ state, players }: { state: DraftState; players: Map<string, Player> }) {
  const s = useStyles();
  const c = useColors();
  const sections = useMemo(() => {
    const picks = rosterOf(state, ME);
    return POSITIONS.map((pos) => ({
      pos,
      data: picks
        .map((p) => ({ pick: p, player: players.get(p.playerId) }))
        .filter((x): x is { pick: typeof x.pick; player: Player } => !!x.player && x.player.position === pos),
    }));
  }, [state, players]);

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
            return (
              <View key={pos} style={s.sumCell}>
                <Text style={[s.sumPos, { color: c[pos] }]}>{pos}</Text>
                <Text style={[s.sumCount, { color: n ? c.text : c.textMuted }]}>{n}</Text>
              </View>
            );
          })}
        </View>
      }
      ListEmptyComponent={<Empty title="Your first pick lands here." />}
      renderSectionHeader={({ section }) => (
        <View style={s.sectionHead}>
          <PosPill pos={section.pos} />
          <Text style={s.sectionText}>{section.data.length}</Text>
        </View>
      )}
      renderItem={({ item }) => (
        <View style={s.row}>
          <Text style={s.pickNo}>
            {item.pick.round}.{String(item.pick.pickInRound).padStart(2, '0')}
          </Text>
          <PlayerAvatar player={item.player} size={32} />
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{item.player.name}</Text>
            <Text style={s.meta}>
              {item.player.team} · Bye {item.player.bye} · ADP {item.player.adp.toFixed(1)}
            </Text>
          </View>
          <Text style={s.proj}>{Math.round(item.player.projPoints)}</Text>
        </View>
      )}
    />
  );
});

const useStyles = makeStyles((c) => ({
  summary: { flexDirection: 'row', gap: 8, padding: 12 },
  sumCell: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  sumPos: { ...type.label },
  sumCount: { fontFamily: fonts.display, fontSize: 32, lineHeight: 34 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
  sectionText: { ...type.micro, color: c.textMuted, fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: c.border + '99' },
  pickNo: { fontFamily: fonts.mono, color: c.textMuted, fontSize: 12, width: 36 },
  name: { ...type.bodyStrong, color: c.text },
  meta: { ...type.micro, color: c.textMuted, fontSize: 12 },
  proj: { fontFamily: fonts.mono, fontSize: 13, color: c.text },
}));
