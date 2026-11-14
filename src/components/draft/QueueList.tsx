import { memo, type ReactNode } from 'react';
import { FlatList, Text, View } from 'react-native';

import type { Player } from '../../engine';
import { feel } from '../../lib/feel';
import { fonts, type } from '../../theme/type';
import { makeStyles, useColors } from '../../theme/useTheme';
import { ArrowDown, ArrowUp, Close } from '../icons';
import { Empty, PosPill, Tap } from '../ui';

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
      ListHeaderComponent={queue.length ? <Text style={s.hint}>Top of the queue goes first.</Text> : undefined}
      ListEmptyComponent={<Empty title="Queue's empty." body="Star a few guys. If your clock runs out, autopick starts here." />}
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
            <IconBtn
              a11y={`Move ${p.name} up`}
              disabled={index === 0}
              onPress={() => {
                feel.nudge();
                onMove(id, -1);
              }}
            >
              <ArrowUp color={c.textMuted} size={18} />
            </IconBtn>
            <IconBtn
              a11y={`Move ${p.name} down`}
              disabled={index === queue.length - 1}
              onPress={() => {
                feel.nudge();
                onMove(id, 1);
              }}
            >
              <ArrowDown color={c.textMuted} size={18} />
            </IconBtn>
            <IconBtn a11y={`Remove ${p.name}`} onPress={() => onRemove(id)}>
              <Close color={c.textMuted} size={18} />
            </IconBtn>
            {canDraft ? (
              <Tap accessibilityRole="button" accessibilityLabel={`Draft ${p.name}`} onPress={() => onDraft(id)} style={s.draft}>
                <Text style={s.draftText}>Draft</Text>
              </Tap>
            ) : null}
          </View>
        );
      }}
    />
  );
});

function IconBtn({ children, a11y, onPress, disabled }: { children: ReactNode; a11y: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={a11y}
      disabled={disabled}
      onPress={disabled ? undefined : onPress}
      style={{ width: 40, height: 44, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.25 : 1 }}
    >
      {children}
    </Tap>
  );
}

const useStyles = makeStyles((c) => ({
  hint: { ...type.small, color: c.textMuted, padding: 12, paddingBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 60, paddingLeft: 12, paddingRight: 8, borderBottomWidth: 1, borderBottomColor: c.border + '99' },
  idx: { fontFamily: fonts.mono, fontSize: 13, color: c.textMuted, width: 24 },
  name: { ...type.bodyStrong, color: c.text, flexShrink: 1 },
  meta: { ...type.micro, fontSize: 12, color: c.textMuted },
  draft: { height: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
  draftText: { fontFamily: fonts.strong, color: c.bg, fontSize: 13 },
}));
