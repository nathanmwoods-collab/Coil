import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { INJURY_LABEL, injuryFor, newsFor } from '../../data/news';
import type { Player } from '../../engine';
import { useReducedMotion } from '../../theme/motion';
import { fonts, type } from '../../theme/type';
import { makeStyles, useColors } from '../../theme/useTheme';
import { PlayerAvatar } from '../PlayerAvatar';
import { Button, PosPill, relativeDay } from '../ui';

/**
 * Tap a player: team, bye, ADP, injury status and news. News is sample data
 * until the feed in docs/data-sources.md exists, and says so on the sheet.
 */
export function PlayerSheet({
  player,
  adp,
  queued,
  canDraft,
  onClose,
  onDraft,
  onQueue,
}: {
  player: Player | null;
  adp?: number;
  queued?: boolean;
  canDraft?: boolean;
  onClose: () => void;
  onDraft?: (id: string) => void;
  onQueue?: (id: string) => void;
}) {
  const s = useStyles();
  const c = useColors();
  const reduced = useReducedMotion();
  const p = player;
  const inj = p ? injuryFor(p.id) : null;
  const news = p ? newsFor(p.id) : [];
  return (
    <Modal visible={!!p} transparent animationType={reduced ? 'none' : 'slide'} onRequestClose={onClose}>
      <Pressable style={s.scrim} onPress={onClose} accessibilityLabel="Close player" />
      {p ? (
        <View style={s.sheet} testID="player-sheet">
          <View style={s.grab} />
          <View style={s.top}>
            <PlayerAvatar player={p} size={56} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={s.name}>{p.name}</Text>
              <View style={s.metaRow}>
                <PosPill pos={p.position} small />
                <Text style={s.meta}>
                  {p.team} · Bye {p.bye}
                </Text>
              </View>
            </View>
          </View>

          <View style={s.facts}>
            <Fact label="ADP" value={(adp ?? p.adp).toFixed(1)} />
            <Fact label="Proj" value={String(Math.round(p.projPoints))} />
            <Fact
              label="Status"
              value={inj ? inj.status : 'Healthy'}
              color={inj ? (inj.status === 'Q' ? c.warning : c.danger) : c.text}
            />
          </View>
          {inj ? (
            <Text style={s.injury}>
              {INJURY_LABEL[inj.status]}, {inj.detail.toLowerCase()}.
            </Text>
          ) : null}

          <View style={s.newsHead}>
            <Text style={s.newsTitle}>News</Text>
            <Text style={s.sample}>Sample news, not real reporting</Text>
          </View>
          <ScrollView style={{ maxHeight: 200 }} contentContainerStyle={{ gap: 12 }}>
            {news.length ? (
              news.map((n) => (
                <View key={n.id} style={s.item}>
                  <Text style={s.itemTitle}>{n.title}</Text>
                  {n.summary ? <Text style={s.itemSummary}>{n.summary}</Text> : null}
                  <Text style={s.itemSource}>
                    {n.source} · {relativeDay(n.at)}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={s.quiet}>Nothing new on him.</Text>
            )}
          </ScrollView>

          <View style={s.actions}>
            {onQueue ? (
              <Button
                variant="secondary"
                label={queued ? 'Unqueue' : 'Queue him'}
                onPress={() => onQueue(p.id)}
                style={{ flex: 1 }}
                testID="sheet-queue"
              />
            ) : null}
            {onDraft && canDraft ? (
              <Button
                label={`Draft ${p.name.split(' ')[0]}`}
                onPress={() => {
                  onDraft(p.id);
                  onClose();
                }}
                style={{ flex: 1 }}
                testID="sheet-draft"
              />
            ) : null}
          </View>
        </View>
      ) : null}
    </Modal>
  );
}

function Fact({ label, value, color }: { label: string; value: string; color?: string }) {
  const s = useStyles();
  return (
    <View style={s.fact}>
      <Text style={[s.factValue, color ? { color } : null]}>{value}</Text>
      <Text style={s.factLabel}>{label}</Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  scrim: { flex: 1, backgroundColor: '#000000AA' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingTop: 10, paddingBottom: 32, gap: 14 },
  grab: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: c.border },
  top: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  name: { ...type.display32, color: c.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  meta: { ...type.small, color: c.textMuted },
  facts: { flexDirection: 'row', gap: 24 },
  fact: { gap: 2 },
  factValue: { fontFamily: fonts.mono, fontSize: 18, color: c.text },
  factLabel: { ...type.micro, color: c.textMuted },
  injury: { ...type.smallStrong, color: c.text, marginTop: -6 },
  newsHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: c.border, paddingTop: 12 },
  newsTitle: { ...type.title, color: c.text },
  sample: { ...type.micro, color: c.warning },
  item: { gap: 2 },
  itemTitle: { ...type.bodyStrong, color: c.text },
  itemSummary: { ...type.small, color: c.text },
  itemSource: { ...type.micro, color: c.textMuted },
  quiet: { ...type.small, color: c.textMuted },
  actions: { flexDirection: 'row', gap: 10 },
}));
