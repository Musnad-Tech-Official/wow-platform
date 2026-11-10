import { useState, type PropsWithChildren } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAuth, useSSO } from '@wow/auth';
import { AppButton, AppText } from '@wow/ui';
import { resolveMerchantRouteAccess } from './merchant-route-access';

/** Route-only authentication boundary; Supabase RLS remains authoritative. */
export function MerchantRouteGate({ children }: PropsWithChildren) {
  const { isLoaded, isSignedIn } = useAuth();
  const { startSSOFlow } = useSSO();
  const { preview } = useLocalSearchParams<{ preview?: string }>();
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
      const { createdSessionId, setActive } = await startSSOFlow({ strategy });
      if (!createdSessionId || !setActive) {
        throw new Error('لم تكتمل المصادقة. أعد المحاولة بعد إكمال خطوات تسجيل الدخول.');
      }
      await setActive({ session: createdSessionId });
    } catch (error) {
      setSignInError(error instanceof Error ? error.message : 'تعذر إكمال تسجيل الدخول.');
    } finally {
      setSignInBusy(false);
    }
  };

  if (access === 'allow') return <>{children}</>;

  if (access === 'loading') {
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
      </View>
    </View>
  );
}
