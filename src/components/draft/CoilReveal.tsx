import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, ScrollView, Text, View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { rosterOf, type DraftState, type Player } from '../../engine';
import { teamIdentity } from '../../store/results';
import { ME } from '../../store/useApp';
import { motion, NATIVE_DRIVER, useReducedMotion } from '../../theme/motion';
import { fonts, type } from '../../theme/type';
import { makeStyles, useColors } from '../../theme/useTheme';
import { SpringGlyph } from '../SpringGauge';
import { Rattler } from '../Rattler';
import { Button, formatCents, shortName, Sticker, Tap } from '../ui';

const COLS = 6;
const ROW_H = 62;
const PAD_X = 26;
const TOP = 18;

/**
 * "Your coil": the draft-complete moment. A violet line draws through your picks
 * in snake order and ends in the mint dot, so the logo is made of your team.
 * It celebrates the team you built, never the money spent.
 */
export const CoilReveal = memo(function CoilReveal({
  state,
  players,
  onPlay,
  onBoard,
  onDraftAgain,
  springback,
  onSpringback,
}: {
  state: DraftState;
  players: Map<string, Player>;
  onPlay: () => void;
  onBoard: () => void;
  /** Back to this contest's sheet to enter again. */
  onDraftAgain: () => void;
  /** MOCK Springback this entry accrued, and whether its Wednesday has already paid. */
  springback?: { amount: number; paid: boolean };
  onSpringback?: () => void;
}) {
  const s = useStyles();
  const c = useColors();
  const reduced = useReducedMotion();
  const [w, setW] = useState(0);
  const [t, setT] = useState(0);
  const card = useRef(new Animated.Value(0)).current;

  const picks = useMemo(
    () =>
      rosterOf(state, ME)
        .map((p) => ({ pick: p, player: players.get(p.playerId) }))
        .filter((x): x is { pick: typeof x.pick; player: Player } => !!x.player),
    [state, players],
  );
  const id = useMemo(() => teamIdentity(state), [state]);

  const geo = useMemo(() => {
    const n = picks.length;
    if (w <= 0 || n === 0) return null;
    const rows = Math.ceil(n / COLS);
    const step = (w - PAD_X * 2) / (COLS - 1);
    const nodes = picks.map((_, i) => {
      const row = Math.floor(i / COLS);
      const col = i % COLS;
      return { x: PAD_X + (row % 2 === 0 ? col : COLS - 1 - col) * step, y: TOP + row * ROW_H };
    });
    // Polyline through the nodes, with a half-turn where the snake reverses.
    const pts: { x: number; y: number }[] = [];
    nodes.forEach((p, i) => {
      const prev = nodes[i - 1];
      if (prev && prev.y !== p.y) {
        const dir = prev.x > w / 2 ? 1 : -1;
        const r = ROW_H / 2;
        for (let k = 1; k < 16; k++) {
          const a = -Math.PI / 2 + (k / 16) * Math.PI;
          pts.push({ x: prev.x + dir * r * Math.cos(a) * 0.55, y: prev.y + r + r * Math.sin(a) });
        }
      }
      pts.push(p);
    });
    let len = 0;
    const at: number[] = [];
    pts.forEach((p, i) => {
      if (i) len += Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y);
      if (nodes.includes(p)) at.push(len);
    });
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    return { nodes, d, len, at, height: TOP + (rows - 1) * ROW_H + 40 };
  }, [w, picks]);

  // `wind`: draw the path on, then let the identity card spring in.
  useEffect(() => {
    if (!geo) return;
    if (reduced) {
      setT(1);
      card.setValue(1);
      return;
    }
    let raf = 0;
    const start = Date.now();
    const dur = motion.wind.duration + 500;
    const frame = () => {
      const k = Math.min(1, (Date.now() - start) / dur);
      setT(motion.wind.easing(k));
      if (k < 1) raf = requestAnimationFrame(frame);
      else Animated.spring(card, { toValue: 1, ...motion.spring, useNativeDriver: NATIVE_DRIVER }).start();
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [geo, reduced, card]);

  const drawn = geo ? geo.len * t : 0;
  const last = geo?.nodes[geo.nodes.length - 1];

  return (
    <ScrollView contentContainerStyle={s.body} testID="coil-reveal">
      <View>
        <Text style={s.title} accessibilityRole="header">
          Coiled and loaded.
        </Text>
        <Text style={s.sub}>{picks.length} picks, zero lineups to set.</Text>
      </View>

      <View onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width))} style={{ height: geo?.height ?? 180 }}>
        {geo ? (
          <>
            <Svg width={w} height={geo.height} style={{ position: 'absolute' }}>
              <Path d={geo.d} stroke={c.border} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <Path
                d={geo.d}
                stroke={c.primary}
                strokeWidth={8}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                strokeDasharray={`${drawn} ${geo.len + 1}`}
              />
              {geo.nodes.map((p, i) =>
                drawn >= geo.at[i] - 0.5 ? (
                  <Circle key={i} cx={p.x} cy={p.y} r={5} fill={c[picks[i].player.position]} stroke={c.bg} strokeWidth={2} />
                ) : null,
              )}
              {geo.nodes[0] ? (
                // The rattle at pick 1: the path is the logo, made of your team.
                <G transform={`translate(${geo.nodes[0].x - 12} ${geo.nodes[0].y}) rotate(-150)`}>
                  <Rect x={2} y={-5} width={9} height={10} rx={4} fill={c.primary} />
                  <Rect x={11} y={-4.5} width={8} height={9} rx={3.5} fill={c.primary} />
                  <Rect x={19} y={-4} width={7} height={8} rx={3} fill={c.primary} />
                </G>
              ) : null}
            </Svg>
            {t >= 1 && last ? (
              <View style={{ position: 'absolute', left: last.x - 24, top: last.y - 30 }} testID="reveal-clutch">
                <Rattler pose="smug" size={48} />
              </View>
            ) : null}
            {geo.nodes.map((p, i) => (
              <Text
                key={i}
                numberOfLines={1}
                style={[s.node, { left: p.x - 30, top: p.y + 9, opacity: drawn >= geo.at[i] - 0.5 ? 1 : 0.15 }]}
              >
                {shortName(picks[i].player.name)}
              </Text>
            ))}
          </>
        ) : null}
      </View>

      <Animated.View
        style={[s.card, { opacity: card, transform: [{ translateY: card.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }]}
      >
        <Text style={s.kicker}>Your build</Text>
        <Sticker label={id.build} index={1} size={30} style={{ alignSelf: 'flex-start', marginVertical: 8 }} />
        <Text style={s.counts}>
          QB {id.counts.QB} · RB {id.counts.RB} · WR {id.counts.WR} · TE {id.counts.TE}
        </Text>
        {id.tags.length > 1 ? <Text style={s.tags}>Also {id.tags.slice(1).join(' · ')}</Text> : null}
        {id.stack ? <Text style={s.stack}>{id.stack} stack</Text> : null}
        <Text style={s.line}>{id.line}</Text>
      </Animated.View>

      {springback && springback.amount > 0 ? (
        <Tap
          accessibilityRole="button"
          accessibilityLabel={`You earned ${formatCents(springback.amount)} Springback. ${springback.paid ? 'Already landed as credit' : 'Lands Wednesday'}. Mock. Open Springback.`}
          onPress={onSpringback}
          scaleTo={0.99}
          style={s.spring}
          testID="draft-springback"
        >
          <SpringGlyph color={c.primary} size={18} />
          <Text style={s.springText}>
            You earned {formatCents(springback.amount)} Springback.
            <Text style={s.springSub}>{springback.paid ? ' Already landed as entry credit (mock).' : ' Lands Wednesday (mock).'}</Text>
          </Text>
        </Tap>
      ) : null}

      <View style={{ gap: 10 }}>
        <Button label="Draft again" onPress={onDraftAgain} testID="draft-again" />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button variant="secondary" label="Play the season" onPress={onPlay} testID="view-results" style={{ flex: 1 }} />
          <Button variant="ghost" label="Full board" onPress={onBoard} testID="see-board" style={{ flex: 1 }} />
        </View>
      </View>
    </ScrollView>
  );
});

const useStyles = makeStyles((c) => ({
  body: { padding: 20, paddingTop: 12, gap: 20, paddingBottom: 32 },
  title: { ...type.display40, color: c.text },
  sub: { ...type.body, color: c.textMuted, marginTop: 2 },
  node: { position: 'absolute', width: 60, textAlign: 'center', fontFamily: fonts.strong, fontSize: 10, lineHeight: 13, color: c.textMuted },
  card: { borderLeftWidth: 0, borderRadius: 18, backgroundColor: c.surface, padding: 18, gap: 4 },
  spring: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, marginVertical: -8 },
  springText: { ...type.smallStrong, color: c.text, flex: 1 },
  springSub: { ...type.small, color: c.textMuted },
  kicker: { ...type.label, color: c.primary },
  build: { fontFamily: fonts.displayHeavy, fontSize: 44, lineHeight: 46, color: c.text },
  counts: { fontFamily: fonts.mono, fontSize: 12, color: c.textMuted },
  tags: { ...type.smallStrong, color: c.primary, marginTop: 4 },
  stack: { ...type.bodyStrong, color: c.text, marginTop: 8 },
  line: { ...type.body, color: c.textMuted, marginTop: 2 },
}));
