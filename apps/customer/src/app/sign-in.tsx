
import { useState } from 'react';
import {
  Alert,
  Button,
  View,
  ActivityIndicator,
} from 'react-native';
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
      const { createdSessionId, setActive } =
        await startSSOFlow({
          strategy: provider,
        });


if (createdSessionId && setActive) {
  await setActive({
    session: createdSessionId,
  });

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
        error instanceof Error
          ? error.message
          : 'تعذر تسجيل الدخول',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        padding: 24,
        gap: 16,
      }}
    >
      <Button
        title="المتابعة باستخدام Google"
        disabled={loading}
        onPress={() => signIn('oauth_google')}
      />

      <Button
        title="المتابعة باستخدام Facebook"
        disabled={loading}
        onPress={() => signIn('oauth_facebook')}
      />

      {loading && <ActivityIndicator />}
    </View>
  );
}
