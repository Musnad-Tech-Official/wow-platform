import { useEffect } from 'react';
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

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const result = WebBrowser.maybeCompleteAuthSession();
    if (result.type === 'failed') {
      console.warn('WOW SSO callback could not complete; close the popup and retry sign-in.');
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
      <ActivityIndicator />
      <Text style={{ textAlign: 'center' }}>
        جارٍ إكمال تسجيل الدخول... إذا لم تُغلق النافذة تلقائيًا، أغلقها وحاول مرة أخرى.
      </Text>
    </View>
  );
}
