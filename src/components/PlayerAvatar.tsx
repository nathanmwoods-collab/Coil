import { memo, useState } from 'react';
import { Image, Text, View } from 'react-native';

import { photoUrl } from '../data/photos';
import { readableOn, teamInfo } from '../data/teams';
import type { Player } from '../engine';
import { fonts } from '../theme/type';
import { useColors } from '../theme/useTheme';

const SUFFIX = /^(jr\.?|sr\.?|ii|iii|iv|v)$/i;

/** "A.J. Brown" -> "AB", "Amon-Ra St. Brown" -> "AB", "Kenneth Walker III" -> "KW". */
export function initials(name: string): string {
  const parts = name.split(' ').filter((w) => w && !SUFFIX.test(w));
  const first = parts[0]?.replace(/[^A-Za-z]/g, '')[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1].replace(/[^A-Za-z]/g, '')[0] ?? '' : '';
  return (first + last).toUpperCase();
}

/**
 * Player headshot when the photo provider has one and it loads; otherwise the
 * player's initials on the team color with a ring in the team's second color.
 */
export const PlayerAvatar = memo(function PlayerAvatar({ player, size = 36, dim }: { player: Player; size?: number; dim?: boolean }) {
  const c = useColors();
  const url = photoUrl(player);
  const [failed, setFailed] = useState<string | null>(null);
  const team = teamInfo(player.team, player.sport);
  const fill = team?.color ?? c.surfaceAlt;
  const ring = team?.alt ?? c.border;
  const showPhoto = !!url && failed !== url;
  return (
    <View
      accessible={false}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: showPhoto ? c.surfaceAlt : fill,
        borderWidth: 1.5,
        borderColor: ring,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        opacity: dim ? 0.55 : 1,
      }}
    >
      {showPhoto ? (
        <Image
          source={{ uri: url }}
          onError={() => setFailed(url)}
          resizeMode="cover"
          style={{ width: size, height: size }}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Text
          style={{ fontFamily: fonts.display, fontSize: Math.round(size * 0.44), lineHeight: size, color: team ? readableOn(fill) : c.textMuted, letterSpacing: 0.3 }}
          allowFontScaling={false}
        >
          {initials(player.name)}
        </Text>
      )}
    </View>
  );
});
