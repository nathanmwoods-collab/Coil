import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { Check, ChevronRight } from '../../components/icons';
import { SpringGlyph } from '../../components/SpringGauge';
import { Button, formatCents, formatMoney, MeBadge, MockNote, Screen, Tap } from '../../components/ui';
import { SEASON_WEEKS } from '../../data';
import { gaugeFor, springLoad } from '../../engine';
import { BADGE_COLORS, springbackPending, useApp, type NotifyPrefs } from '../../store/useApp';
import { ACTIVE_BRAND, BRANDS } from '../../theme/brands';
import { fonts, type } from '../../theme/type';
import { makeStyles, useColors, useTheme, type BrandKey } from '../../theme/useTheme';

const AMOUNTS = [25, 100, 500];

export default function Account() {
  const s = useStyles();
  const c = useColors();
  const brand = useTheme();
  const balance = useApp((st) => st.balance);
  const addFunds = useApp((st) => st.addFunds);
  const override = useApp((st) => st.brandOverride);
  const setBrandOverride = useApp((st) => st.setBrandOverride);
  const haptics = useApp((st) => st.haptics);
  const setHaptics = useApp((st) => st.setHaptics);
  const resetAll = useApp((st) => st.resetAll);
  const drafts = useApp((st) => st.drafts);
  const week = useApp((st) => st.currentWeek);
  const setWeek = useApp((st) => st.setWeek);
  const seasonRake = useApp((st) => st.seasonRake);
  const credit = useApp((st) => st.sbCredit);
  const pending = useApp((st) => springbackPending(st.sbLedger));
  const advanceToWednesday = useApp((st) => st.advanceToWednesday);
  const gauge = gaugeFor(seasonRake);
  const [wedNote, setWedNote] = useState<string | null>(null);
  const [lab, setLab] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const draftCount = useMemo(() => Object.keys(drafts).length, [drafts]);
  const notify = useApp((st) => st.notify);
  const setNotify = useApp((st) => st.setNotify);
  const badge = useApp((st) => st.badge);
  const setBadge = useApp((st) => st.setBadge);
  const [tagDraft, setTagDraft] = useState(badge.tag);
  const activeKey = (override && override in BRANDS ? override : ACTIVE_BRAND) as BrandKey;

  return (
    <Screen>
      <ScrollView contentContainerStyle={s.body}>
        <Text style={s.title}>You</Text>

        <View style={{ gap: 10 }}>
          <View>
            <Text style={s.balance}>{formatMoney(balance)}</Text>
            <Text style={s.label}>Mock balance</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {AMOUNTS.map((a) => (
              <Button key={a} small variant="secondary" label={`Add ${formatMoney(a)}`} onPress={() => addFunds(a)} style={{ flex: 1 }} />
            ))}
          </View>
          <MockNote text="Mock funds for testing only. They have no cash value and cannot be withdrawn." />
        </View>

        <Tap accessibilityRole="button" onPress={() => router.push('/springback')} style={s.spring} testID="springback-row" scaleTo={0.99}>
          <SpringGlyph color={c.primary} load={springLoad(seasonRake)} size={34} />
          <View style={{ flex: 1 }}>
            <Text style={s.springKicker}>Springback</Text>
            <Text style={s.springTitle}>
              {gauge.name} gauge · {gauge.ratePct}% on new rake
            </Text>
            <Text style={s.hint}>
              {pending > 0 ? `${formatCents(pending)} springs back Wednesday.` : 'Rake you pay springs back every Wednesday.'}
              {credit > 0 ? ` ${formatCents(credit)} credit ready.` : ''} Mock.
            </Text>
          </View>
          <ChevronRight color={c.textMuted} size={18} />
        </Tap>

        <View style={{ gap: 12 }} testID="badge-editor">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <MeBadge color={badge.color} tag={badge.tag} size={40} />
            <View style={{ flex: 1 }}>
              <Text style={s.rowLabel}>Your draft badge</Text>
              <Text style={s.hint}>Marks your picks in the pick strip and on the board.</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {BADGE_COLORS.map((col) => (
              <Tap
                key={col}
                accessibilityRole="radio"
                accessibilityState={{ checked: badge.color === col }}
                accessibilityLabel={`Badge colour ${col}`}
                onPress={() => setBadge({ color: col })}
                style={[s.swatch, { backgroundColor: col, borderColor: badge.color === col ? c.text : 'transparent' }]}
                scaleTo={0.9}
              />
            ))}
            <TextInput
              value={tagDraft}
              onChangeText={(t) => setTagDraft(t.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase())}
              onEndEditing={() => {
                setBadge({ tag: tagDraft });
                setTagDraft(useApp.getState().badge.tag);
              }}
              onBlur={() => {
                setBadge({ tag: tagDraft });
                setTagDraft(useApp.getState().badge.tag);
              }}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={2}
              accessibilityLabel="Badge letters"
              style={s.tagInput}
              testID="badge-tag"
            />
          </View>
        </View>

        <View style={s.list}>
          <Text style={s.sectionLabel}>Notifications</Text>
          {(
            [
              ['onClock', "You're on the clock", 'Every pick, in every room.'],
              ['filled', 'Draft filled', 'When a slow room fills and the clock starts.'],
              ['springback', 'Springback landed', 'Wednesdays, when credit arrives (mock).'],
              ['news', 'News on my players', 'Injuries and moves for players on your teams.'],
            ] as [keyof NotifyPrefs, string, string][]
          ).map(([key, label, hint]) => (
            <Switch key={key} label={label} hint={hint} on={notify[key]} onPress={() => setNotify(key, !notify[key])} testID={`notify-${key}`} />
          ))}
          <Text style={[s.hint, { paddingTop: 8 }]}>Saved on this device. The preview doesn't send push yet.</Text>
        </View>

        <View style={s.list}>
          <Tap accessibilityRole="button" onPress={() => router.push('/rankings')} style={s.row} testID="rankings-row" scaleTo={0.99}>
            <View style={{ flex: 1 }}>
              <Text style={s.rowLabel}>Rankings</Text>
              <Text style={s.hint}>Your order for autopick, one list per slate.</Text>
            </View>
            <ChevronRight color={c.textMuted} size={18} />
          </Tap>
          <Switch label="Haptics" hint="A rattle when you're up. A snap when your pick lands." on={haptics} onPress={() => setHaptics(!haptics)} testID="haptics-toggle" />
          <Tap accessibilityRole="button" accessibilityState={{ expanded: lab }} onPress={() => setLab(!lab)} style={s.row} testID="lab-row" scaleTo={0.99}>
            <Text style={[s.rowLabel, { flex: 1 }]}>Lab</Text>
            <Text style={s.rowValue}>{BRANDS[activeKey].name}</Text>
            <View style={{ transform: [{ rotate: lab ? '90deg' : '0deg' }] }}>
              <ChevronRight color={c.textMuted} size={18} />
            </View>
          </Tap>
          {lab ? (
            <View style={{ gap: 8, paddingVertical: 12 }}>
              <View style={s.weekRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.rowLabel}>Season week (mock)</Text>
                  <Text style={s.hint}>{week === 0 ? 'Preseason.' : week >= SEASON_WEEKS ? 'Season over. Results are final.' : `Live standings run through week ${week}.`}</Text>
                </View>
                <Button small variant="secondary" label="Back" disabled={week <= 0} onPress={() => setWeek(week - 1)} testID="week-back" />
                <Text style={s.weekValue} testID="week-value">{week}</Text>
                <Button small variant="secondary" label="Advance" disabled={week >= SEASON_WEEKS} onPress={() => setWeek(week + 1)} testID="week-advance" />
              </View>
              <View style={s.weekRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.rowLabel}>Springback payout (mock)</Text>
                  <Text style={s.hint} testID="wednesday-note">
                    {wedNote ?? (pending > 0 ? `${formatCents(pending)} pending. Skip ahead and pay it.` : 'Nothing pending yet.')}
                  </Text>
                </View>
                <Button
                  small
                  variant="secondary"
                  label="Advance to Wednesday"
                  testID="advance-wednesday"
                  onPress={() => {
                    const paid = advanceToWednesday();
                    setWedNote(paid > 0 ? `Paid ${formatCents(paid)} in credit.` : 'Wednesday came. Nothing to pay.');
                  }}
                />
              </View>
              <Text style={s.hint}>Theme preview, for the team. Only changes this device.</Text>
              {(Object.keys(BRANDS) as BrandKey[]).map((k) => {
                const b = BRANDS[k];
                const active = k === activeKey;
                return (
                  <Pressable
                    key={k}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active }}
                    accessibilityLabel={`${b.name} theme`}
                    onPress={() => setBrandOverride(k === ACTIVE_BRAND ? null : k)}
                    style={[s.brandRow, { backgroundColor: b.colors.bg, borderColor: active ? b.colors.text : c.border }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: b.colors.text, fontFamily: fonts.strong, fontSize: 15 }}>{b.name}</Text>
                      <Text style={{ color: b.colors.textMuted, fontFamily: fonts.body, fontSize: 12 }}>{b.tagline}</Text>
                    </View>
                    <View style={{ width: 28, height: 6, borderRadius: 3, backgroundColor: b.colors.primary }} />
                    <View style={{ width: 28, height: 6, borderRadius: 3, backgroundColor: b.colors.accent }} />
                    {active ? <Check color={b.colors.text} size={18} /> : <View style={{ width: 18 }} />}
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>

        {confirm ? (
          <View style={s.confirm}>
            <Text style={s.confirmText}>
              Wipe {draftCount} {draftCount === 1 ? 'draft' : 'drafts'} and reset your {formatMoney(balance)} mock balance? Can't undo.
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button small variant="secondary" label="Keep everything" onPress={() => setConfirm(false)} style={{ flex: 1 }} />
              <Button
                small
                variant="danger"
                label="Wipe it"
                testID="confirm-reset"
                onPress={() => {
                  resetAll();
                  setConfirm(false);
                }}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        ) : (
          <Button variant="ghost" label="Start over" onPress={() => setConfirm(true)} testID="start-over" />
        )}

        <Text style={s.legal}>
          Not available where prohibited. Mock currency only. {brand.name} is a demo product for simulation and entertainment; no real-money
          contests are offered. Terms · Privacy · Responsible play (placeholders).
        </Text>
      </ScrollView>
    </Screen>
  );
}

function Switch({ label, hint, on, onPress, testID }: { label: string; hint?: string; on: boolean; onPress: () => void; testID?: string }) {
  const s = useStyles();
  const c = useColors();
  return (
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: on }} accessibilityLabel={label} onPress={onPress} style={s.row} testID={testID}>
      <View style={{ flex: 1 }}>
        <Text style={s.rowLabel}>{label}</Text>
        {hint ? <Text style={s.hint}>{hint}</Text> : null}
      </View>
      <View style={[s.track, { backgroundColor: on ? c.accent : c.border }]}>
        <View style={[s.knob, { alignSelf: on ? 'flex-end' : 'flex-start', backgroundColor: on ? c.bg : c.text }]} />
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  body: { padding: 16, gap: 26, paddingBottom: 40 },
  title: { ...type.display40, color: c.text },
  label: { ...type.small, color: c.textMuted },
  balance: { fontFamily: fonts.displayHeavy, fontSize: 56, lineHeight: 58, color: c.text },
  spring: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 18, backgroundColor: c.surface },
  springKicker: { ...type.label, color: c.primary },
  springTitle: { ...type.bodyStrong, color: c.text },
  list: { borderTopWidth: 1, borderTopColor: c.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: c.border },
  rowLabel: { ...type.body, color: c.text },
  rowValue: { fontFamily: fonts.mono, fontSize: 14, color: c.textMuted },
  hint: { ...type.small, color: c.textMuted },
  sectionLabel: { ...type.title, color: c.text, paddingTop: 14, paddingBottom: 2 },
  swatch: { width: 30, height: 30, borderRadius: 10, borderWidth: 2 },
  tagInput: { width: 56, height: 36, borderRadius: 10, borderWidth: 1, borderColor: c.border, color: c.text, fontFamily: fonts.display, fontSize: 20, textAlign: 'center', marginLeft: 'auto' },
  track: { width: 44, height: 26, borderRadius: 13, padding: 3, justifyContent: 'center' },
  knob: { width: 20, height: 20, borderRadius: 10 },
  weekRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 8 },
  weekValue: { fontFamily: fonts.display, fontSize: 26, lineHeight: 28, color: c.text, minWidth: 30, textAlign: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderRadius: 14, borderWidth: 1, minHeight: 60 },
  confirm: { gap: 12, padding: 16, borderRadius: 18, backgroundColor: c.surface },
  confirmText: { ...type.bodyStrong, color: c.text },
  legal: { ...type.micro, color: c.textMuted, lineHeight: 16, textAlign: 'center' },
}));
