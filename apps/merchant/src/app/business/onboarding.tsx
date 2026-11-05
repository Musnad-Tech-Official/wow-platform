import { useSyncExternalStore } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@wow/auth';
import { BusinessOnboardingStep1 } from '../../features/business/components/BusinessOnboardingStep1';

const emptySubscribe = () => () => {};

export default function BusinessOnboardingScreen() {
  const router = useRouter();
  const auth = useAuth();
  const { businessId, preview } = useLocalSearchParams<{ businessId?: string; preview?: string }>();
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  // In development/test mode, preview=1 allows safe synthetic fixture evaluation without remote writes or bypassing production gates
  const isPreview =
    (__DEV__ || process.env.NODE_ENV !== 'production') &&
    (preview === '1' || (typeof window !== 'undefined' && Boolean(window.location?.search?.includes('preview=1'))));

  const isPreviewUnsigned =
    (__DEV__ || process.env.NODE_ENV !== 'production') &&
    (preview === 'unsigned' || (typeof window !== 'undefined' && Boolean(window.location?.search?.includes('preview=unsigned'))));

  const fixtureAuth = isClient
    ? isPreview
      ? { isLoaded: true, isSignedIn: true, userId: 'dev_synthetic_merchant_user' }
      : isPreviewUnsigned
      ? { isLoaded: true, isSignedIn: false, userId: null }
      : undefined
    : undefined;

  const effectiveUserId = fixtureAuth ? fixtureAuth.userId : auth.userId;

  return (
    <BusinessOnboardingStep1
      key={`${effectiveUserId ?? 'anon'}:${businessId ?? 'new'}`}
      businessId={businessId ?? null}
      fixtureAuth={fixtureAuth}
      onBusinessIdCaptured={(newId) => {
        router.setParams({ businessId: newId });
      }}
      onNavigateToStep2={(savedBusinessId) => {
        const params: Record<string, string> = { businessId: savedBusinessId };
        if (isPreview) {
          params.preview = '1';
        }
        router.push({
          pathname: '/business/onboarding/representative',
          params,
        });
      }}
    />
  );
}
