import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Text, View } from 'react-native';

import { ChevronRight } from '../../components/icons';
import { Button, Card, Empty, formatMoney, formatPts, ordinal, relativeDay, Screen, Segmented } from '../../components/ui';
import { onTheClock, picksUntilTurn, totalPicks } from '../../engine';
import { draftResult } from '../../store/results';
import { contestById, ME, useApp, type DraftEntry } from '../../store/useApp';
import { fonts, type } from '../../theme/type';
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
        <Text style={s.title}>Your drafts</Text>
        <Segmented<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { key: 'live', label: 'Live', badge: live.length },
            { key: 'done', label: 'Finished', badge: done.length },
          ]}
        />
      </View>
      <FlatList
        data={data}
        keyExtractor={(d) => d.id}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}
        renderItem={({ item }) => (tab === 'live' ? <LiveRow d={item} /> : <DoneRow d={item} />)}
        ListEmptyComponent={
          <Empty
            title={tab === 'live' ? 'Nothing on the clock.' : 'No teams in the books.'}
            body={
              tab === 'live'
                ? "30-second pods fill fast. You'll be picking in a minute."
                : "Finish a draft and we'll play out the whole season."
            }
            action={<Button small label="Find a pod" onPress={() => router.navigate('/')} />}
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
    <Card onPress={() => router.push(`/draft/${d.id}`)} style={[s.row, mine && { borderWidth: 1, borderColor: c.accent }]}>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={s.name}>{contest?.name ?? 'Draft'}</Text>
        <Text style={s.meta}>
          {d.state.status === 'filling' ? 'Finding drafters…' : `Pick ${d.state.picks.length + 1} of ${total}`}
          {d.autodraft || d.autopilot ? ' · Autopilot on' : ''}
        </Text>
      </View>
      <Text style={[s.status, { color: mine ? c.accent : c.textMuted }]}>
        {mine ? "You're up" : until === null ? 'Roster full' : `${until} ${until === 1 ? 'pick' : 'picks'} away`}
      </Text>
    </Card>
  );
}

function DoneRow({ d }: { d: DraftEntry }) {
  const s = useStyles();
  const c = useColors();
  const contest = contestById(d.contestId);
  const r = useMemo(() => draftResult(d), [d]);
  const teams = d.state.config.teams;
  return (
    <Card onPress={() => router.push(`/results/${d.id}`)} style={s.row}>
      <View style={s.rank}>
        <Text style={[s.rankNum, r.myRank === 1 && { color: c.accent }]}>{ordinal(r.myRank)}</Text>
        <Text style={s.rankOf}>of {teams}</Text>
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={s.name} numberOfLines={1}>
          {contest?.name ?? 'Draft'}
        </Text>
        <Text style={s.meta}>
          {formatPts(r.myTotal)} pts · {formatMoney(d.entryFee)} · {relativeDay(d.createdAt)}
        </Text>
      </View>
      <ChevronRight color={c.textMuted} size={20} />
    </Card>
  );
}

const useStyles = makeStyles((c) => ({
  header: { padding: 16, paddingBottom: 0, gap: 8 },
  title: { ...type.display40, color: c.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 72 },
  name: { ...type.bodyStrong, color: c.text },
  meta: { ...type.small, color: c.textMuted },
  status: { ...type.smallStrong },
  rank: { width: 52, alignItems: 'center' },
  rankNum: { fontFamily: fonts.display, fontSize: 30, lineHeight: 30, color: c.primary },
  rankOf: { ...type.micro, fontSize: 10, color: c.textMuted },
}));
