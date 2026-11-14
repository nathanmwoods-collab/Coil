import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native';

import { ChevronLeft } from '../../components/icons';
import { Button, Empty, formatPts, ordinal, PosPill, Screen, Segmented, Tap, WindingUp } from '../../components/ui';
import { feel } from '../../lib/feel';
import { draftResult, PLAYER_BY_ID, seasonFor } from '../../store/results';
import { contestById, ME, useApp } from '../../store/useApp';
import { fonts, type } from '../../theme/type';
import { makeStyles, useColors } from '../../theme/useTheme';

type Tab = 'weekly' | 'standings' | 'roster';

export default function Results() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const d = useApp((s) => s.drafts[String(id)]);
  const hydrated = useApp((s) => s.hydrated);
  const s = useStyles();
  const c = useColors();
  const [tab, setTab] = useState<Tab>('weekly');
  const [week, setWeek] = useState<number | null>(null);
  const r = useMemo(() => (d && d.state.status === 'complete' ? draftResult(d) : null), [d]);
  // The ceiling week: the one that wins tournaments. It opens selected.
  const ceiling = useMemo(() => (r ? r.weeks.reduce((bi, w, i, all) => (w.total > all[bi].total ? i : bi), 0) : 0), [r]);
  useEffect(() => {
    if (r) feel.ceiling();
  }, [r]);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/drafts'));

  if (!d || !r) {
    return (
      <Screen>
        {!hydrated ? (
          <WindingUp />
        ) : (
          <Empty
            title={d ? 'Still drafting this one.' : "That draft's gone."}
            action={<Button small label="Back to your drafts" onPress={() => router.replace('/drafts')} />}
          />
        )}
      </Screen>
    );
  }
  const contest = contestById(d.contestId);
  const weekIdx = week ?? ceiling;
  const wk = r.weeks[weekIdx];
  const starterIds = new Set(wk?.starters.map((x) => x.playerId));
  const weekPts = (pid: string) => wk?.starters.find((x) => x.playerId === pid)?.points;
  const bench = r.roster.filter((p) => !starterIds.has(p.id));
  const best = r.weeks[ceiling]?.total ?? 0;

  return (
    <Screen>
      <View style={s.header}>
        <Tap accessibilityRole="button" accessibilityLabel="Back to your drafts" onPress={back} style={s.back}>
          <ChevronLeft color={c.text} />
        </Tap>
        <Text style={s.title} numberOfLines={1}>
          {contest?.name ?? 'Results'}
        </Text>
      </View>
      <View style={s.hero}>
        <View style={{ flex: 1 }}>
          <Text style={[s.big, { color: r.myRank === 1 ? c.accent : c.primary }]}>{ordinal(r.myRank)}</Text>
          <Text style={s.label}>Finished, of {d.state.config.teams}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={s.big}>{formatPts(r.myTotal)}</Text>
          <Text style={s.label}>
            Ceiling: W{ceiling + 1} · {formatPts(best)}
          </Text>
        </View>
      </View>
      <Text style={s.simNote}>Simulated season. Results are illustrative.</Text>
      <View style={{ paddingHorizontal: 12 }}>
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
              const active = i === weekIdx;
              const top = i === ceiling;
              return (
                <Pressable
                  key={i}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Week ${i + 1}, ${formatPts(w.total)} points${top ? ', ceiling week' : ''}`}
                  onPress={() => {
                    if (!active) top ? feel.ceiling() : feel.select();
                    setWeek(i);
                  }}
                  style={[s.week, active && { backgroundColor: c.surfaceAlt, borderColor: c.text }]}
                >
                  <Text style={[s.weekLabel, active && { color: c.text }]}>W{i + 1}</Text>
                  <Text style={[s.weekPts, top && { color: c.accent }]}>{w.total.toFixed(0)}</Text>
                  {top ? <View style={s.ceilDot} /> : null}
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
                {weekIdx === ceiling
                  ? `W${weekIdx + 1} popped for ${formatPts(wk?.total ?? 0)}. That's the week tournaments are won.`
                  : `Week ${weekIdx + 1} · ${formatPts(wk?.total ?? 0)} · these ${wk?.starters.length ?? 0} counted`}
              </Text>
            }
            renderItem={({ item }) => {
              const p = PLAYER_BY_ID.get(item.id);
              if (!p) return null;
              const pts = item.counted ? weekPts(item.id) : seasonFor(d.seed)[weekIdx]?.[item.id];
              return (
                <View style={[s.row, !item.counted && s.benched]}>
                  <Text style={[s.slot, item.counted && { color: c.text }]}>{item.slot}</Text>
                  <PosPill pos={p.position} small />
                  <Text style={[s.name, !item.counted && { color: c.textMuted }]} numberOfLines={1}>
                    {p.name}
                  </Text>
                  {item.counted && pts !== undefined && pts >= 25 ? <Text style={s.sprung}>Sprung</Text> : null}
                  <Text style={s.meta}>{p.team}</Text>
                  <Text style={[s.pts, item.counted ? { color: c.text } : { color: c.textMuted }]}>{pts !== undefined ? formatPts(pts) : '0.0'}</Text>
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
              <View style={[s.row, me && s.mine]}>
                <Text style={[s.slot, { width: 34 }]}>{ordinal(item.rank)}</Text>
                <Text style={[s.name, me && { color: c.primary }]} numberOfLines={1}>
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
          ListHeaderComponent={<Text style={s.weekHead}>How often each guy made your lineup</Text>}
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
  title: { ...type.title, color: c.text, flex: 1 },
  hero: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 20, paddingTop: 8 },
  label: { ...type.small, color: c.textMuted },
  big: { fontFamily: fonts.displayHeavy, fontSize: 56, lineHeight: 58, color: c.text },
  simNote: { ...type.micro, color: c.textMuted, paddingHorizontal: 20, paddingTop: 6, paddingBottom: 4 },
  weeks: { paddingHorizontal: 12, paddingVertical: 8, gap: 6, alignItems: 'center' },
  week: { width: 52, height: 52, borderRadius: 14, borderWidth: 1, borderColor: 'transparent', backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' },
  ceilDot: { position: 'absolute', top: 5, right: 5, width: 6, height: 6, borderRadius: 3, backgroundColor: c.accent },
  sprung: { ...type.label, color: c.accent },
  mine: { backgroundColor: c.primary + '1F' },
  weekLabel: { ...type.label, color: c.textMuted },
  weekPts: { fontFamily: fonts.mono, color: c.text, fontSize: 14 },
  weekHead: { ...type.small, color: c.textMuted, paddingHorizontal: 16, paddingVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: c.border + '99' },
  benched: { opacity: 0.55 },
  slot: { ...type.label, color: c.textMuted, width: 38 },
  name: { ...type.smallStrong, fontSize: 14, color: c.text, flex: 1 },
  meta: { ...type.micro, fontSize: 12, color: c.textMuted },
  pts: { fontFamily: fonts.mono, color: c.text, fontSize: 14, width: 52, textAlign: 'right' },
}));
