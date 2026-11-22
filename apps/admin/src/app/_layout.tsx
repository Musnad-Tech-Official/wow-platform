
import '../global.css';

import { useEffect, type PropsWithChildren } from 'react';
import { I18nManager, Platform, View } from 'react-native';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import * as SecureStore from 'expo-secure-store';

import { ThemeProvider, wowFonts } from '@wow/theme';
import { WowAuthProvider, useAuth } from '@wow/auth';
import { WowQueryProvider, useWowSupabaseClient } from '@wow/api';

// Keep the splash screen visible until fonts are ready.
void SplashScreen.preventAutoHideAsync();

// Enable RTL layout for React Native.
// Native RTL changes may require a full app restart.
if (Platform.OS !== 'web') {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}


const publishableKey =
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error(
    'Add your Clerk Publishable Key to the .env file'
  );
}


export default function RootLayout() {
  const [loaded, error] = useFonts(wowFonts);

  useEffect(() => {
    if (loaded || error) {
      void SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  if (error) {
    console.error('WOW font loading failed:', error);
  }

  return (
    <WowAuthProvider publishableKey={publishableKey}>
      <AppQueryProvider>
      <ThemeProvider storage={SecureStore}>
        <View
          {...(Platform.OS === 'web'
            ? { dir: 'rtl' as const }
            : {})}
          style={{
            flex: 1,
            ...(Platform.OS === 'web' ? {} : { direction: 'rtl' as const }),
          }}
        >
          <Stack
            screenOptions={{
              headerShown: false,
            }}
          >
            <Stack.Protected guard={__DEV__}>
              <Stack.Screen name="integration-test" />
            </Stack.Protected>
          </Stack>
        </View>
      </ThemeProvider>
      </AppQueryProvider>
    </WowAuthProvider>
  );
}

function AppQueryProvider({ children }: PropsWithChildren) {
  const { isLoaded, isSignedIn, userId, sessionId, getToken } = useAuth();
  const sessionScopeKey = isLoaded && isSignedIn && userId && sessionId
    ? JSON.stringify([userId, sessionId])
    : null;
  const getClient = useWowSupabaseClient({
    url: process.env.EXPO_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.EXPO_PUBLIC_SUPABASE_KEY,
    getToken,
    sessionScopeKey,
  });

  return <WowQueryProvider getClient={getClient} userId={userId ?? null}
    sessionScopeKey={sessionScopeKey} isAuthReady={isLoaded}>
    {children}
  </WowQueryProvider>;
}
