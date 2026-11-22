import React, { createContext, useContext, useState, useMemo, useCallback, type PropsWithChildren } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAccessibleMerchantBusinesses, type Business } from '@wow/api';
import { useAuth } from '@wow/auth';
import { resolveMerchantBusinessId } from './merchant-business-selection';

export interface ActiveBusinessContextValue {
  activeBusinessId: string | null;
  activeBusiness: Business | null;
  businesses: Business[];
  setActiveBusinessId: (id: string | null) => void;
  isLoading: boolean;
  isSyntheticPreview: boolean;
  isOwner: boolean;
  businessesError: boolean;
  refetchBusinesses: () => void;
}

const ActiveBusinessContext = createContext<ActiveBusinessContextValue | null>(null);

export const PREVIEW_BUSINESS_FIXTURE: Business = {
  id: 'dev-synthetic-business-uuid',
  name: 'مؤسسة أفق التقنية',
  owner_user_id: 'dev_synthetic_merchant_user',
  status: 'approved',
  description: 'مؤسسة تجارية متخصصة في الحلول التقنية والإلكترونيات.',
  requested_category_id: 'cat-electronics-uuid',
};

export const PREVIEW_BUSINESS_DAR_ALWAN: Business = {
  id: 'dev-synthetic-business-dar-alwan',
  name: 'متجر الواحة للتجارة',
  owner_user_id: 'dev_synthetic_merchant_user',
  status: 'approved',
  description: 'متجر متخصص في التجزئة والمستلزمات المنزلية.',
  requested_category_id: 'cat-home-uuid',
};

export function ActiveBusinessProvider({
  children,
  initialBusinessId,
}: PropsWithChildren<{ initialBusinessId?: string | null }>) {
  const { isSignedIn, userId } = useAuth();
  const router = useRouter();
  const searchParams = useLocalSearchParams<{ businessId?: string; preview?: string }>();

  const isSyntheticPreview =
    __DEV__ &&
    (searchParams.preview === '1' ||
      (typeof window !== 'undefined' && Boolean(window.location?.search?.includes('preview=1'))));

  const {
    data: serverBusinesses = [], isLoading: isServerLoading,
    error: serverBusinessesError, refetch: refetchAccessibleBusinesses,
  } = useAccessibleMerchantBusinesses();

  const businesses = useMemo(() => {
    if (isSyntheticPreview) {
      return [PREVIEW_BUSINESS_FIXTURE, PREVIEW_BUSINESS_DAR_ALWAN];
    }
    return serverBusinesses;
  }, [isSyntheticPreview, serverBusinesses]);

  // The URL controls deep links/back/refresh. Local selection is only valid for
  // its authenticated user; an old session must never supply a new user's scope.
  const routeBusinessId = searchParams.businessId ?? initialBusinessId ?? null;
  const [selection, setSelection] = useState<{ userId: string | null; businessId: string | null }>({
    userId,
    businessId: null,
  });

  const effectiveBusinessId = useMemo(
    () => resolveMerchantBusinessId({
      allowedBusinessIds: businesses.map((business) => business.id),
      routeBusinessId,
      selectedBusinessId: selection.businessId,
      selectionBelongsToSession: selection.userId === userId,
      isSignedIn: Boolean(isSignedIn),
      isSyntheticPreview,
    }),
    [businesses, routeBusinessId, selection, userId, isSignedIn, isSyntheticPreview]
  );

  const setActiveBusinessId = useCallback((id: string | null) => {
    // A stale or fabricated ID cannot be installed as the active merchant.
    if (id && !businesses.some((business) => business.id === id)) return;
    setSelection({ userId, businessId: id });
    // Persist the authorized choice in the URL so refresh/back/deep links have
    // one authoritative source rather than diverging from local React state.
    if (id && routeBusinessId !== id) {
      router.setParams({ businessId: id });
    }
  }, [businesses, routeBusinessId, router, userId]);

  const activeBusiness = useMemo(() => {
    if (!effectiveBusinessId) return null;
    return businesses.find((b) => b.id === effectiveBusinessId) ?? null;
  }, [effectiveBusinessId, businesses]);

  const isOwner = useMemo(() => {
    if (isSyntheticPreview) return true;
    if (!activeBusiness || !userId) return false;
    return activeBusiness.owner_user_id === userId;
  }, [isSyntheticPreview, activeBusiness, userId]);

  const value = useMemo<ActiveBusinessContextValue>(
    () => ({
      activeBusinessId: effectiveBusinessId,
      activeBusiness,
      businesses,
      setActiveBusinessId,
      isLoading: !isSyntheticPreview && isServerLoading && Boolean(isSignedIn && userId),
      isSyntheticPreview,
      isOwner,
      businessesError: !isSyntheticPreview && !!serverBusinessesError,
      refetchBusinesses: () => { void refetchAccessibleBusinesses(); },
    }),
    [effectiveBusinessId, activeBusiness, businesses, setActiveBusinessId, isSyntheticPreview, isServerLoading, isSignedIn, userId, isOwner, serverBusinessesError, refetchAccessibleBusinesses]
  );

  return <ActiveBusinessContext.Provider value={value}>{children}</ActiveBusinessContext.Provider>;
}

export function useActiveBusiness(): ActiveBusinessContextValue {
  const ctx = useContext(ActiveBusinessContext);
  if (!ctx) {
    throw new Error('useActiveBusiness requires ActiveBusinessProvider in a route ancestor.');
  }
  return ctx;
}
