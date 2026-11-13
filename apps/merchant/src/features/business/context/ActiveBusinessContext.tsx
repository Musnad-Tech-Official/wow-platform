import React, { createContext, useContext, useState, useMemo, type PropsWithChildren } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useAccessibleMerchantBusinesses, type Business } from '@wow/api';
import { useAuth } from '@wow/auth';

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

  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(
    initialBusinessId ?? searchParams.businessId ?? null
  );

  const effectiveBusinessId = useMemo(() => {
    if (isSyntheticPreview) {
      return selectedBusinessId || PREVIEW_BUSINESS_FIXTURE.id;
    }
    if (selectedBusinessId && businesses.some((b) => b.id === selectedBusinessId)) {
      return selectedBusinessId;
    }
    if (searchParams.businessId && businesses.some((b) => b.id === searchParams.businessId)) {
      return searchParams.businessId;
    }
    return businesses.length > 0 ? businesses[0].id : null;
  }, [isSyntheticPreview, selectedBusinessId, searchParams.businessId, businesses]);

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
      setActiveBusinessId: setSelectedBusinessId,
      isLoading: !isSyntheticPreview && isServerLoading && Boolean(isSignedIn && userId),
      isSyntheticPreview,
      isOwner,
      businessesError: !isSyntheticPreview && !!serverBusinessesError,
      refetchBusinesses: () => { void refetchAccessibleBusinesses(); },
    }),
    [effectiveBusinessId, activeBusiness, businesses, isSyntheticPreview, isServerLoading, isSignedIn, userId, isOwner, serverBusinessesError, refetchAccessibleBusinesses]
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
