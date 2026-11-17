import { memo, useMemo } from 'react';
import { Text, View } from 'react-native';

import { totalPicks, upcomingPicksFor, type DraftState } from '../../engine';
import { ME } from '../../store/useApp';
import { fonts } from '../../theme/type';
import { useColors } from '../../theme/useTheme';
import { SnakeFill, type Bead } from '../SnakeFill';

/**
 * Draft progress as a coil: one hump per round, filled to the room's current
 * pick in muted ink (the room's progress, not yours). Your picks ride on it as
 * violet beads: solid once made, hollow rings still to come, and the next one
 * bigger once you're within three picks.
 */
export const DraftCoil = memo(function DraftCoil({ state, compact, label }: { state: DraftState; compact?: boolean; label?: string }) {
  const c = useColors();
  const total = totalPicks(state.config);
  const done = state.status === 'complete' ? total : state.picks.length;
  const beads = useMemo<Bead[]>(() => {
    const made = state.picks.filter((p) => p.entrantId === ME).map((p) => ({ at: (p.overall - 1) / (total - 1), color: c.primary, solid: true }));
    const next = state.status === 'complete' ? [] : upcomingPicksFor(state, ME);
    const soon = next.length > 0 && next[0] - (state.picks.length + 1) < 3;
    return [...made, ...next.map((o, i) => ({ at: (o - 1) / (total - 1), color: c.primary, big: i === 0 && soon }))];
  }, [state, total, c.primary]);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} accessibilityLabel={`Pick ${Math.min(done + 1, total)} of ${total}`}>
      <View style={{ flex: 1 }}>
        <SnakeFill
          value={done / total}
          color={c.textMuted}
          track={c.border}
          humps={state.config.rounds}
          amp={compact ? 2.4 : 3.6}
          height={compact ? 12 : 16}
          strokeWidth={compact ? 1.6 : 2}
          head="none"
          beads={beads}
        />
      </View>
      {label ? <Text style={{ fontFamily: fonts.mono, fontSize: compact ? 10 : 11, color: c.textMuted }}>{label}</Text> : null}
    </View>
  );
});
