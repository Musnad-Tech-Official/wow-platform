import { useEffect } from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '@wow/auth';

/**
 * Complete the web OAuth popup before attempting navigation.
 * Never grant app access from callback URL parameters; route gates and
 * Supabase authorization remain the only sources of privileges.
 */
export default function AdminOAuthCallback() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const result = WebBrowser.maybeCompleteAuthSession();
    if (result.type === 'failed') {
      console.warn('WOW OAuth popup completion failed; close the window and retry.');
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web' || !isLoaded || !isSignedIn) return;
    // The original Clerk SSO flow owns session activation on native platforms.
    router.replace('/');
  }, [isLoaded, isSignedIn, router]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
      <ActivityIndicator accessibilityLabel="جارٍ استكمال تسجيل الدخول" />
      <Text style={{ textAlign: 'center' }}>
        جارٍ إكمال تسجيل الدخول... إذا لم تُغلق النافذة تلقائيًا، أغلقها وحاول مرة أخرى.
      </Text>
    </View>
  );
}
