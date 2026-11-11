import { useSyncExternalStore } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '@wow/auth';
import { BusinessOnboardingStep4 } from '../../../features/business/components/BusinessOnboardingStep4';
import { MerchantRouteGate } from '../../../features/navigation/MerchantRouteGate';

const emptySubscribe = () => () => {};

export default function BusinessOnboardingReviewScreen() {
  const auth = useAuth();
  const { businessId, preview, readOnly } = useLocalSearchParams<{
    businessId?: string;
    preview?: string;
    readOnly?: string;
  }>();

  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const isPreview =
    __DEV__ &&
    (preview === '1' ||
      (typeof window !== 'undefined' && Boolean(window.location?.search?.includes('preview=1'))));

  const isPreviewUnsigned =
    __DEV__ &&
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
        name: 'دار الألوان',
        status: 'draft',
        requested_category_name: 'أدوات منزلية (بيانات تجريبية)',
        requested_category_id: 'preview-category',
        description: 'مؤسسة تجارية متخصصة في المستلزمات والأدوات المنزلية.',
      }
    : undefined;

  return (
    <MerchantRouteGate>
      <BusinessOnboardingStep4
      key={`${effectiveUserId ?? 'anon'}:${businessId ?? 'new'}`}
      businessId={businessId ?? null}
      readOnly={readOnly === '1'}
      fixtureAuth={fixtureAuth}
      fixtureBusiness={fixtureBusiness}
      onNavigateToStatus={(id) => {
        router.push({
          pathname: '/business/onboarding/status',
          params: {
            businessId: id,
            ...(isPreview ? { preview: '1' } : {}),
          },
        });
      }}
      onNavigateToStep={(step, id) => {
        const path =
          step === 1
            ? '/business/onboarding'
            : step === 2
            ? '/business/onboarding/representative'
            : '/business/onboarding/branches';
        router.push({
          pathname: path,
          params: {
            businessId: id,
            ...(isPreview ? { preview: '1' } : {}),
          },
        });
      }}
      />
    </MerchantRouteGate>
  );
}
