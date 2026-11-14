import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, ScrollView, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { rosterOf, type DraftState, type Player } from '../../engine';
import { teamIdentity } from '../../store/results';
import { ME } from '../../store/useApp';
import { motion, NATIVE_DRIVER, useReducedMotion } from '../../theme/motion';
import { fonts, type } from '../../theme/type';
import { makeStyles, useColors } from '../../theme/useTheme';
import { Button, shortName } from '../ui';

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
}: {
  state: DraftState;
  players: Map<string, Player>;
  onPlay: () => void;
  onBoard: () => void;
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
              <Path d={geo.d} stroke={c.border} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
              <Path
                d={geo.d}
                stroke={c.primary}
                strokeWidth={3}
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
              {t >= 1 && last ? <Circle cx={last.x} cy={last.y} r={7} fill={c.accent} stroke={c.bg} strokeWidth={2} /> : null}
            </Svg>
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
        <Text style={s.build}>{id.build}</Text>
        <Text style={s.counts}>
          QB {id.counts.QB} · RB {id.counts.RB} · WR {id.counts.WR} · TE {id.counts.TE}
        </Text>
        {id.stack ? <Text style={s.stack}>{id.stack} stack</Text> : null}
        <Text style={s.line}>{id.line}</Text>
      </Animated.View>

      <View style={{ gap: 10 }}>
        <Button label="Play the season" onPress={onPlay} testID="view-results" />
        <Button variant="ghost" label="See the full board" onPress={onBoard} testID="see-board" />
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
  kicker: { ...type.label, color: c.primary },
  build: { fontFamily: fonts.displayHeavy, fontSize: 44, lineHeight: 46, color: c.text },
  counts: { fontFamily: fonts.mono, fontSize: 12, color: c.textMuted },
  stack: { ...type.bodyStrong, color: c.text, marginTop: 8 },
  line: { ...type.body, color: c.textMuted, marginTop: 2 },
}));
