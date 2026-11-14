import { memo } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

import type { Player } from '../../engine';
import { makeStyles, useColors } from '../../theme/useTheme';
import { Empty, PosPill } from '../ui';

export const QueueList = memo(function QueueList({
  queue,
  players,
  canDraft,
  onMove,
  onRemove,
  onDraft,
}: {
  queue: string[];
  players: Map<string, Player>;
  canDraft: boolean;
  onMove: (id: string, dir: -1 | 1) => void;
  onRemove: (id: string) => void;
  onDraft: (id: string) => void;
}) {
  const s = useStyles();
  const c = useColors();
  return (
    <FlatList
      data={queue}
      keyExtractor={(id) => id}
      contentContainerStyle={{ paddingBottom: 32 }}
      ListHeaderComponent={
        queue.length ? <Text style={s.hint}>Autopick takes the first eligible player in your queue.</Text> : undefined
      }
      ListEmptyComponent={<Empty title="Your queue is empty" body="Tap ☆ on any player to queue them. When your clock runs out, we pick from here first." />}
      renderItem={({ item: id, index }) => {
        const p = players.get(id);
        if (!p) return null;
        return (
          <View style={s.row}>
            <Text style={s.idx}>{index + 1}</Text>
            <View style={{ flex: 1, gap: 3 }}>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <PosPill pos={p.position} small />
                <Text style={s.name} numberOfLines={1}>
                  {p.name}
                </Text>
              </View>
              <Text style={s.meta}>
                {p.team} · Bye {p.bye} · ADP {p.adp.toFixed(1)}
              </Text>
            </View>
            <IconBtn label="▲" a11y={`Move ${p.name} up`} disabled={index === 0} onPress={() => onMove(id, -1)} />
            <IconBtn label="▼" a11y={`Move ${p.name} down`} disabled={index === queue.length - 1} onPress={() => onMove(id, 1)} />
            <IconBtn label="✕" a11y={`Remove ${p.name}`} color={c.danger} onPress={() => onRemove(id)} />
            {canDraft ? (
              <Pressable accessibilityRole="button" onPress={() => onDraft(id)} style={s.draft}>
                <Text style={s.draftText}>Draft</Text>
              </Pressable>
            ) : null}
          </View>
        );
      }}
    />
  );
});

function IconBtn({ label, a11y, onPress, disabled, color }: { label: string; a11y: string; onPress: () => void; disabled?: boolean; color?: string }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      onPress={disabled ? undefined : onPress}
      style={{ width: 40, height: 44, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.25 : 1 }}
    >
      <Text style={{ color: color ?? c.textMuted, fontSize: 14, fontWeight: '800' }}>{label}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  hint: { color: c.textMuted, fontSize: 12, padding: 12, paddingBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 60, paddingLeft: 12, paddingRight: 8, borderBottomWidth: 1, borderBottomColor: c.border },
  idx: { color: c.textMuted, width: 24, fontWeight: '800' },
  name: { color: c.text, fontSize: 15, fontWeight: '700', flexShrink: 1 },
  meta: { color: c.textMuted, fontSize: 12 },
  draft: { height: 40, paddingHorizontal: 10, borderRadius: 10, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
  draftText: { color: c.primaryText, fontWeight: '800', fontSize: 12 },
}));
