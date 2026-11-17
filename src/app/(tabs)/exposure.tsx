import { router } from 'expo-router';
import { memo, useMemo, useState } from 'react';
import { FlatList, ScrollView, Text, View } from 'react-native';

import { Button, Chip, Empty, formatMoney, PosPill, ProgressBar, Screen, Tap } from '../../components/ui';
import { SPORTS } from '../../data';
import { exposureHeadline, type Position, type Sport } from '../../engine';
import { exposureFor, type ExposureWithDollars } from '../../store/results';
import { contestById, useApp, type DraftEntry } from '../../store/useApp';
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
  const [sport, setSport] = useState<Sport>('nfl');
  const [fee, setFee] = useState<number | null>(null);
  const [contest, setContest] = useState<string | null>(null);

  const done = useMemo(() => {
    const all = useApp.getState().drafts;
    return doneKey ? doneKey.split(',').map((k) => all[k]).filter((x): x is DraftEntry => !!x) : [];
  }, [doneKey]);
  // Filter options come from the teams you actually have in this sport.
  const inSport = useMemo(() => done.filter((d) => (contestById(d.contestId)?.sport ?? 'nfl') === sport), [done, sport]);
  const fees = useMemo(() => [...new Set(inSport.map((d) => d.entryFee))].sort((a, b) => a - b), [inSport]);
  const contests = useMemo(
    () => [...new Set(inSport.map((d) => d.contestId))].map((id) => ({ id, name: contestById(id)?.name ?? 'Contest' })),
    [inSport],
  );

  const { rows, teams, spent } = useMemo(() => {
    const picked = inSport.filter((d) => (fee === null || d.entryFee === fee) && (contest === null || d.contestId === contest));
    return { rows: exposureFor(picked), teams: picked.length, spent: picked.reduce((n, d) => n + d.entryFee, 0) };
  }, [inSport, fee, contest]);

  // "You're the ___ guy", only once there are enough teams for it to mean something.
  const headline = exposureHeadline(rows, teams);

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
        {headline?.kind === 'guy' ? (
          <Text style={s.guy} testID="exposure-guy">
            You're the <Text style={{ color: c[headline.row.player.position] }}>{headline.row.player.name}</Text> guy.{' '}
            {headline.row.count} of {teams} teams.
          </Text>
        ) : headline?.kind === 'early' ? (
          <Text style={[s.guy, { color: c.textMuted }]} testID="exposure-early">
            {headline.text}
          </Text>
        ) : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filters} style={{ flexGrow: 0, flexShrink: 0, minHeight: 44 }}>
        {SPORTS.map((sp) => (
          <Chip
            key={sp.key}
            label={sp.label}
            active={sport === sp.key}
            onPress={() => {
              setSport(sp.key);
              setFee(null);
              setContest(null);
            }}
          />
        ))}
        {fees.length > 1 ? (
          <>
            <View style={s.sep} />
            {fees.map((f) => (
              <Chip key={f} label={formatMoney(f)} active={fee === f} onPress={() => setFee(fee === f ? null : f)} />
            ))}
          </>
        ) : null}
        {contests.length > 1 ? (
          <>
            <View style={s.sep} />
            {contests.map((x) => (
              <Chip key={x.id} label={x.name} active={contest === x.id} onPress={() => setContest(contest === x.id ? null : x.id)} />
            ))}
          </>
        ) : null}
      </ScrollView>
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
        renderItem={({ item }) => <Row r={item} mode={mode} spent={spent} teams={teams} />}
        getItemLayout={(_, i) => ({ length: 60, offset: 60 * i, index: i })}
        contentContainerStyle={{ paddingBottom: 32 }}
        ListEmptyComponent={
          <Empty
            title={sport === 'nfl' ? 'Clean slate.' : `No ${SPORTS.find((x) => x.key === sport)?.label} teams yet.`}
            body="Draft a team and we'll show who you keep coming back to."
            action={<Button small label="Find a pod" onPress={() => router.navigate('/')} />}
          />
        }
      />
    </Screen>
  );
}

const Row = memo(function Row({ r, mode, spent, teams }: { r: ExposureWithDollars; mode: Mode; spent: number; teams: number }) {
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
          {r.player.team} · {r.count} of {teams} · pick {Math.round(r.avgPick)}
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
  filters: { flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingBottom: 10, alignItems: 'center' },
  sep: { width: 1, height: 20, backgroundColor: c.border, marginHorizontal: 4 },
  controls: { flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingBottom: 10, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: c.border },
  mode: { width: 44, height: 34, borderRadius: 17, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' },
  modeText: { fontFamily: fonts.mono, color: c.text, fontSize: 14 },
  row: { height: 60, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: c.border + '99' },
  name: { ...type.smallStrong, fontSize: 14, color: c.text, flex: 1 },
  pct: { fontFamily: fonts.mono, color: c.text, fontSize: 14 },
  meta: { ...type.micro, color: c.textMuted },
}));
