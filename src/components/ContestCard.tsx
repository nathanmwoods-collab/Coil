import { memo } from 'react';
import { Text, View } from 'react-native';

import { isSitAndGo } from '../data';
import type { Contest } from '../engine';
import { makeStyles, useColors } from '../theme/useTheme';
import { Card, clockLabel, clockSpeed, formatMoney, ProgressBar } from './ui';

export const ContestCard = memo(function ContestCard({
  contest,
  myEntries,
  onPress,
  featured,
}: {
  contest: Contest;
  myEntries: number;
  onPress: () => void;
  featured?: boolean;
}) {
  const s = useStyles();
  const c = useColors();
  const filled = Math.min(contest.maxEntries, contest.filled + myEntries);
  const speed = clockSpeed(contest.pickClockSec);
  const isSitGo = isSitAndGo(contest);
  return (
    <Card onPress={onPress} style={[s.card, featured && s.featured]} testID={`contest-${contest.id}`}>
      <View style={s.top}>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={s.badges}>
            {featured ? <Badge text="FLAGSHIP" color={c.accent} /> : null}
            {isSitGo ? <Badge text="SIT & GO" color={c.textMuted} /> : null}
            <Badge text={`${speed.toUpperCase()} · ${clockLabel(contest.pickClockSec)}`} color={speed === 'Fast' ? c.warning : c.primary} />
          </View>
          <Text style={[s.name, featured && s.nameFeatured]} numberOfLines={1}>
            {contest.name}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={s.label}>Prizes</Text>
          <Text style={[s.prize, featured && s.prizeFeatured]}>{formatMoney(contest.prizePool, { compact: true })}</Text>
        </View>
      </View>
      <View style={s.stats}>
        <Stat label="Entry" value={formatMoney(contest.entryFee)} />
        <Stat label="Teams" value={`${contest.teams}`} />
        <Stat label="Rounds" value={`${contest.rounds}`} />
        <Stat label="Max entries" value={`${contest.maxPerUser}`} />
      </View>
      <View style={{ gap: 6 }}>
        <ProgressBar value={filled / contest.maxEntries} color={featured ? c.accent : c.primary} />
        <View style={s.fillRow}>
          <Text style={s.muted}>
            {filled.toLocaleString()} / {contest.maxEntries.toLocaleString()} filled
          </Text>
          {myEntries > 0 ? <Text style={[s.muted, { color: c.accent }]}>{myEntries} entered</Text> : null}
        </View>
      </View>
    </Card>
  );
});

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, backgroundColor: color + '22' }}>
      <Text style={{ color, fontSize: 10, fontWeight: '800', letterSpacing: 0.4 }}>{text}</Text>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const s = useStyles();
  return (
    <View style={{ flex: 1 }}>
      <Text style={s.label}>{label}</Text>
      <Text style={s.statValue}>{value}</Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  card: { gap: 12 },
  featured: { borderColor: c.accent + '88', backgroundColor: c.surfaceAlt, padding: 18 },
  top: { flexDirection: 'row', gap: 12 },
  badges: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  name: { color: c.text, fontSize: 16, fontWeight: '800' },
  nameFeatured: { fontSize: 20 },
  prize: { color: c.text, fontSize: 18, fontWeight: '900' },
  prizeFeatured: { fontSize: 26, color: c.accent },
  label: { color: c.textMuted, fontSize: 11, fontWeight: '600' },
  statValue: { color: c.text, fontSize: 14, fontWeight: '700', marginTop: 2 },
  stats: { flexDirection: 'row' },
  fillRow: { flexDirection: 'row', justifyContent: 'space-between' },
  muted: { color: c.textMuted, fontSize: 12, fontWeight: '600' },
}));
