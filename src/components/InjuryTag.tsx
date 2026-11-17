import { memo } from 'react';
import { Text, View } from 'react-native';

import { INJURY_LABEL, injuryFor } from '../data/news';
import { fonts } from '../theme/type';
import { useColors } from '../theme/useTheme';

/** Q / D / O / IR / PUP, coloured by severity. Renders nothing for a healthy player. */
export const InjuryTag = memo(function InjuryTag({ playerId }: { playerId: string }) {
  const c = useColors();
  const inj = injuryFor(playerId);
  if (!inj) return null;
  const color = inj.status === 'Q' ? c.warning : c.danger;
  return (
    <View
      accessibilityLabel={`${INJURY_LABEL[inj.status]}, ${inj.detail}`}
      style={{ paddingHorizontal: 4, height: 16, borderRadius: 4, backgroundColor: color + '26', justifyContent: 'center' }}
    >
      <Text style={{ fontFamily: fonts.mono, fontSize: 10, lineHeight: 12, color }}>{inj.status}</Text>
    </View>
  );
});
