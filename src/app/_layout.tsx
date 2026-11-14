import { BigShoulders_800ExtraBold, BigShoulders_900Black } from '@expo-google-fonts/big-shoulders';
import { DMMono_500Medium } from '@expo-google-fonts/dm-mono';
import {
  SchibstedGrotesk_400Regular,
  SchibstedGrotesk_600SemiBold,
  SchibstedGrotesk_800ExtraBold,
} from '@expo-google-fonts/schibsted-grotesk';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useApp } from '../store/useApp';
import { useColors } from '../theme/useTheme';

// Hold the splash until the type system is ready, so nothing flashes in the system font.
SplashScreen.preventAutoHideAsync().catch(() => {});

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
  const [loaded, error] = useFonts({
    BigShoulders_800ExtraBold,
    BigShoulders_900Black,
    SchibstedGrotesk_400Regular,
    SchibstedGrotesk_600SemiBold,
    SchibstedGrotesk_800ExtraBold,
    DMMono_500Medium,
  });
  const ready = loaded || !!error;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  return (
    <SafeAreaProvider style={{ backgroundColor: c.bg }}>
      <StatusBar style="light" />
      <DraftTicker />
      {ready ? (
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: c.bg },
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="contest/[id]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="deposit" options={{ presentation: 'modal' }} />
          <Stack.Screen name="promo/[id]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="draft/[id]" options={{ gestureEnabled: false }} />
          <Stack.Screen name="results/[id]" />
        </Stack>
      ) : null}
    </SafeAreaProvider>
  );
}
