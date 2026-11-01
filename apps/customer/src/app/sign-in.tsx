import { useState } from 'react';
import { ActivityIndicator, Alert, Button, View } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import { useRouter } from 'expo-router';
import { useSSO } from '@wow/auth';

type Provider = 'oauth_google' | 'oauth_facebook';

export default function SignInScreen() {
  const router = useRouter();
  const { startSSOFlow } = useSSO();
  const [loading, setLoading] = useState(false);

  async function signIn(provider: Provider) {
    if (loading) return;
    setLoading(true);

    try {
      // Use the same callback route that Expo Router registers for the web
      // popup. On native this resolves to the app's configured "customer" scheme.
      const redirectUrl = AuthSession.makeRedirectUri({
        scheme: 'customer',
        path: 'sso-callback',
      });

      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: provider,
        redirectUrl,
      });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.replace('/');
      } else {
        Alert.alert(
          'لم يكتمل تسجيل الدخول',
          'تعذر تفعيل الجلسة أو يتطلب الحساب خطوات إضافية.',
        );
      }
    } catch (error) {
      Alert.alert(
        'حدث خطأ',
        error instanceof Error ? error.message : 'تعذر تسجيل الدخول',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 16 }}>
      <Button
        title="المتابعة باستخدام Google"
        disabled={loading}
        onPress={() => void signIn('oauth_google')}
      />
      <Button
        title="المتابعة باستخدام Facebook"
        disabled={loading}
        onPress={() => void signIn('oauth_facebook')}
      />
      {loading && <ActivityIndicator />}
    </View>
  );
}
