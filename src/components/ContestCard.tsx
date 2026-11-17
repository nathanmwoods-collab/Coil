import { memo } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { isSitAndGo } from '../data';
import type { Contest } from '../engine';
import { fonts, type } from '../theme/type';
import { makeStyles, useColors } from '../theme/useTheme';
import { ScalePattern } from './ScalePattern';
import { SnakeFill } from './SnakeFill';
import { clockLabel, formatMoney, Sticker, Tap } from './ui';

/**
 * Three lobby shapes so the lobby has three rhythms, not one:
 * the flagship is a ticket, timed pods are tight cards, sit-and-gos are rows
 * of seats. The flagship prize is the lobby's one loud colour.
 */
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
  if (featured) return <Ticket contest={contest} myEntries={myEntries} onPress={onPress} />;
  if (isSitAndGo(contest)) return <SeatRow contest={contest} myEntries={myEntries} onPress={onPress} />;
  return <PodCard contest={contest} myEntries={myEntries} onPress={onPress} />;
});

type Props = { contest: Contest; myEntries: number; onPress: () => void };

const seats = (contest: Contest, myEntries: number) => {
  const filled = Math.min(contest.maxEntries, contest.filled + myEntries);
  return { filled, left: contest.maxEntries - filled };
};

function seatsLine(left: number) {
  if (left === 0) return 'Full';
  if (left >= 1000) return `${(left / 1000).toFixed(1)}K seats left`;
  if (left < 100) return `${left} ${left === 1 ? 'seat' : 'seats'}. Going.`;
  return `${left.toLocaleString()} seats left`;
}

function Ticket({ contest, myEntries, onPress }: Props) {
  const s = useStyles();
  const c = useColors();
  const { filled, left } = seats(contest, myEntries);
  return (
    <View style={s.ticketWrap}>
      <Tap onPress={onPress} accessibilityRole="button" scaleTo={0.985} style={s.ticket} testID={`contest-${contest.id}`}>
        <View style={s.ticketTop}>
          <ScalePattern width={190} height={130} id="ticket-scales" opacity={0.07} />
          <Text style={s.ticketName} numberOfLines={2}>
            {contest.name}
          </Text>
          <Text style={s.ticketPrize} accessibilityLabel={`Prize pool ${formatMoney(contest.prizePool)}`}>
            {formatMoney(contest.prizePool, { compact: true })}
          </Text>
          <Text style={s.ticketLong}>{formatMoney(contest.prizePool)} prize pool (mock)</Text>
        </View>
        <View style={s.perf}>
          <View style={[s.notch, { left: -10, backgroundColor: c.bg }]} />
          <View style={s.perfLine} />
          <View style={[s.notch, { right: -10, backgroundColor: c.bg }]} />
        </View>
        <View style={s.stub}>
          <Text style={s.meta}>
            {formatMoney(contest.entryFee)} · {clockLabel(contest.pickClockSec)} picks · {contest.rounds} rounds
          </Text>
          <SnakeFill value={filled / contest.maxEntries} color={c.accent} track={c.border} height={16} amp={4} />
          <View style={s.fillRow}>
            <Text style={s.seats}>{seatsLine(left)}</Text>
            {myEntries > 0 ? <Text style={s.mine}>You're in ×{myEntries}</Text> : null}
          </View>
        </View>
      </Tap>
      <Sticker label="Main event" index={0} style={s.sticker} />
    </View>
  );
}

function ClockGlyph({ color }: { color: string }) {
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24">
      <Circle cx={12} cy={13} r={8.5} stroke={color} strokeWidth={2.4} fill="none" />
      <Path d="M12 9v4.5l3 2M9.5 2.5h5" stroke={color} strokeWidth={2.4} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

function PodCard({ contest, myEntries, onPress }: Props) {
  const s = useStyles();
  const c = useColors();
  const { filled, left } = seats(contest, myEntries);
  const fast = contest.pickClockSec <= 120;
  return (
    <Tap onPress={onPress} accessibilityRole="button" scaleTo={0.98} style={s.pod} testID={`contest-${contest.id}`}>
      <View style={s.podTop}>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={s.clockRow}>
            <ClockGlyph color={fast ? c.accent : c.textMuted} />
            <Text style={[s.clock, { color: fast ? c.accent : c.textMuted }]}>{clockLabel(contest.pickClockSec)}</Text>
            <Text style={s.meta}>· {formatMoney(contest.entryFee)}</Text>
          </View>
          <Text style={s.podName} numberOfLines={1}>
            {contest.name}
          </Text>
        </View>
        <Text style={s.podPrize} accessibilityLabel={`Prize pool ${formatMoney(contest.prizePool)}`}>
          {formatMoney(contest.prizePool, { compact: true })}
        </Text>
      </View>
      <SnakeFill value={filled / contest.maxEntries} color={c.textMuted} track={c.border} />
      <View style={s.fillRow}>
        <Text style={s.seats}>{seatsLine(left)}</Text>
        {myEntries > 0 ? <Text style={s.mine}>You're in ×{myEntries}</Text> : null}
      </View>
    </Tap>
  );
}

/** A room filling up is people sitting down: one pip per seat. */
function SeatRow({ contest, myEntries, onPress }: Props) {
  const s = useStyles();
  const c = useColors();
  const { filled, left } = seats(contest, myEntries);
  return (
    <Tap
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${contest.name}, ${formatMoney(contest.entryFee)}, ${filled} of ${contest.maxEntries} seats taken`}
      scaleTo={0.99}
      style={s.row}
      testID={`contest-${contest.id}`}
    >
      <View style={{ flex: 1, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <Text style={s.rowName} numberOfLines={1}>
            {contest.name}
          </Text>
          <Text style={s.meta}>
            {formatMoney(contest.entryFee)} · {clockLabel(contest.pickClockSec)}
          </Text>
        </View>
        <View style={s.pips}>
          {Array.from({ length: contest.maxEntries }, (_, i) => (
            <View
              key={i}
              style={[
                s.pip,
                i < filled
                  ? { backgroundColor: i >= filled - myEntries ? c.primary : c.text, borderColor: 'transparent' }
                  : { borderColor: c.textMuted },
              ]}
            />
          ))}
          <Text style={s.pipText}>{left === 0 ? 'Full' : left === 1 ? 'One seat' : `${left} open`}</Text>
        </View>
      </View>
      <Text style={s.rowPrize}>{formatMoney(contest.prizePool, { compact: true })}</Text>
    </Tap>
  );
}

const useStyles = makeStyles((c) => ({
  ticketWrap: { paddingTop: 12 },
  ticket: { backgroundColor: c.surface, borderRadius: 22 },
  ticketTop: { padding: 20, paddingTop: 26, gap: 2, overflow: 'hidden', borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  ticketName: { ...type.display40, color: c.text },
  ticketPrize: { fontFamily: fonts.displayHeavy, fontSize: 64, lineHeight: 64, color: c.accent, marginTop: 8 },
  ticketLong: { fontFamily: fonts.mono, fontSize: 11, color: c.textMuted },
  perf: { height: 20, justifyContent: 'center' },
  perfLine: { marginHorizontal: 18, borderTopWidth: 1.5, borderStyle: 'dashed', borderColor: '#F4F3FF40' },
  notch: { position: 'absolute', top: 0, width: 20, height: 20, borderRadius: 10 },
  stub: { padding: 20, paddingTop: 6, gap: 10 },
  sticker: { position: 'absolute', top: 0, left: 16 },
  pod: { backgroundColor: c.surfaceAlt, borderRadius: 14, padding: 14, gap: 10 },
  podTop: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  clockRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  clock: { fontFamily: fonts.mono, fontSize: 13 },
  podName: { ...type.bodyStrong, color: c.text, fontSize: 16 },
  podPrize: { fontFamily: fonts.display, fontSize: 24, lineHeight: 26, color: c.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border },
  rowName: { ...type.bodyStrong, color: c.text, flexShrink: 1 },
  rowPrize: { fontFamily: fonts.mono, fontSize: 14, color: c.text },
  pips: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  pip: { width: 9, height: 9, borderRadius: 5, borderWidth: 1.3 },
  pipText: { ...type.micro, color: c.textMuted, marginLeft: 4 },
  meta: { ...type.small, color: c.textMuted },
  fillRow: { flexDirection: 'row', justifyContent: 'space-between' },
  seats: { ...type.micro, color: c.textMuted },
  mine: { ...type.label, color: c.primary },
}));
