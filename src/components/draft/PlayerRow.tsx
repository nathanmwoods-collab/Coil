import { memo } from 'react';
import { Text, View } from 'react-native';

import type { Player } from '../../engine';
import { feel } from '../../lib/feel';
import { fonts, type } from '../../theme/type';
import { makeStyles, useColors } from '../../theme/useTheme';
import { QueueMark } from '../icons';
import { PlayerAvatar } from '../PlayerAvatar';
import { PosPill, Tap } from '../ui';

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
      <Tap
        accessibilityRole="button"
        accessibilityLabel={queued ? `Remove ${player.name} from queue` : `Add ${player.name} to queue`}
        accessibilityState={{ selected: queued }}
        onPress={() => {
          feel.select();
          onStar(player.id);
        }}
        style={s.star}
        hitSlop={4}
        scaleTo={0.85}
      >
        <QueueMark color={c.textMuted} filled={queued} fill={c.accent} size={20} />
      </Tap>
      <PlayerAvatar player={player} size={36} />
      <View style={s.main}>
        <View style={s.nameRow}>
          <PosPill pos={player.position} small />
          <Text style={s.name} numberOfLines={1}>
            {player.name}
          </Text>
        </View>
        <View style={s.metaRow}>
          <Text style={s.meta}>
            {player.team} · Bye {player.bye} · {Math.round(player.projPoints)} proj
          </Text>
          {stack ? <Text style={[s.tag, { color: stack === 'QB stack' ? c.primary : c.textMuted }]}>{stack}</Text> : null}
          {exposurePct ? <Text style={s.meta}>· {Math.round(exposurePct)}% exp</Text> : null}
        </View>
      </View>
      <View style={s.adp}>
        <Text style={s.adpValue}>{player.adp.toFixed(1)}</Text>
        <Text style={s.adpLabel}>ADP</Text>
      </View>
      <Tap
        accessibilityRole="button"
        accessibilityLabel={`Draft ${player.name}`}
        accessibilityState={{ disabled: !canDraft }}
        disabled={!canDraft}
        onPress={canDraft ? () => onDraft(player.id) : undefined}
        style={[s.draft, !canDraft && s.draftDisabled]}
      >
        <Text style={[s.draftText, !canDraft && { color: c.textMuted }]}>Draft</Text>
      </Tap>
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
    borderBottomColor: c.border + '99',
    backgroundColor: c.bg,
  },
  star: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  main: { flex: 1, gap: 3, minWidth: 0, marginLeft: 10 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { ...type.bodyStrong, color: c.text, flexShrink: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: { ...type.micro, fontSize: 12, color: c.textMuted },
  tag: { ...type.label },
  adp: { width: 46, alignItems: 'flex-end', marginRight: 10 },
  adpLabel: { ...type.micro, fontSize: 9, color: c.textMuted },
  adpValue: { fontFamily: fonts.mono, fontSize: 14, color: c.text },
  draft: { minWidth: 64, height: 40, borderRadius: 20, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  draftDisabled: { backgroundColor: 'transparent', borderWidth: 1, borderColor: c.border },
  draftText: { fontFamily: fonts.strong, color: c.bg, fontSize: 13 },
}));
