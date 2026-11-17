import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Text, TextInput, View } from 'react-native';

import { Close } from '../components/icons';
import { Button, Chip, Empty, Screen, Tap } from '../components/ui';
import { formatTeamName, NAME_SEPARATOR, NAME_TOKENS, type NameToken } from '../engine';
import { feel } from '../lib/feel';
import { renameSelection } from '../lib/renameSelection';
import { namingContext } from '../store/results';
import { teamName, useApp } from '../store/useApp';
import { fonts, type } from '../theme/type';
import { makeStyles, useColors } from '../theme/useTheme';

/** Bulk rename: build a pattern from tokens, see every new name, then apply. */
export default function Rename() {
  const s = useStyles();
  const c = useColors();
  const drafts = useApp((st) => st.drafts);
  const renameTeams = useApp((st) => st.renameTeams);
  const [ids] = useState(renameSelection);
  const [pattern, setPattern] = useState<NameToken[]>(['archetype', 'stack']);
  const [lead, setLead] = useState('');

  // Oldest first, so the counter follows the order the teams were drafted.
  const teams = useMemo(
    () =>
      ids
        .map((id) => drafts[id])
        .filter((d) => !!d)
        .sort((a, b) => a.createdAt - b.createdAt)
        .map((d) => ({ d, ctx: namingContext(d) })),
    [ids, drafts],
  );
  const preview = useMemo(
    () => teams.map((t, i) => ({ id: t.d.id, was: teamName(t.d), next: formatTeamName(pattern, t.ctx, i, lead) })),
    [teams, pattern, lead],
  );
  const n = teams.length;
  const ready = n > 0 && preview.every((p) => p.next.length > 0);
  const clashes = new Set(preview.map((p) => p.next)).size < n;

  if (!n) {
    return (
      <Screen>
        <Empty title="No teams picked." body="Pick teams in Drafts, then name them." action={<Button label="Back to drafts" onPress={() => router.back()} />} />
      </Screen>
    );
  }

  const toggle = (t: NameToken) => {
    feel.select();
    setPattern((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));
  };
  const apply = () => {
    renameTeams(Object.fromEntries(preview.map((p) => [p.id, p.next])));
    feel.entered();
    router.back();
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={s.grabber} />
      <View style={s.topRow}>
        <Tap accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} style={s.close}>
          <Close color={c.textMuted} size={22} />
        </Tap>
      </View>
      <FlatList
        data={preview}
        keyExtractor={(p) => p.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.body}
        ListHeaderComponent={
          <View style={{ gap: 16, marginBottom: 6 }}>
            <Text style={s.title}>{n === 1 ? 'Name this team' : `Name ${n} teams`}</Text>
            <View style={{ gap: 8 }}>
              <Text style={s.label}>Build the name. Tap in the order you want.</Text>
              <View style={s.chips}>
                {NAME_TOKENS.map((t) => {
                  const at = pattern.indexOf(t.key);
                  return <Chip key={t.key} label={at >= 0 ? `${at + 1}  ${t.label}` : t.label} active={at >= 0} onPress={() => toggle(t.key)} />;
                })}
              </View>
            </View>
            <TextInput
              value={lead}
              onChangeText={setLead}
              placeholder="Your own words first (optional)"
              placeholderTextColor={c.textMuted}
              style={s.input}
              maxLength={32}
              autoCorrect={false}
              testID="rename-lead"
            />
            <Text style={s.pattern} testID="rename-pattern">
              {[lead.trim() && 'Your words', ...pattern.map((t) => NAME_TOKENS.find((x) => x.key === t)?.label)].filter(Boolean).join(NAME_SEPARATOR) ||
                'Pick at least one piece.'}
            </Text>
            <Text style={s.section}>Preview</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={s.row}>
            <Text style={s.next} numberOfLines={2} testID="rename-preview">
              {item.next || '…'}
            </Text>
            <Text style={s.was} numberOfLines={1}>
              was {item.was}
            </Text>
          </View>
        )}
      />
      <View style={s.footer}>
        {clashes && ready ? <Text style={s.note}>Some names match. Add the counter to tell them apart.</Text> : null}
        <Button testID="rename-apply" label={n === 1 ? 'Rename team' : `Rename ${n} teams`} onPress={apply} disabled={!ready} />
      </View>
    </Screen>
  );
}

const useStyles = makeStyles((c) => ({
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: c.border, marginTop: 8 },
  topRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 8 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 20, paddingTop: 0, paddingBottom: 24 },
  title: { ...type.display40, color: c.text },
  label: { ...type.small, color: c.textMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: { height: 46, borderRadius: 14, backgroundColor: c.surface, color: c.text, paddingHorizontal: 14, fontSize: 15, fontFamily: fonts.body },
  pattern: { fontFamily: fonts.mono, fontSize: 12, color: c.textMuted },
  section: { ...type.title, color: c.text, marginTop: 4 },
  row: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border + '99', gap: 2 },
  next: { ...type.bodyStrong, color: c.text },
  was: { ...type.micro, fontSize: 12, color: c.textMuted },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: c.border, gap: 8 },
  note: { ...type.small, color: c.warning },
}));
