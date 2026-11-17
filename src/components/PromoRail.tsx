import { router, type Href } from 'expo-router';
import { memo } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { promoHref, PROMOS, type Promo } from '../data/promos';
import { gaugeFor } from '../engine';
import { springbackPending, useApp } from '../store/useApp';
import { fonts, type } from '../theme/type';
import { makeStyles, useColors } from '../theme/useTheme';
import { ChevronRight } from './icons';
import { SpringGlyph } from './SpringGauge';
import { formatCents, Tap } from './ui';

const CARD_W = 264;
const GAP = 10;

/** Swipeable promo cards. Bleeds to the screen edge so the next card peeks in. */
export const PromoRail = memo(function PromoRail({ hide = [] }: { hide?: string[] }) {
  const s = useStyles();
  // Once Springback is live for this user (something pending or credit to spend), its card leads the rail.
  const live = useApp((st) => st.sbCredit > 0 || springbackPending(st.sbLedger) > 0);
  const shown = PROMOS.filter((p) => !hide.includes(p.id));
  const promos = live ? [...shown].sort((a, b) => Number(b.action.type === 'springback') - Number(a.action.type === 'springback')) : shown;
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
      {promos.map((p) => (p.action.type === 'springback' ? <SpringbackCard key={p.id} promo={p} /> : <PromoCard key={p.id} promo={p} />))}
    </ScrollView>
  );
});

/** The Springback card is live: it leads with what's pending for Wednesday once there is any. */
function SpringbackCard({ promo }: { promo: Promo }) {
  const c = useColors();
  const pending = useApp((st) => springbackPending(st.sbLedger));
  const credit = useApp((st) => st.sbCredit);
  const gauge = useApp((st) => gaugeFor(st.seasonRake));
  if (!(pending > 0) && !(credit > 0)) return <PromoCard promo={promo} mark={<SpringGlyph color={c.primary} size={16} />} />;
  const live: Promo = {
    ...promo,
    figure: pending > 0 ? formatCents(pending) : formatCents(credit),
    title: pending > 0 ? 'Springs back Wednesday' : 'Springback credit, ready',
    body:
      pending > 0
        ? `${gauge.name} gauge, ${gauge.ratePct}% on new rake.${credit > 0 ? ` ${formatCents(credit)} credit ready.` : ' Paid as entry credit (mock).'}`
        : 'Goes first on your next entry. Whatever it wins is cash (mock).',
  };
  return <PromoCard promo={live} mark={<SpringGlyph color={c.primary} size={16} />} />;
}

function PromoCard({ promo, mark }: { promo: Promo; mark?: React.ReactNode }) {
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
        <View style={s.kickerRow}>
          {mark}
          <Text style={s.kicker}>{promo.kicker}</Text>
        </View>
        <Text style={s.figure} testID={`promo-figure-${promo.id}`}>
          {promo.figure}
        </Text>
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
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  kicker: { ...type.label, color: c.textMuted },
  figure: { fontFamily: fonts.displayHeavy, fontSize: 40, lineHeight: 40, color: c.text },
  title: { ...type.bodyStrong, color: c.text, fontSize: 16 },
  body: { ...type.small, color: c.textMuted, minHeight: 36 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 6, minHeight: 28 },
  ctaText: { ...type.smallStrong, color: c.text },
}));
