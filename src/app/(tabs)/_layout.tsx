import { Tabs } from 'expo-router/js-tabs';
import { Text } from 'react-native';

import { useApp } from '../../store/useApp';
import { useColors } from '../../theme/useTheme';

const GLYPH: Record<string, string> = { index: '◆', drafts: '▤', exposure: '%', account: '●' };

function TabIcon({ name, color }: { name: string; color: string }) {
  return <Text style={{ color, fontSize: 18, lineHeight: 22, fontWeight: '900' }}>{GLYPH[name]}</Text>;
}

export default function TabsLayout() {
  const c = useColors();
  const live = useApp((s) => Object.values(s.drafts).filter((d) => d.state.status === 'drafting').length);
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        sceneStyle: { backgroundColor: c.bg },
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border, height: 64, paddingTop: 6 },
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarIcon: ({ color }) => <TabIcon name={route.name} color={String(color)} />,
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Lobby' }} />
      <Tabs.Screen
        name="drafts"
        options={{ title: 'Drafts', tabBarBadge: live || undefined, tabBarBadgeStyle: { backgroundColor: c.accent, color: c.bg } }}
      />
      <Tabs.Screen name="exposure" options={{ title: 'Exposure' }} />
      <Tabs.Screen name="account" options={{ title: 'Account' }} />
    </Tabs>
  );
}
