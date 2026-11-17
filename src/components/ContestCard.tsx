import { memo } from 'react';
import { Text, View } from 'react-native';

import { isSitAndGo } from '../data';
import type { Contest } from '../engine';
import { fonts, type } from '../theme/type';
import { makeStyles, useColors } from '../theme/useTheme';
import { SnakeFill } from './SnakeFill';
import { Card, clockLabel, formatMoney } from './ui';

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
  const left = contest.maxEntries - filled;
  const sitGo = isSitAndGo(contest);
  const meta = [
    ...(featured ? ['Main event'] : []),
    formatMoney(contest.entryFee),
    sitGo ? 'Sit & go' : `${contest.teams}-team pods`,
    `${clockLabel(contest.pickClockSec)} picks`,
  ].join(' · ');
  return (
    <Card onPress={onPress} style={[s.card, featured && s.featured]} testID={`contest-${contest.id}`}>
      <View style={s.top}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[s.name, featured && s.nameFeatured]} numberOfLines={featured ? 2 : 1}>
            {contest.name}
          </Text>
          {featured ? null : (
            <Text style={s.meta} numberOfLines={1}>
              {meta}
            </Text>
          )}
        </View>
        <Text
          style={[s.prize, featured && s.prizeFeatured]}
          accessibilityLabel={`Prize pool ${formatMoney(contest.prizePool)}`}
        >
          {formatMoney(contest.prizePool, { compact: true })}
        </Text>
      </View>
      {featured ? <Text style={s.meta}>{meta}</Text> : null}
      <SnakeFill value={filled / contest.maxEntries} color={featured ? c.accent : c.textMuted} track={c.border} />
      <View style={s.fillRow}>
        <Text style={s.seats}>
          {left === 0 ? 'Full' : `${left.toLocaleString()} ${left === 1 ? 'seat' : 'seats'} left`}
        </Text>
        {myEntries > 0 ? <Text style={s.mine}>You're in ×{myEntries}</Text> : null}
      </View>
    </Card>
  );
});

const useStyles = makeStyles((c) => ({
  card: { gap: 10, paddingVertical: 14 },
  featured: { padding: 18, gap: 12, borderWidth: 1, borderColor: c.accent + '55' },
  top: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  name: { ...type.bodyStrong, color: c.text, fontSize: 16 },
  nameFeatured: { ...type.display32, color: c.text },
  meta: { ...type.small, color: c.textMuted },
  prize: { fontFamily: fonts.display, fontSize: 26, lineHeight: 28, color: c.text },
  prizeFeatured: { fontFamily: fonts.displayHeavy, fontSize: 44, lineHeight: 44, color: c.text },
  fillRow: { flexDirection: 'row', justifyContent: 'space-between' },
  seats: { ...type.micro, color: c.textMuted },
  mine: { ...type.label, color: c.primary },
}));
