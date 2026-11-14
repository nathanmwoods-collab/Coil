import { router } from 'expo-router';
import { memo, useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

import { Button, Chip, Empty, formatMoney, PosPill, ProgressBar, Screen } from '../../components/ui';
import type { Position } from '../../engine';
import { exposureFor, type ExposureWithDollars } from '../../store/results';
import { useApp, type DraftEntry } from '../../store/useApp';
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

  const filtered = useMemo(() => {
    const list = pos === 'All' ? rows : rows.filter((r) => r.player.position === pos);
    return mode === 'dollars' ? [...list].sort((a, b) => b.dollars - a.dollars) : list;
  }, [rows, pos, mode]);

  return (
    <Screen>
      <View style={s.header}>
        <Text style={s.title}>Exposure</Text>
        <Text style={s.sub}>
          {teams} completed {teams === 1 ? 'team' : 'teams'} · {formatMoney(spent)} mock entry fees
        </Text>
      </View>
      <View style={s.controls}>
        {(['All', 'QB', 'RB', 'WR', 'TE'] as PosFilter[]).map((p) => (
          <Chip key={p} label={p} active={pos === p} color={p === 'All' ? undefined : c[p]} onPress={() => setPos(p)} />
        ))}
        <View style={{ flex: 1 }} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={mode === 'pct' ? 'Show mock dollars' : 'Show percent'}
          onPress={() => setMode(mode === 'pct' ? 'dollars' : 'pct')}
          style={s.mode}
        >
          <Text style={s.modeText}>{mode === 'pct' ? '%' : '$'}</Text>
        </Pressable>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(r) => r.player.id}
        renderItem={({ item }) => <Row r={item} mode={mode} spent={spent} />}
        getItemLayout={(_, i) => ({ length: 60, offset: 60 * i, index: i })}
        contentContainerStyle={{ paddingBottom: 32 }}
        ListEmptyComponent={
          <Empty
            title="No exposure yet"
            body="Complete a draft and we’ll track how much of your portfolio each player makes up."
            action={<Button small label="Find a draft" onPress={() => router.navigate('/')} />}
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
        <ProgressBar value={value} color={c[r.player.position]} height={5} />
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
  title: { color: c.text, fontSize: 26, fontWeight: '900' },
  sub: { color: c.textMuted, fontSize: 13, marginTop: 2 },
  controls: { flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingBottom: 10, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: c.border },
  mode: { width: 44, height: 36, borderRadius: 10, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  modeText: { color: c.text, fontWeight: '900', fontSize: 15 },
  row: { height: 60, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: c.border },
  name: { color: c.text, fontSize: 14, fontWeight: '700', flex: 1 },
  pct: { color: c.text, fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },
  meta: { color: c.textMuted, fontSize: 11 },
}));
