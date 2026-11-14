import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Text, View } from 'react-native';

import { Button, Card, Empty, formatMoney, ordinal, Screen, Segmented } from '../../components/ui';
import { onTheClock, picksUntilTurn, totalPicks } from '../../engine';
import { draftResult } from '../../store/results';
import { contestById, ME, useApp, type DraftEntry } from '../../store/useApp';
import { makeStyles, useColors } from '../../theme/useTheme';

type Tab = 'live' | 'done';

export default function Drafts() {
  const s = useStyles();
  const drafts = useApp((st) => st.drafts);
  const { live, done } = useMemo(() => {
    const all = Object.values(drafts).sort((a, b) => b.createdAt - a.createdAt);
    return { live: all.filter((d) => d.state.status !== 'complete'), done: all.filter((d) => d.state.status === 'complete') };
  }, [drafts]);
  const [tab, setTab] = useState<Tab>(live.length ? 'live' : 'done');
  const data = tab === 'live' ? live : done;

  return (
    <Screen>
      <View style={s.header}>
        <Text style={s.title}>My drafts</Text>
        <Segmented<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { key: 'live', label: 'Live', badge: live.length },
            { key: 'done', label: 'Completed', badge: done.length },
          ]}
        />
      </View>
      <FlatList
        data={data}
        keyExtractor={(d) => d.id}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
        renderItem={({ item }) => (tab === 'live' ? <LiveRow d={item} /> : <DoneRow d={item} />)}
        ListEmptyComponent={
          <Empty
            title={tab === 'live' ? 'No live drafts' : 'No completed teams yet'}
            body={tab === 'live' ? 'Join a draft from the lobby — fast drafts finish in minutes.' : 'Finish a draft and your simulated season shows up here.'}
            action={<Button small label="Go to lobby" onPress={() => router.navigate('/')} />}
          />
        }
      />
    </Screen>
  );
}

function LiveRow({ d }: { d: DraftEntry }) {
  const s = useStyles();
  const c = useColors();
  const contest = contestById(d.contestId);
  const mine = onTheClock(d.state)?.id === ME;
  const until = picksUntilTurn(d.state, ME);
  const total = totalPicks(d.state.config);
  return (
    <Card onPress={() => router.push(`/draft/${d.id}`)} style={[s.row, mine && { borderColor: c.primary }]}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={s.name}>{contest?.name ?? 'Draft'}</Text>
        <Text style={s.meta}>
          {d.state.status === 'filling' ? 'Filling…' : `Pick ${d.state.picks.length + 1} of ${total}`}
          {d.autodraft || d.autopilot ? ' · Autodraft on' : ''}
        </Text>
      </View>
      <View style={[s.pill, { backgroundColor: mine ? c.primary : c.surfaceAlt }]}>
        <Text style={[s.pillText, { color: mine ? c.primaryText : c.text }]}>
          {mine ? 'On the clock' : until === null ? '—' : `Up in ${until}`}
        </Text>
      </View>
    </Card>
  );
}

function DoneRow({ d }: { d: DraftEntry }) {
  const s = useStyles();
  const c = useColors();
  const contest = contestById(d.contestId);
  const r = useMemo(() => draftResult(d), [d]);
  const teams = d.state.config.teams;
  const top = r.myRank === 1;
  return (
    <Card onPress={() => router.push(`/results/${d.id}`)} style={s.row}>
      <View style={[s.rank, { borderColor: top ? c.accent : c.border }]}>
        <Text style={[s.rankNum, top && { color: c.accent }]}>{ordinal(r.myRank)}</Text>
        <Text style={s.rankOf}>of {teams}</Text>
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={s.name} numberOfLines={1}>
          {contest?.name ?? 'Draft'}
        </Text>
        <Text style={s.meta}>
          {r.myTotal.toFixed(1)} pts · {formatMoney(d.entryFee)} entry · {new Date(d.createdAt).toLocaleDateString()}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3, marginTop: 2 }}>
          {r.roster.map((p) => (
            <View key={p.id} style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: c[p.position] }} />
          ))}
        </View>
      </View>
      <Text style={s.chev}>›</Text>
    </Card>
  );
}

const useStyles = makeStyles((c) => ({
  header: { padding: 16, paddingBottom: 4, gap: 12 },
  title: { color: c.text, fontSize: 26, fontWeight: '900' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 72 },
  name: { color: c.text, fontSize: 15, fontWeight: '800' },
  meta: { color: c.textMuted, fontSize: 12 },
  pill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  pillText: { fontSize: 12, fontWeight: '800' },
  rank: { width: 56, height: 56, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  rankNum: { color: c.text, fontSize: 18, fontWeight: '900' },
  rankOf: { color: c.textMuted, fontSize: 10 },
  chev: { color: c.textMuted, fontSize: 24 },
}));
