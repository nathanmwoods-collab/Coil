import { router } from 'expo-router';
import { memo, useMemo, useState } from 'react';
import { FlatList, Text, View } from 'react-native';

import { Button, Chip, Empty, formatMoney, PosPill, ProgressBar, Screen, Tap } from '../../components/ui';
import type { Position } from '../../engine';
import { exposureFor, type ExposureWithDollars } from '../../store/results';
import { useApp, type DraftEntry } from '../../store/useApp';
import { feel } from '../../lib/feel';
import { fonts, type } from '../../theme/type';
import { makeStyles, useColors } from '../../theme/useTheme';

type PosFilter = 'All' | Position;
type Mode = 'pct' | 'dollars';

export default function Exposure() {
  const s = useStyles();
  const c = useColors();
  const doneKey = useApp((st) =>
    Object.values(st.drafts)
      .filter((d) => d.state.status === 'complete')
      .map((d) => d.id)
      .join(','),
  );
  const [pos, setPos] = useState<PosFilter>('All');
  const [mode, setMode] = useState<Mode>('pct');

  const { rows, teams, spent } = useMemo(() => {
    const all = useApp.getState().drafts;
    const done = doneKey ? doneKey.split(',').map((k) => all[k]).filter((x): x is DraftEntry => !!x) : [];
    return { rows: exposureFor(done), teams: done.length, spent: done.reduce((n, d) => n + d.entryFee, 0) };
  }, [doneKey]);

  // "You're the ___ guy": the player you keep coming back to, once there's more than one team to judge by.
  const guy = teams >= 2 ? rows.find((r) => r.pct >= 50) : undefined;

  const filtered = useMemo(() => {
    const list = pos === 'All' ? rows : rows.filter((r) => r.player.position === pos);
    return mode === 'dollars' ? [...list].sort((a, b) => b.dollars - a.dollars) : list;
  }, [rows, pos, mode]);

  return (
    <Screen>
      <View style={s.header}>
        <Text style={s.title}>Exposure</Text>
        <Text style={s.sub}>
          {teams} {teams === 1 ? 'team' : 'teams'} · {formatMoney(spent)} in (mock)
        </Text>
        {guy ? (
          <Text style={s.guy} testID="exposure-guy">
            You're the <Text style={{ color: c[guy.player.position] }}>{guy.player.name}</Text> guy. {guy.count} of {teams} teams.
          </Text>
        ) : null}
      </View>
      <View style={s.controls}>
        {(['All', 'QB', 'RB', 'WR', 'TE'] as PosFilter[]).map((p) => (
          <Chip key={p} label={p} active={pos === p} color={p === 'All' ? undefined : c[p]} onPress={() => setPos(p)} />
        ))}
        <View style={{ flex: 1 }} />
        <Tap
          accessibilityRole="button"
          accessibilityLabel={mode === 'pct' ? 'Show mock dollars' : 'Show percent'}
          onPress={() => {
            feel.select();
            setMode(mode === 'pct' ? 'dollars' : 'pct');
          }}
          style={s.mode}
        >
          <Text style={s.modeText}>{mode === 'pct' ? '%' : '$'}</Text>
        </Tap>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(r) => r.player.id}
        renderItem={({ item }) => <Row r={item} mode={mode} spent={spent} />}
        getItemLayout={(_, i) => ({ length: 60, offset: 60 * i, index: i })}
        contentContainerStyle={{ paddingBottom: 32 }}
        ListEmptyComponent={
          <Empty
            title="Clean slate."
            body="Draft a team and we'll show who you keep coming back to."
            action={<Button small label="Find a pod" onPress={() => router.navigate('/')} />}
          />
        }
      />
    </Screen>
  );
}

const Row = memo(function Row({ r, mode, spent }: { r: ExposureWithDollars; mode: Mode; spent: number }) {
  const s = useStyles();
  const c = useColors();
  const value = mode === 'pct' ? r.pct / 100 : spent ? r.dollars / spent : 0;
  return (
    <View style={s.row}>
      <PosPill pos={r.player.position} small />
      <View style={{ flex: 1, gap: 5 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={s.name} numberOfLines={1}>
            {r.player.name}
          </Text>
          <Text style={s.pct}>{mode === 'pct' ? `${r.pct}%` : formatMoney(r.dollars)}</Text>
        </View>
        <ProgressBar value={value} color={c[r.player.position]} height={4} track={c.border} />
        <Text style={s.meta}>
          {r.player.team} · {r.count} {r.count === 1 ? 'team' : 'teams'} · avg pick {r.avgPick} · ADP {r.player.adp.toFixed(1)}
          {mode === 'pct' ? ` · ${formatMoney(r.dollars)}` : ` · ${r.pct}%`}
        </Text>
      </View>
    </View>
  );
});

const useStyles = makeStyles((c) => ({
  header: { padding: 16, paddingBottom: 8 },
  title: { ...type.display40, color: c.text },
  sub: { ...type.small, color: c.textMuted, marginTop: 2 },
  guy: { ...type.display24, color: c.text, marginTop: 12 },
  controls: { flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingBottom: 10, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: c.border },
  mode: { width: 44, height: 34, borderRadius: 17, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
  modeText: { fontFamily: fonts.mono, color: c.text, fontSize: 14 },
  row: { height: 60, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: c.border + '99' },
  name: { ...type.smallStrong, fontSize: 14, color: c.text, flex: 1 },
  pct: { fontFamily: fonts.mono, color: c.text, fontSize: 14 },
  meta: { ...type.micro, color: c.textMuted },
}));
