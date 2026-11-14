import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useApp } from '../store/useApp';
import { useColors } from '../theme/useTheme';

/** Drives bot picks and clock expiry for every live draft, app-wide. */
function DraftTicker() {
  const hasLive = useApp((s) => Object.values(s.drafts).some((d) => d.state.status === 'drafting'));
  useEffect(() => {
    if (!hasLive) return;
    const t = setInterval(() => useApp.getState().tick(Date.now()), 200);
    return () => clearInterval(t);
  }, [hasLive]);
  return null;
}

export default function RootLayout() {
  const c = useColors();
  return (
    <SafeAreaProvider style={{ backgroundColor: c.bg }}>
      <StatusBar style="light" />
      <DraftTicker />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: c.bg },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="contest/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="draft/[id]" options={{ gestureEnabled: false }} />
        <Stack.Screen name="results/[id]" />
      </Stack>
    </SafeAreaProvider>
  );
}
