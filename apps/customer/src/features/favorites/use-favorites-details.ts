import { useCallback, useMemo, useState } from 'react';
import { useAuth } from '@wow/auth';
import {
  useSavedBusinesses,
  useSavedOffers,
  useSetSavedBusiness,
  useSetSavedOffer,
} from '@wow/api';
import type { SavedBusinessItem, SavedOfferItem } from './favorites-display';

export function useFavoritesDetails() {
  const { userId, isSignedIn } = useAuth();

  // 1. Fetch user-scoped saved bookmarks (IDs and timestamps)
  const savedOffersQuery = useSavedOffers();
  const savedBusinessesQuery = useSavedBusinesses();

  // 2. Map saved items to typed display items with strict ID deduplication
  const savedOffers: SavedOfferItem[] = useMemo(() => {
    if (!isSignedIn || !savedOffersQuery.data) return [];
    const seen = new Set<string>();
    const items: SavedOfferItem[] = [];
    for (const item of savedOffersQuery.data) {
      if (!seen.has(item.offer_id)) {
        seen.add(item.offer_id);
        items.push({
          id: item.id,
          offerId: item.offer_id,
          createdAt: item.created_at,
        });
      }
    }
    return items;
  }, [isSignedIn, savedOffersQuery.data]);

  const savedBusinesses: SavedBusinessItem[] = useMemo(() => {
    if (!isSignedIn || !savedBusinessesQuery.data) return [];
    const seen = new Set<string>();
    const items: SavedBusinessItem[] = [];
    for (const item of savedBusinessesQuery.data) {
      if (!seen.has(item.business_id)) {
        seen.add(item.business_id);
        items.push({
          id: item.id,
          businessId: item.business_id,
          createdAt: item.created_at,
        });
      }
    }
    return items;
  }, [isSignedIn, savedBusinessesQuery.data]);

  // 3. Mutations with per-item pending state and duplicate request prevention
  const setSavedOfferMutation = useSetSavedOffer();
  const setSavedBusinessMutation = useSetSavedBusiness();
  const [pendingOfferIds, setPendingOfferIds] = useState<Set<string>>(new Set());
  const [pendingBusinessIds, setPendingBusinessIds] = useState<Set<string>>(new Set());

  const removeOffer = useCallback(
    async (offerId: string) => {
      if (pendingOfferIds.has(offerId)) return;
      setPendingOfferIds((prev) => new Set(prev).add(offerId));
      try {
        await setSavedOfferMutation.mutateAsync({ offerId, save: false });
      } finally {
        setPendingOfferIds((prev) => {
          const next = new Set(prev);
          next.delete(offerId);
          return next;
        });
      }
    },
    [pendingOfferIds, setSavedOfferMutation],
  );

  const removeBusiness = useCallback(
    async (businessId: string) => {
      if (pendingBusinessIds.has(businessId)) return;
      setPendingBusinessIds((prev) => new Set(prev).add(businessId));
      try {
        await setSavedBusinessMutation.mutateAsync({ businessId, save: false });
      } finally {
        setPendingBusinessIds((prev) => {
          const next = new Set(prev);
          next.delete(businessId);
          return next;
        });
      }
    },
    [pendingBusinessIds, setSavedBusinessMutation],
  );

  const isLoading =
    Boolean(isSignedIn) && (savedOffersQuery.isLoading || savedBusinessesQuery.isLoading);

  const isError =
    Boolean(isSignedIn) && (savedOffersQuery.isError || savedBusinessesQuery.isError);

  const refetch = useCallback(async () => {
    await Promise.all([savedOffersQuery.refetch(), savedBusinessesQuery.refetch()]);
  }, [savedOffersQuery, savedBusinessesQuery]);

  return {
    isSignedIn: Boolean(isSignedIn),
    userId: userId ?? null,
    savedOffers,
    savedBusinesses,
    offersCount: savedOffers.length,
    businessesCount: savedBusinesses.length,
    isLoading,
    isError,
    pendingOfferIds,
    pendingBusinessIds,
    removeOffer,
    removeBusiness,
    refetch,
  };
}
