import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native';

import { Button, Empty, ordinal, PosPill, Screen, Segmented } from '../../components/ui';
import { draftResult, PLAYER_BY_ID, seasonFor } from '../../store/results';
import { contestById, ME, useApp } from '../../store/useApp';
import { makeStyles, useColors } from '../../theme/useTheme';

type Tab = 'weekly' | 'standings' | 'roster';

export default function Results() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const d = useApp((s) => s.drafts[String(id)]);
  const hydrated = useApp((s) => s.hydrated);
  const s = useStyles();
  const c = useColors();
  const [tab, setTab] = useState<Tab>('weekly');
  const [week, setWeek] = useState(0);
  const r = useMemo(() => (d && d.state.status === 'complete' ? draftResult(d) : null), [d]);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/drafts'));

  if (!d || !r) {
    return (
      <Screen>
        <Empty
          title={!hydrated ? 'Loading…' : d ? 'Draft still in progress' : 'Draft not found'}
          action={<Button small label="Back" onPress={back} />}
        />
      </Screen>
    );
  }
  const contest = contestById(d.contestId);
  const wk = r.weeks[week];
  const starterIds = new Set(wk?.starters.map((x) => x.playerId));
  const weekPts = (pid: string) => wk?.starters.find((x) => x.playerId === pid)?.points;
  const bench = r.roster.filter((p) => !starterIds.has(p.id));
  const best = Math.max(...r.weeks.map((w) => w.total));

  return (
    <Screen>
      <View style={s.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={back} style={s.back}>
          <Text style={s.backText}>‹</Text>
        </Pressable>
        <Text style={s.title} numberOfLines={1}>
          {contest?.name ?? 'Results'}
        </Text>
      </View>
      <View style={s.hero}>
        <View style={s.heroCell}>
          <Text style={s.label}>Pod finish</Text>
          <Text style={[s.big, r.myRank === 1 && { color: c.accent }]}>{ordinal(r.myRank)}</Text>
          <Text style={s.label}>of {d.state.config.teams}</Text>
        </View>
        <View style={s.heroCell}>
          <Text style={s.label}>Season points</Text>
          <Text style={s.big}>{r.myTotal.toFixed(1)}</Text>
          <Text style={s.label}>best week {best.toFixed(1)}</Text>
        </View>
      </View>
      <Text style={s.simNote}>Simulated season · results are illustrative</Text>
      <View style={{ paddingHorizontal: 12, paddingBottom: 8 }}>
        <Segmented<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { key: 'weekly', label: 'Weekly' },
            { key: 'standings', label: 'Standings' },
            { key: 'roster', label: 'Roster' },
          ]}
        />
      </View>

      {tab === 'weekly' ? (
        <View style={{ flex: 1 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 0, height: 68 }} contentContainerStyle={s.weeks}>
            {r.weeks.map((w, i) => {
              const active = i === week;
              return (
                <Pressable
                  key={i}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => setWeek(i)}
                  style={[s.week, active && { borderColor: c.primary, backgroundColor: c.primary + '22' }]}
                >
                  <Text style={[s.weekLabel, active && { color: c.text }]}>W{i + 1}</Text>
                  <Text style={[s.weekPts, active && { color: c.primary }]}>{w.total.toFixed(0)}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <FlatList
            data={[...(wk?.starters ?? []).map((x) => ({ id: x.playerId, slot: x.slot as string, counted: true })), ...bench.map((p) => ({ id: p.id, slot: 'BN', counted: false }))]}
            keyExtractor={(x) => x.id}
            contentContainerStyle={{ paddingBottom: 32 }}
            ListHeaderComponent={
              <Text style={s.weekHead}>
                Week {week + 1} · {wk?.total.toFixed(2)} pts · highlighted players counted
              </Text>
            }
            renderItem={({ item }) => {
              const p = PLAYER_BY_ID.get(item.id);
              if (!p) return null;
              const pts = item.counted ? weekPts(item.id) : seasonFor(d.seed)[week]?.[item.id];
              return (
                <View style={[s.row, item.counted ? s.counted : s.benched]}>
                  <Text style={[s.slot, item.counted && { color: c.accent }]}>{item.slot}</Text>
                  <PosPill pos={p.position} small />
                  <Text style={[s.name, !item.counted && { color: c.textMuted }]} numberOfLines={1}>
                    {p.name}
                  </Text>
                  <Text style={s.meta}>{p.team}</Text>
                  <Text style={[s.pts, item.counted ? { color: c.text } : { color: c.textMuted }]}>{pts !== undefined ? pts.toFixed(1) : '—'}</Text>
                </View>
              );
            }}
          />
        </View>
      ) : tab === 'standings' ? (
        <FlatList
          data={r.standings}
          keyExtractor={(x) => x.entrantId}
          contentContainerStyle={{ paddingBottom: 32 }}
          renderItem={({ item }) => {
            const me = item.entrantId === ME;
            return (
              <View style={[s.row, me && s.counted]}>
                <Text style={[s.slot, { width: 34 }]}>{ordinal(item.rank)}</Text>
                <Text style={[s.name, me && { color: c.accent }]} numberOfLines={1}>
                  {me ? 'You' : item.name}
                </Text>
                <Text style={s.pts}>{item.total.toFixed(1)}</Text>
              </View>
            );
          }}
        />
      ) : (
        <FlatList
          data={r.roster}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ paddingBottom: 32 }}
          ListHeaderComponent={<Text style={s.weekHead}>Weeks counted · points contributed to your total</Text>}
          renderItem={({ item: p }) => (
            <View style={s.row}>
              <PosPill pos={p.position} small />
              <Text style={s.name} numberOfLines={1}>
                {p.name}
              </Text>
              <Text style={s.meta}>{r.countedWeeks[p.id] ?? 0} wks</Text>
              <Text style={s.pts}>{(r.countedPoints[p.id] ?? 0).toFixed(1)}</Text>
            </View>
          )}
        />
      )}
    </Screen>
  );
}

const useStyles = makeStyles((c) => ({
  header: { flexDirection: 'row', alignItems: 'center', paddingRight: 16, paddingLeft: 4 },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  backText: { color: c.text, fontSize: 32, lineHeight: 34, fontWeight: '300' },
  title: { color: c.text, fontSize: 18, fontWeight: '800', flex: 1 },
  hero: { flexDirection: 'row', gap: 10, paddingHorizontal: 12, paddingTop: 4 },
  heroCell: { flex: 1, backgroundColor: c.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: c.border, alignItems: 'center' },
  label: { color: c.textMuted, fontSize: 12, fontWeight: '600' },
  big: { color: c.text, fontSize: 30, fontWeight: '900' },
  simNote: { color: c.textMuted, fontSize: 11, textAlign: 'center', paddingVertical: 8 },
  weeks: { paddingHorizontal: 12, paddingVertical: 8, gap: 6, alignItems: 'center' },
  week: { width: 52, height: 52, borderRadius: 12, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
  weekLabel: { color: c.textMuted, fontSize: 11, fontWeight: '800' },
  weekPts: { color: c.text, fontSize: 14, fontWeight: '800' },
  weekHead: { color: c.textMuted, fontSize: 12, paddingHorizontal: 16, paddingVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: c.border },
  counted: { backgroundColor: c.primary + '18', borderLeftWidth: 3, borderLeftColor: c.accent },
  benched: { opacity: 0.7 },
  slot: { color: c.textMuted, fontSize: 11, fontWeight: '800', width: 38 },
  name: { color: c.text, fontSize: 14, fontWeight: '700', flex: 1 },
  meta: { color: c.textMuted, fontSize: 12 },
  pts: { color: c.text, fontSize: 14, fontWeight: '800', width: 52, textAlign: 'right', fontVariant: ['tabular-nums'] },
}));
