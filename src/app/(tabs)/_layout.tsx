import { Tabs } from 'expo-router/js-tabs';
import { View } from 'react-native';

import { TabIcon } from '../../components/icons';
import { RattleBadge } from '../../components/Rattler';
import { useApp } from '../../store/useApp';
import { onTheClock } from '../../engine';
import { ME } from '../../store/useApp';
import { fonts } from '../../theme/type';
import { useColors } from '../../theme/useTheme';

export default function TabsLayout() {
  const c = useColors();
  const live = useApp((s) => Object.values(s.drafts).filter((d) => d.state.status === 'drafting').length);
  // Any room where you're on the clock and picking yourself: the badge becomes a shaking rattle.
  const up = useApp((s) =>
    Object.values(s.drafts).some((d) => d.state.status === 'drafting' && !d.background && !d.autodraft && !d.autopilot && onTheClock(d.state)?.id === ME),
  );
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        sceneStyle: { backgroundColor: c.bg },
        tabBarStyle: { backgroundColor: c.bg, borderTopColor: c.border, height: 64, paddingTop: 6 },
        tabBarActiveTintColor: c.text,
        tabBarInactiveTintColor: c.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontFamily: fonts.strong },
        tabBarIcon: ({ color, focused }) => (
          <View>
            <TabIcon name={route.name} color={String(color)} focused={focused} dot={c.accent} />
            {route.name === 'drafts' && up ? (
              <View style={{ position: 'absolute', top: -6, right: -12 }} testID="tab-rattle" accessibilityLabel="You're on the clock">
                <RattleBadge size={18} />
              </View>
            ) : null}
          </View>
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Lobby' }} />
      <Tabs.Screen
        name="drafts"
        options={{
          title: 'Drafts',
          tabBarBadge: up ? undefined : live || undefined,
          tabBarBadgeStyle: { backgroundColor: c.accent, color: c.bg, fontFamily: fonts.mono, fontSize: 10 },
        }}
      />
      <Tabs.Screen name="exposure" options={{ title: 'Exposure' }} />
      <Tabs.Screen name="account" options={{ title: 'You' }} />
    </Tabs>
  );
}
