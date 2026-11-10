import type { PropsWithChildren } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '@wow/auth';
import { AppText } from '@wow/ui';
import { resolveMerchantRouteAccess } from './merchant-route-access';

/** Route-only authentication boundary; RLS remains the authoritative data boundary. */
export function MerchantRouteGate({ children }: PropsWithChildren) {
  const { isLoaded, isSignedIn } = useAuth();
  const { preview } = useLocalSearchParams<{ preview?: string }>();

  // Existing fixture preview is permitted ONLY in development builds.
  // It must never turn into an authenticated production session.
  const access = resolveMerchantRouteAccess(
    isLoaded, isSignedIn ?? false,
    __DEV__ === true, preview,
  );
  if (access === 'allow') return <>{children}</>;

  if (access === 'loading') {
    return (
      <View className="flex-1 items-center justify-center bg-background p-6">
        <ActivityIndicator accessibilityLabel="جارٍ التحقق من تسجيل الدخول" />
        <AppText muted>جارٍ التحقق من تسجيل الدخول...</AppText>
      </View>
    );
  }

  if (access === 'sign-in') {
    return (
      <View className="flex-1 items-center justify-center bg-background p-6 gap-2">
        <AppText variant="heading">تسجيل الدخول مطلوب</AppText>
        <AppText muted>يرجى تسجيل الدخول بحساب تاجر للوصول إلى مساحة التاجر.</AppText>
      </View>
    );
  }
  return <>{children}</>;
}
