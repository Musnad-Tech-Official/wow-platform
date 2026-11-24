import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  adminModerateRating,
  adminUpdateComplaint,
  adminRequestMerchantResponse,
  getAdminComplaint,
  getBusinessComplaints,
  getMerchantComplaint,
  getMyComplaintById,
  getMyComplaints,
  getMyRatings,
  getCustomerAssessmentOffer,
  type AssessmentPurpose,
  getSavedBusinesses,
  getSavedOffers,
  listAdminComplaints,
  listAdminRatings,
  merchantRespondComplaint,
  rateOffer,
  setSavedBusiness,
  setSavedOffer,
  submitComplaint,
  type CustomerComplaint,
  type AdminComplaintsListOptions,
  type AdminModerateRatingInput,
  type AdminRatingsListOptions,
  type AdminUpdateComplaintInput,
  type AdminRequestMerchantResponseInput,
  type MerchantComplaintListOptions,
  type MerchantComplaintResponseInput,
  type Pagination,
  type RateOfferInput,
  type SetSavedBusinessInput,
  type SetSavedOfferInput,
  type SubmitComplaintInput,
} from '../../customer-interactions';
import { requireWowApiSession, useWowApiContext } from '../WowQueryProvider';
import { wowQueryKeys } from '../query-keys';
import { uuid } from '../../integration/helpers';

export function useSavedOffers() {
  const context = useWowApiContext();
  return useQuery({
    queryKey: wowQueryKeys.interactions.savedOffers(context.userId),
    enabled: !!context.userId,
    queryFn: ({ signal }) => {
      const { client, userId } = requireWowApiSession(context);
      return getSavedOffers(client, userId, signal);
    },
  });
}

export function useSavedBusinesses() {
  const context = useWowApiContext();
  return useQuery({
    queryKey: wowQueryKeys.interactions.savedBusinesses(context.userId),
    enabled: !!context.userId,
    queryFn: ({ signal }) => {
      const { client, userId } = requireWowApiSession(context);
      return getSavedBusinesses(client, userId, signal);
    },
  });
}

export function useSetSavedOffer() {
  const context = useWowApiContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SetSavedOfferInput) =>
      setSavedOffer(requireWowApiSession(context).client, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: wowQueryKeys.interactions.savedOffers(context.userId),
      });
    },
  });
}

export function useSetSavedBusiness() {
  const context = useWowApiContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SetSavedBusinessInput) =>
      setSavedBusiness(requireWowApiSession(context).client, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: wowQueryKeys.interactions.savedBusinesses(context.userId),
      });
    },
  });
}

export function useCustomerAssessmentOffer(offerId: string | null, purpose: AssessmentPurpose) {
  const context = useWowApiContext();
  return useQuery({
    queryKey: wowQueryKeys.interactions.assessmentOffer(context.userId, offerId, purpose),
    enabled: !!context.userId && !!offerId && uuid(offerId),
    queryFn: () => {
      if (!offerId) throw new Error('An offer ID is required.');
      return getCustomerAssessmentOffer(requireWowApiSession(context).client, offerId, purpose);
    },
    staleTime: 0,
  });
}

export function useMyRatings(options: Pagination = {}) {
  const context = useWowApiContext();
  const { limit = 50, offset = 0 } = options;
  return useQuery({
    queryKey: wowQueryKeys.interactions.myRatings(context.userId, limit, offset),
    enabled: !!context.userId,
    queryFn: () => getMyRatings(requireWowApiSession(context).client, { limit, offset }),
  });
}

export function useRateOffer() {
  const context = useWowApiContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RateOfferInput) =>
      rateOffer(requireWowApiSession(context).client, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: wowQueryKeys.interactions.myRatingsRoot(context.userId),
      });
    },
  });
}

export function useMyComplaints(options: Pagination = {}) {
  const context = useWowApiContext();
  const { limit = 50, offset = 0 } = options;
  return useQuery({
    queryKey: wowQueryKeys.interactions.myComplaints(context.userId, limit, offset),
    enabled: !!context.userId,
    queryFn: () => getMyComplaints(requireWowApiSession(context).client, { limit, offset }),
  });
}

export function useMyComplaint(complaintId?: string | null) {
  const context = useWowApiContext();
  const queryClient = useQueryClient();
  const isValidUuid = Boolean(complaintId && uuid(complaintId));

  return useQuery({
    queryKey: wowQueryKeys.interactions.myComplaint(context.userId, isValidUuid ? (complaintId ?? null) : null),
    enabled: !!context.userId && isValidUuid,
    queryFn: async () => {
      if (!complaintId) throw new Error('A complaint ID is required.');
      const { client } = requireWowApiSession(context);
      return getMyComplaintById(client, complaintId);
    },
    initialData: () => {
      if (!context.userId || !isValidUuid || !complaintId) return undefined;
      const queries = queryClient.getQueriesData<CustomerComplaint[]>({
        queryKey: wowQueryKeys.interactions.myComplaintsRoot(context.userId),
      });
      for (const [, complaints] of queries) {
        if (Array.isArray(complaints)) {
          const match = complaints.find((c) => c && c.id && c.id.toLowerCase() === complaintId.toLowerCase());
          if (match) return match;
        }
      }
      return undefined;
    },
  });
}

export function useSubmitComplaint() {
  const context = useWowApiContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SubmitComplaintInput) =>
      submitComplaint(requireWowApiSession(context).client, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: wowQueryKeys.interactions.myComplaintsRoot(context.userId),
      });
    },
  });
}

export function useBusinessComplaints(options?: MerchantComplaintListOptions | null) {
  const context = useWowApiContext();
  const businessId = options?.businessId ?? null;
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;
  return useQuery({
    queryKey: wowQueryKeys.interactions.merchantComplaints(businessId, context.userId, limit, offset),
    enabled: !!context.userId && !!businessId,
    queryFn: () => {
      if (!businessId) throw new Error('A business ID is required.');
      return getBusinessComplaints(requireWowApiSession(context).client, { businessId, limit, offset });
    },
  });
}

export function useMerchantRespondComplaint() {
  const context = useWowApiContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MerchantComplaintResponseInput) =>
      merchantRespondComplaint(requireWowApiSession(context).client, input),
    onSuccess: async (_data, input) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: wowQueryKeys.interactions.merchantComplaintsRoot(context.userId),
        }),
        queryClient.invalidateQueries({
          queryKey: wowQueryKeys.interactions.merchantComplaint(context.userId, input.complaintId),
        }),
      ]);
    },
  });
}

export function useMerchantComplaint(complaintId?: string | null) {
  const context = useWowApiContext();
  return useQuery({
    queryKey: wowQueryKeys.interactions.merchantComplaint(context.userId, complaintId ?? null),
    enabled: !!context.userId && !!complaintId,
    queryFn: () => {
      if (!complaintId) throw new Error('A complaint ID is required.');
      return getMerchantComplaint(requireWowApiSession(context).client, complaintId);
    },
  });
}

export function useAdminRatings(options: AdminRatingsListOptions = {}) {
  const context = useWowApiContext();
  const { moderationStatus = null, limit = 50, offset = 0 } = options;
  return useQuery({
    queryKey: wowQueryKeys.interactions.adminRatings(context.userId, moderationStatus, limit, offset),
    enabled: !!context.userId,
    queryFn: () => listAdminRatings(requireWowApiSession(context).client, { moderationStatus, limit, offset }),
  });
}

export function useAdminModerateRating() {
  const context = useWowApiContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AdminModerateRatingInput) =>
      adminModerateRating(requireWowApiSession(context).client, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: wowQueryKeys.interactions.adminRatingsRoot(context.userId),
      });
    },
  });
}

export function useAdminComplaints(options: AdminComplaintsListOptions = {}) {
  const context = useWowApiContext();
  const { status = null, limit = 50, offset = 0 } = options;
  return useQuery({
    queryKey: wowQueryKeys.interactions.adminComplaints(context.userId, status, limit, offset),
    enabled: !!context.userId,
    queryFn: () => listAdminComplaints(requireWowApiSession(context).client, { status, limit, offset }),
  });
}

export function useAdminComplaint(complaintId?: string | null) {
  const context = useWowApiContext();
  return useQuery({
    queryKey: wowQueryKeys.interactions.adminComplaint(context.userId, complaintId ?? null),
    enabled: !!context.userId && !!complaintId,
    queryFn: () => {
      if (!complaintId) throw new Error('A complaint ID is required.');
      return getAdminComplaint(requireWowApiSession(context).client, complaintId);
    },
  });
}

export function useAdminRequestMerchantResponse() {
  const context = useWowApiContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AdminRequestMerchantResponseInput) =>
      adminRequestMerchantResponse(requireWowApiSession(context).client, input),
    onSuccess: async (_id, input) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: wowQueryKeys.interactions.adminComplaintsRoot(context.userId),
        }),
        queryClient.invalidateQueries({
          queryKey: wowQueryKeys.interactions.adminComplaint(context.userId, input.complaintId),
        }),
      ]);
    },
  });
}

export function useAdminUpdateComplaint() {
  const context = useWowApiContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AdminUpdateComplaintInput) =>
      adminUpdateComplaint(requireWowApiSession(context).client, input),
    onSuccess: async (_id, input) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: wowQueryKeys.interactions.adminComplaintsRoot(context.userId),
        }),
        queryClient.invalidateQueries({
          queryKey: wowQueryKeys.interactions.adminComplaint(context.userId, input.complaintId),
        }),
      ]);
    },
  });
}
