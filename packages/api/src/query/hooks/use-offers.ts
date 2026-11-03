import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createOffer,
  decideAdminOffer,
  getBusinessOffers,
  getOfferVersionDetails,
  getOfferVersions,
  getAdminOfferReview,
  listAdminPendingOffers,
  saveOfferDraft,
  setOfferAvailability,
  submitOffer,
  type AdminDecideOfferInput,
  type AdminOfferListOptions,
  type CreateOfferInput,
  type SaveOfferDraftInput,
  type SetOfferAvailabilityInput,
} from '../../offers';
import { requireWowApiSession, useWowApiContext } from '../WowQueryProvider';
import { wowQueryKeys } from '../query-keys';

export function useBusinessOffers(businessId?: string | null) {
  const context = useWowApiContext();
  return useQuery({
    queryKey: wowQueryKeys.offers.business(businessId ?? null, context.userId),
    enabled: !!context.userId && !!businessId,
    queryFn: ({ signal }) => {
      if (!businessId) throw new Error('Business ID required.');
      return getBusinessOffers(requireWowApiSession(context).client, businessId, signal);
    },
  });
}

export function useOfferVersions(offerId?: string | null) {
  const context = useWowApiContext();
  return useQuery({
    queryKey: wowQueryKeys.offers.versions(offerId ?? null, context.userId),
    enabled: !!context.userId && !!offerId,
    queryFn: ({ signal }) => {
      if (!offerId) throw new Error('Offer ID required.');
      return getOfferVersions(requireWowApiSession(context).client, offerId, signal);
    },
  });
}

export function useOfferVersionDetails(versionId?: string | null) {
  const context = useWowApiContext();
  return useQuery({
    queryKey: wowQueryKeys.offers.version(versionId ?? null, context.userId),
    enabled: !!context.userId && !!versionId,
    queryFn: ({ signal }) => {
      if (!versionId) throw new Error('Offer version ID required.');
      return getOfferVersionDetails(requireWowApiSession(context).client, versionId, signal);
    },
  });
}

export function useCreateOffer() {
  const context = useWowApiContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOfferInput) =>
      createOffer(requireWowApiSession(context).client, input),
    onSuccess: async (_offerId, input) => {
      await queryClient.invalidateQueries({
        queryKey: wowQueryKeys.offers.business(input.businessId, context.userId),
      });
    },
  });
}

export function useSaveOfferDraft() {
  const context = useWowApiContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveOfferDraftInput) =>
      saveOfferDraft(requireWowApiSession(context).client, input),
    onSuccess: async (versionId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: wowQueryKeys.offers.merchantRoot(context.userId) }),
        queryClient.invalidateQueries({ queryKey: wowQueryKeys.offers.version(versionId, context.userId) }),
      ]);
    },
  });
}

export function useSubmitOffer() {
  const context = useWowApiContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (offerId: string) =>
      submitOffer(requireWowApiSession(context).client, offerId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: wowQueryKeys.offers.merchantRoot(context.userId) }),
        queryClient.invalidateQueries({ queryKey: wowQueryKeys.offers.adminRoot(context.userId) }),
      ]);
    },
  });
}

export function useSetOfferAvailability() {
  const context = useWowApiContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SetOfferAvailabilityInput) =>
      setOfferAvailability(requireWowApiSession(context).client, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: wowQueryKeys.offers.merchantRoot(context.userId) }),
        queryClient.invalidateQueries({ queryKey: ['discovery'] }),
      ]);
    },
  });
}

export function useAdminPendingOffers(options: AdminOfferListOptions = {}) {
  const context = useWowApiContext();
  const { limit = 50, offset = 0 } = options;
  return useQuery({
    queryKey: wowQueryKeys.offers.adminList(limit, offset, context.userId),
    enabled: !!context.userId,
    queryFn: () => listAdminPendingOffers(requireWowApiSession(context).client, { limit, offset }),
  });
}

export function useAdminOfferReview(versionId?: string | null) {
  const context = useWowApiContext();
  return useQuery({
    queryKey: wowQueryKeys.offers.adminDetail(versionId ?? null, context.userId),
    enabled: !!context.userId && !!versionId,
    queryFn: () => {
      if (!versionId) throw new Error('Offer version ID required.');
      return getAdminOfferReview(requireWowApiSession(context).client, versionId);
    },
  });
}

export function useAdminDecideOffer() {
  const context = useWowApiContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AdminDecideOfferInput) =>
      decideAdminOffer(requireWowApiSession(context).client, input),
    onSuccess: async (_versionId, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: wowQueryKeys.offers.adminRoot(context.userId) }),
        queryClient.invalidateQueries({ queryKey: wowQueryKeys.offers.adminDetail(input.versionId, context.userId) }),
        queryClient.invalidateQueries({ queryKey: wowQueryKeys.offers.merchantRoot(context.userId) }),
        queryClient.invalidateQueries({ queryKey: ['discovery'] }),
        queryClient.invalidateQueries({ queryKey: ['billing'] }),
      ]);
    },
  });
}
