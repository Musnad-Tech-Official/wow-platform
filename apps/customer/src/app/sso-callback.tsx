import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '@wow/auth';

/**
 * Clerk/Expo useSSO returns to this path by default.
 * On web the OAuth popup must complete its Expo browser session here so
 * startSSOFlow can resolve in the original sign-in window.
 */
export default function SsoCallbackScreen() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const result = WebBrowser.maybeCompleteAuthSession();
    if (result.type === 'failed') {
      setError('تعذر إكمال نافذة تسجيل الدخول. أغلق هذه النافذة وجرّب مرة أخرى.');
    }
    // Successful browser completion closes this popup and resumes startSSOFlow.
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web' || !isLoaded || !isSignedIn) return;
    // On native, the original SSO promise activates the session. This route
    // only provides a safe destination if the deep link is opened as a route.
    router.replace('/');
  }, [isLoaded, isSignedIn, router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 16 }}>
      {!error && <ActivityIndicator />}
      <Text style={{ textAlign: 'center' }}>
        {error ?? 'جارٍ إكمال تسجيل الدخول...'}
      </Text>
    </View>
  );
}
