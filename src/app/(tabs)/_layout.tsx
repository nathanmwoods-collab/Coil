import { Tabs } from 'expo-router/js-tabs';

import { TabIcon } from '../../components/icons';
import { useApp } from '../../store/useApp';
import { fonts } from '../../theme/type';
import { useColors } from '../../theme/useTheme';

export default function TabsLayout() {
  const c = useColors();
  const live = useApp((s) => Object.values(s.drafts).filter((d) => d.state.status === 'drafting').length);
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        sceneStyle: { backgroundColor: c.bg },
        tabBarStyle: { backgroundColor: c.bg, borderTopColor: c.border, height: 64, paddingTop: 6 },
        tabBarActiveTintColor: c.text,
        tabBarInactiveTintColor: c.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontFamily: fonts.strong },
        tabBarIcon: ({ color, focused }) => <TabIcon name={route.name} color={String(color)} focused={focused} dot={c.accent} />,
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Lobby' }} />
      <Tabs.Screen
        name="drafts"
        options={{
          title: 'Drafts',
          tabBarBadge: live || undefined,
          tabBarBadgeStyle: { backgroundColor: c.accent, color: c.bg, fontFamily: fonts.mono, fontSize: 10 },
        }}
      />
      <Tabs.Screen name="exposure" options={{ title: 'Exposure' }} />
      <Tabs.Screen name="account" options={{ title: 'You' }} />
    </Tabs>
  );
}
