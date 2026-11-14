import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { Player } from '../../engine';
import { makeStyles, useColors } from '../../theme/useTheme';
import { PosPill } from '../ui';

export type StackTag = 'QB stack' | 'Stack' | null;

export const PLAYER_ROW_HEIGHT = 64;

export const PlayerRow = memo(function PlayerRow({
  player,
  queued,
  canDraft,
  stack,
  exposurePct,
  onDraft,
  onStar,
}: {
  player: Player;
  queued: boolean;
  canDraft: boolean;
  stack: StackTag;
  exposurePct?: number;
  onDraft: (id: string) => void;
  onStar: (id: string) => void;
}) {
  const s = useStyles();
  const c = useColors();
  return (
    <View style={s.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={queued ? `Remove ${player.name} from queue` : `Add ${player.name} to queue`}
        onPress={() => onStar(player.id)}
        style={s.star}
        hitSlop={4}
      >
        <Text style={{ fontSize: 20, color: queued ? c.warning : c.border }}>{queued ? '★' : '☆'}</Text>
      </Pressable>
      <View style={s.main}>
        <View style={s.nameRow}>
          <PosPill pos={player.position} small />
          <Text style={s.name} numberOfLines={1}>
            {player.name}
          </Text>
        </View>
        <View style={s.metaRow}>
          <Text style={s.meta}>
            {player.team} · Bye {player.bye} · Proj {Math.round(player.projPoints)}
          </Text>
          {stack ? (
            <View style={[s.tag, { backgroundColor: (stack === 'QB stack' ? c.accent : c.primary) + '26' }]}>
              <Text style={[s.tagText, { color: stack === 'QB stack' ? c.accent : c.primary }]}>{stack}</Text>
            </View>
          ) : null}
          {exposurePct ? <Text style={s.meta}>· {Math.round(exposurePct)}% exp</Text> : null}
        </View>
      </View>
      <View style={s.adp}>
        <Text style={s.adpLabel}>ADP</Text>
        <Text style={s.adpValue}>{player.adp.toFixed(1)}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Draft ${player.name}`}
        accessibilityState={{ disabled: !canDraft }}
        onPress={canDraft ? () => onDraft(player.id) : undefined}
        style={({ pressed }) => [s.draft, !canDraft && s.draftDisabled, pressed && canDraft && { opacity: 0.8 }]}
      >
        <Text style={[s.draftText, !canDraft && { color: c.textMuted }]}>Draft</Text>
      </Pressable>
    </View>
  );
});

const useStyles = makeStyles((c) => ({
  row: {
    height: PLAYER_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    backgroundColor: c.bg,
  },
  star: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  main: { flex: 1, gap: 4, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { color: c.text, fontSize: 15, fontWeight: '700', flexShrink: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: { color: c.textMuted, fontSize: 12 },
  tag: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  tagText: { fontSize: 10, fontWeight: '800' },
  adp: { width: 48, alignItems: 'flex-end', marginRight: 10 },
  adpLabel: { color: c.textMuted, fontSize: 9, fontWeight: '700' },
  adpValue: { color: c.text, fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },
  draft: { minWidth: 64, height: 44, borderRadius: 10, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' },
  draftDisabled: { backgroundColor: c.surfaceAlt },
  draftText: { color: c.primaryText, fontWeight: '800', fontSize: 13 },
}));
