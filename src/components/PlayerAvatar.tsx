import { memo, useState } from 'react';
import { Image, Text, View } from 'react-native';

import { photoUrl } from '../data/photos';
import { readableOn, teamInfo } from '../data/teams';
import type { Player } from '../engine';
import { fonts } from '../theme/type';
import { useColors } from '../theme/useTheme';

/**
 * Player headshot when the photo provider has one and it loads; otherwise the
 * team's abbreviation (MIN, KC) on the team color with a ring in its second
 * color. Team, not player, initials: it tells you something at a glance.
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
        borderRadius: size * 0.32,
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
          style={{
            fontFamily: fonts.display,
            fontSize: Math.round(size * (player.team.length > 2 ? 0.36 : 0.42)),
            lineHeight: size,
            color: team ? readableOn(fill) : c.textMuted,
            letterSpacing: 0.2,
          }}
          allowFontScaling={false}
        >
          {player.team}
        </Text>
      )}
    </View>
  );
});
