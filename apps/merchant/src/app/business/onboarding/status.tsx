import { useSyncExternalStore } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '@wow/auth';
import { BusinessQualificationStatusScreen } from '../../../features/business/components/BusinessQualificationStatusScreen';

const emptySubscribe = () => () => {};

export default function BusinessOnboardingStatusRoute() {
  const auth = useAuth();
  const { businessId, preview } = useLocalSearchParams<{
    businessId?: string;
    preview?: string;
  }>();

  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const isPreview =
    (__DEV__ || process.env.NODE_ENV !== 'production') &&
    (preview === '1' ||
      (typeof window !== 'undefined' && Boolean(window.location?.search?.includes('preview=1'))));

  const isPreviewUnsigned =
    (__DEV__ || process.env.NODE_ENV !== 'production') &&
    (preview === 'unsigned' ||
      (typeof window !== 'undefined' && Boolean(window.location?.search?.includes('preview=unsigned'))));

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
        name: 'مؤسسة أفق التقنية',
        status: 'pending_review',
      }
    : undefined;

  return (
    <BusinessQualificationStatusScreen
      key={`${effectiveUserId ?? 'anon'}:${businessId ?? 'new'}`}
      businessId={businessId ?? null}
      fixtureAuth={fixtureAuth}
      fixtureBusiness={fixtureBusiness}
    />
  );
}
