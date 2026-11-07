import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@wow/auth';
import {
  useSavedBusinesses,
  useSavedOffers,
  useSetSavedBusiness,
  useSetSavedOffer,
} from '@wow/api';
import type { SavedBusinessItem, SavedOfferItem } from './favorites-display';

export interface FavoritesFeedback {
  id: string;
  message: string;
  tone: 'success' | 'danger';
}

export interface GuardedRemovalParams<T> {
  id: string;
  kind: 'offer' | 'business';
  inFlightSet: Set<string>;
  mutateAsync: (args: T) => Promise<unknown>;
  mutationArgs: T;
  onPendingChange?: (inFlight: Set<string>) => void;
  onFeedback?: (feedback: FavoritesFeedback) => void;
}

/**
 * Synchronous, race-safe removal execution.
 * Guards in-flight requests synchronously using inFlightSet before returning a Promise,
 * preventing race conditions from simultaneous/rapid user taps before React re-renders.
 */
export async function executeGuardedRemoval<T>({
  id,
  kind,
  inFlightSet,
  mutateAsync,
  mutationArgs,
  onPendingChange,
  onFeedback,
}: GuardedRemovalParams<T>): Promise<boolean> {
  // Synchronous guard: reject duplicate requests immediately
  if (inFlightSet.has(id)) {
    return false;
  }
  inFlightSet.add(id);
  onPendingChange?.(new Set(inFlightSet));

  try {
    await mutateAsync(mutationArgs);
    onFeedback?.({
      id: `${kind}-success-${id}-${Date.now()}`,
      message:
        kind === 'offer'
          ? 'تمت إزالة العرض من المفضلة بنجاح'
          : 'تمت إزالة المتجر من المفضلة بنجاح',
      tone: 'success',
    });
    return true;
  } catch {
    onFeedback?.({
      id: `${kind}-error-${id}-${Date.now()}`,
      message:
        kind === 'offer'
          ? 'تعذر إزالة العرض من المفضلة. يرجى التحقق من اتصالك والمحاولة مجدداً.'
          : 'تعذر إزالة المتجر من المفضلة. يرجى التحقق من اتصالك والمحاولة مجدداً.',
      tone: 'danger',
    });
    return false;
  } finally {
    inFlightSet.delete(id);
    onPendingChange?.(new Set(inFlightSet));
  }
}

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

  // 3. User feedback state for mutation success / failure
  const [feedback, setFeedback] = useState<FavoritesFeedback | null>(null);

  const clearFeedback = useCallback(() => {
    setFeedback(null);
  }, []);

  // 4. Synchronous race-safe tracking refs + React UI state for per-item pending indicators
  const pendingOfferIdsRef = useRef<Set<string>>(new Set());
  const pendingBusinessIdsRef = useRef<Set<string>>(new Set());
  const [pendingOfferIds, setPendingOfferIds] = useState<Set<string>>(new Set());
  const [pendingBusinessIds, setPendingBusinessIds] = useState<Set<string>>(new Set());

  // Session isolation: reset in-flight ref tracking on account change or sign-out
  useEffect(() => {
    pendingOfferIdsRef.current.clear();
    pendingBusinessIdsRef.current.clear();
  }, [userId, isSignedIn]);

  const setSavedOfferMutation = useSetSavedOffer();
  const setSavedBusinessMutation = useSetSavedBusiness();

  const removeOffer = useCallback(
    async (offerId: string): Promise<boolean> => {
      return executeGuardedRemoval({
        id: offerId,
        kind: 'offer',
        inFlightSet: pendingOfferIdsRef.current,
        mutateAsync: setSavedOfferMutation.mutateAsync,
        mutationArgs: { offerId, save: false },
        onPendingChange: setPendingOfferIds,
        onFeedback: setFeedback,
      });
    },
    [setSavedOfferMutation.mutateAsync],
  );

  const removeBusiness = useCallback(
    async (businessId: string): Promise<boolean> => {
      return executeGuardedRemoval({
        id: businessId,
        kind: 'business',
        inFlightSet: pendingBusinessIdsRef.current,
        mutateAsync: setSavedBusinessMutation.mutateAsync,
        mutationArgs: { businessId, save: false },
        onPendingChange: setPendingBusinessIds,
        onFeedback: setFeedback,
      });
    },
    [setSavedBusinessMutation.mutateAsync],
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
    feedback,
    clearFeedback,
    removeOffer,
    removeBusiness,
    refetch,
  };
}
