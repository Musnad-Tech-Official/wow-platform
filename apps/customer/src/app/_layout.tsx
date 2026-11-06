import '../global.css';

import { useEffect, type PropsWithChildren } from 'react';
import { I18nManager, Platform, View } from 'react-native';
import { Stack, usePathname, useRouter } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

import { ThemeProvider, wowFonts } from '@wow/theme';
import { WowAuthProvider, useAuth } from '@wow/auth';
import { WowQueryProvider, useWowSupabaseClient } from '@wow/api';
import { useOnboardingStore } from '../state/onboarding-store';
import { useGuestStore } from '../state/guest-store';
import { resolveAccessDecision } from '../state/access-decision';

// Keep splash visible during full initialization (fonts + persisted state + Clerk auth)
void SplashScreen.preventAutoHideAsync();

// Enable RTL layout for React Native
if (Platform.OS !== 'web') {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error('Add your Clerk Publishable Key to the .env file');
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(wowFonts);

  return (
    <WowAuthProvider publishableKey={publishableKey}>
      <AppQueryProvider>
        <ThemeProvider>
          <RootLayoutContent fontsReady={Boolean(fontsLoaded || fontError)} fontError={fontError} />
        </ThemeProvider>
      </AppQueryProvider>
    </WowAuthProvider>
  );
}

function RootLayoutContent({
  fontsReady,
  fontError,
}: {
  fontsReady: boolean;
  fontError: Error | null;
}) {
  const { isLoaded: isAuthLoaded } = useAuth();
  const hasOnboardingHydrated = useOnboardingStore((s) => s.hasHydrated);
  const hasGuestHydrated = useGuestStore((s) => s.hasHydrated);

  const isStoresHydrated = hasOnboardingHydrated && hasGuestHydrated;
  const isAppReady = fontsReady && isStoresHydrated && isAuthLoaded;

  useEffect(() => {
    if (isAppReady) {
      void SplashScreen.hideAsync();
    }
  }, [isAppReady]);

  if (fontError) {
    console.error('WOW font loading failed:', fontError);
  }

  // Prevent flashing or unauthorized route rendering before hydration and auth readiness
  if (!isAppReady) {
    return null;
  }

  return (
    <View
      {...(Platform.OS === 'web' ? { dir: 'rtl' as const } : {})}
      style={{
        flex: 1,
        ...(Platform.OS === 'web' ? {} : { direction: 'rtl' as const }),
      }}
    >
      <InitialNavigationGate isReady={isAppReady} />

      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="welcome" />
        <Stack.Screen name="access" />
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="sso-callback" />
        <Stack.Screen name="discover/index" />
        <Stack.Screen name="business/[id]" />
        <Stack.Screen name="offer/[id]" />
        <Stack.Protected guard={__DEV__}>
          <Stack.Screen name="integration-test" />
          <Stack.Screen name="design-preview" />
        </Stack.Protected>
      </Stack>
    </View>
  );
}

function InitialNavigationGate({ isReady }: { isReady: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  const hasCompletedOnboarding = useOnboardingStore((s) => s.hasCompletedOnboarding);
  const completeOnboarding = useOnboardingStore((s) => s.completeOnboarding);
  const hasChosenGuest = useGuestStore((s) => s.hasChosenGuest);
  const exitGuest = useGuestStore((s) => s.exitGuest);
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const hasOnboardingHydrated = useOnboardingStore((s) => s.hasHydrated);
  const hasGuestHydrated = useGuestStore((s) => s.hasHydrated);

  useEffect(() => {
    if (!isReady) return;

    // Migration policy: existing authenticated Clerk sessions are treated as having completed onboarding
    if (isSignedIn && !hasCompletedOnboarding) {
      completeOnboarding();
    }

    // Entering a verified session clears temporary guest selection
    if (isSignedIn && hasChosenGuest) {
      exitGuest();
    }

    const decision = resolveAccessDecision({
      isHydrated: hasOnboardingHydrated && hasGuestHydrated,
      isAuthLoaded,
      isSignedIn: Boolean(isSignedIn),
      hasCompletedOnboarding: Boolean(hasCompletedOnboarding || isSignedIn),
      hasChosenGuest,
      currentPath: pathname,
    });

    if (decision.needsRedirect && decision.targetRoute && pathname !== decision.targetRoute) {
      router.replace(decision.targetRoute);
    }
  }, [
    isReady,
    isSignedIn,
    hasCompletedOnboarding,
    hasChosenGuest,
    hasOnboardingHydrated,
    hasGuestHydrated,
    isAuthLoaded,
    pathname,
    router,
    completeOnboarding,
    exitGuest,
  ]);

  return null;
}

function AppQueryProvider({ children }: PropsWithChildren) {
  const { isLoaded, isSignedIn, userId, sessionId, getToken } = useAuth();
  const sessionScopeKey =
    isLoaded && isSignedIn && userId && sessionId
      ? JSON.stringify([userId, sessionId])
      : null;
  const getClient = useWowSupabaseClient({
    url: process.env.EXPO_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.EXPO_PUBLIC_SUPABASE_KEY,
    getToken,
    sessionScopeKey,
  });

  return (
    <WowQueryProvider
      getClient={getClient}
      userId={userId ?? null}
      sessionScopeKey={sessionScopeKey}
      isAuthReady={isLoaded}
    >
      {children}
    </WowQueryProvider>
  );
}
