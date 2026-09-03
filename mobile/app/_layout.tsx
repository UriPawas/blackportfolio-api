import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SessionProvider, useSession } from '@/src/auth/session';
import { ThemeProvider, useTheme } from '@/src/design/theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function AppNavigator() {
  const { status } = useSession();
  const { colors, theme } = useTheme();
  useEffect(() => { SystemUI.setBackgroundColorAsync(colors.paper).catch(() => undefined); }, [colors.paper]);
  useEffect(() => { if (status !== 'booting') SplashScreen.hideAsync().catch(() => undefined); }, [status]);

  if (status === 'booting') return <View style={{ flex: 1, backgroundColor: colors.paper }} />;
  const requiresAuth = status === 'signedOut' || status === 'locked' || status === 'twoFactorRequired';
  return <>
    <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
    <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: colors.paper } }}>
      {requiresAuth ? <Stack.Screen name="(auth)" /> : <Stack.Screen name="(tabs)" />}
      <Stack.Screen name="section/[slug]" options={{ headerShown: true, title: 'BlackPortfolio', animation: 'slide_from_right' }} />
    </Stack>
  </>;
}

export default function RootLayout() {
  return <SafeAreaProvider><ThemeProvider><SessionProvider><AppNavigator /></SessionProvider></ThemeProvider></SafeAreaProvider>;
}
