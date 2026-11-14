import { router, type Href } from 'expo-router';
import { memo } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { promoHref, PROMOS, type Promo } from '../data/promos';
import { fonts, type } from '../theme/type';
import { makeStyles, useColors } from '../theme/useTheme';
import { ChevronRight } from './icons';
import { Tap } from './ui';

const CARD_W = 264;
const GAP = 10;

/** Swipeable promo cards. Bleeds to the screen edge so the next card peeks in. */
export const PromoRail = memo(function PromoRail({ hide = [] }: { hide?: string[] }) {
  const s = useStyles();
  const promos = PROMOS.filter((p) => !hide.includes(p.id));
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={CARD_W + GAP}
      decelerationRate="fast"
      style={s.rail}
      contentContainerStyle={s.content}
      testID="promo-rail"
    >
      {promos.map((p) => (
        <PromoCard key={p.id} promo={p} />
      ))}
    </ScrollView>
  );
});

function PromoCard({ promo }: { promo: Promo }) {
  const s = useStyles();
  const c = useColors();
  return (
    <Tap
      testID={`promo-${promo.id}`}
      accessibilityRole="button"
      accessibilityLabel={`${promo.title}. ${promo.body} ${promo.cta}`}
      onPress={() => router.push(promoHref(promo) as Href)}
      scaleTo={0.98}
      style={s.card}
    >
      <View style={s.head}>
        <Text style={s.kicker}>{promo.kicker}</Text>
        <Text style={s.figure}>{promo.figure}</Text>
      </View>
      <Text style={s.title} numberOfLines={1}>
        {promo.title}
      </Text>
      <Text style={s.body} numberOfLines={2}>
        {promo.body}
      </Text>
      <View style={s.cta}>
        <Text style={s.ctaText}>{promo.cta}</Text>
        <ChevronRight color={c.text} size={16} />
      </View>
    </Tap>
  );
}

const useStyles = makeStyles((c) => ({
  rail: { marginHorizontal: -16 },
  content: { paddingHorizontal: 16, gap: GAP },
  card: { width: CARD_W, backgroundColor: c.surface, borderRadius: 18, padding: 14, gap: 4 },
  head: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  kicker: { ...type.label, color: c.textMuted, marginTop: 4 },
  figure: { fontFamily: fonts.displayHeavy, fontSize: 40, lineHeight: 40, color: c.text },
  title: { ...type.bodyStrong, color: c.text, fontSize: 16 },
  body: { ...type.small, color: c.textMuted, minHeight: 36 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 6, minHeight: 28 },
  ctaText: { ...type.smallStrong, color: c.text },
}));
