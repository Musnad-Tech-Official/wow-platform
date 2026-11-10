import { useSyncExternalStore } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '@wow/auth';
import { BusinessOnboardingStep2 } from '../../../features/business/components/BusinessOnboardingStep2';

const emptySubscribe = () => () => {};

export default function BusinessOnboardingRepresentativeScreen() {
  const auth = useAuth();
  const { businessId, preview } = useLocalSearchParams<{ businessId?: string; preview?: string }>();
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  // In development/test mode, preview=1 allows safe synthetic fixture evaluation without remote writes or bypassing production gates
  const isPreview =
    __DEV__ &&
    (preview === '1' || (typeof window !== 'undefined' && Boolean(window.location?.search?.includes('preview=1'))));

  const isPreviewUnsigned =
    __DEV__ &&
    (preview === 'unsigned' || (typeof window !== 'undefined' && Boolean(window.location?.search?.includes('preview=unsigned'))));

  const fixtureAuth = isClient
    ? isPreview
      ? { isLoaded: true, isSignedIn: true, userId: 'dev_synthetic_merchant_user' }
      : isPreviewUnsigned
      ? { isLoaded: true, isSignedIn: false, userId: null }
      : undefined
    : undefined;

  const effectiveUserId = fixtureAuth ? fixtureAuth.userId : auth.userId;

  const fixtureBusiness = isPreview
    ? {
        id: businessId || 'dev-synthetic-business-uuid',
        name: 'دار الألوان',
        status: 'draft',
      }
    : undefined;

  return (
    <BusinessOnboardingStep2
      key={`${effectiveUserId ?? 'anon'}:${businessId ?? 'new'}`}
      businessId={businessId ?? null}
      fixtureAuth={fixtureAuth}
      fixtureBusiness={fixtureBusiness}
    />
  );
}
