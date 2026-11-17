import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { Close } from '../../components/icons';
import { Button, Empty, MockNote, Screen, Tap } from '../../components/ui';
import { promoById } from '../../data/promos';
import { fonts, type } from '../../theme/type';
import { makeStyles, useColors } from '../../theme/useTheme';

export default function PromoDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useStyles();
  const c = useColors();
  const promo = promoById(String(id));

  if (!promo) {
    return (
      <Screen>
        <Empty title="That offer's gone." action={<Button label="Back to the lobby" onPress={() => router.back()} />} />
      </Screen>
    );
  }
  return (
    <Screen edges={['top', 'bottom']}>
      <View style={s.grabber} />
      <View style={s.topRow}>
        <Tap accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} style={s.close}>
          <Close color={c.textMuted} size={22} />
        </Tap>
      </View>
      <ScrollView contentContainerStyle={s.body}>
        <Text style={s.kicker}>{promo.kicker}</Text>
        <Text style={s.figure}>{promo.figure}</Text>
        <Text style={s.title}>{promo.title}</Text>
        <Text style={s.p}>{promo.body}</Text>
        <View style={s.list}>
          {(promo.details ?? []).map((d, i) => (
            <View key={i} style={s.item}>
              <Text style={s.n}>{i + 1}</Text>
              <Text style={[s.p, { flex: 1 }]}>{d}</Text>
            </View>
          ))}
        </View>
        <MockNote text="Mock credit only. No cash value. Terms shown here are placeholders." />
      </ScrollView>
      <View style={s.footer}>
        <Button variant="secondary" label="Got it. Find a pod" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

const useStyles = makeStyles((c) => ({
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: c.border, marginTop: 8 },
  topRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 8 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 20, paddingTop: 0, gap: 10 },
  kicker: { ...type.label, color: c.textMuted },
  figure: { fontFamily: fonts.displayHeavy, fontSize: 72, lineHeight: 72, color: c.text },
  title: { ...type.display32, color: c.text },
  p: { ...type.body, color: c.textMuted, lineHeight: 22 },
  list: { marginTop: 10, borderTopWidth: 1, borderTopColor: c.border },
  item: { flexDirection: 'row', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border },
  n: { fontFamily: fonts.mono, fontSize: 13, color: c.primary, width: 16, lineHeight: 22 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: c.border },
}));
