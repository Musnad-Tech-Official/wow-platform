import { useState, useSyncExternalStore, type PropsWithChildren } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { router, useGlobalSearchParams } from 'expo-router';
import { useAuth, useSSO } from '@wow/auth';
import { AppButton, AppText } from '@wow/ui';
import { resolveMerchantRouteAccess } from './merchant-route-access';

// Use a stable loading frame for static HTML and the first hydration render.
const noChangeSubscribe = () => () => {};

// Web OAuth popups must be completed on the client, never during Expo's static prerender.
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  void WebBrowser.maybeCompleteAuthSession();
}

/** Route-only authentication boundary; Supabase RLS remains authoritative. */
export function MerchantRouteGate({ children }: PropsWithChildren) {
  const { isLoaded, isSignedIn } = useAuth();
  const isClient = useSyncExternalStore(noChangeSubscribe, () => true, () => false);
  const { startSSOFlow } = useSSO();
  const { preview } = useGlobalSearchParams<{ preview?: string }>();
  const [signInBusy, setSignInBusy] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  const access = resolveMerchantRouteAccess(
    isLoaded, isSignedIn ?? false,
    __DEV__ === true, preview,
  );

  const signIn = async (strategy: 'oauth_google' | 'oauth_facebook') => {
    if (signInBusy) return;
    setSignInBusy(true);
    setSignInError(null);
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy,
        redirectUrl: AuthSession.makeRedirectUri({ scheme: 'merchant', path: 'oauth-callback' }),
      });
      if (!createdSessionId || !setActive) {
        throw new Error('لم تكتمل المصادقة. أعد المحاولة بعد إكمال خطوات تسجيل الدخول.');
      }
      await setActive({ session: createdSessionId });
    } catch {
      // Never display raw provider/Clerk error details or transient credentials.
      setSignInError('تعذر إكمال تسجيل الدخول عبر مزود الهوية. يرجى إعادة المحاولة.');
    } finally {
      setSignInBusy(false);
    }
  };

  if (isClient && access === 'allow') return <>{children}</>;

  if (!isClient || access === 'loading') {
    return (
      <View className="flex-1 items-center justify-center bg-background p-6">
        <ActivityIndicator accessibilityLabel="جارٍ التحقق من تسجيل الدخول" />
        <AppText muted>جارٍ التحقق من تسجيل الدخول...</AppText>
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center bg-background p-6 gap-3">
      <AppText variant="heading">تسجيل الدخول مطلوب</AppText>
      <AppText muted>يرجى تسجيل الدخول بحساب تاجر للوصول إلى مساحة التاجر.</AppText>
      {signInError ? <AppText tone="danger">{signInError}</AppText> : null}
      <View className="w-full max-w-xs gap-2">
        <AppButton title="تسجيل الدخول عبر Google" disabled={signInBusy} onPress={() => void signIn('oauth_google')} />
        <AppButton title="تسجيل الدخول عبر Facebook" variant="secondary" disabled={signInBusy} onPress={() => void signIn('oauth_facebook')} />
        <AppButton title="استعادة الوصول إلى الحساب" variant="outline"
          disabled={signInBusy} onPress={() => router.push('/auth/recovery')} />
      </View>
    </View>
  );
}
