import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createBusiness,
  createBusinessWithCategory,
  getBusiness,
  getBusinessDraftDetails,
  getBusinessRepresentativeDraft,
  getMyBusinesses,
  saveBusinessRepresentativeDraft,
  updateBusinessDraft,
  type BusinessDraftDetails,
  type BusinessRepresentativeDraft,
  type CreateBusinessInput,
  type CreateBusinessWithCategoryInput,
  type SaveBusinessRepresentativeDraftInput,
  type UpdateBusinessDraftInput,
} from '../../businesses';
import { requireWowApiSession, useWowApiContext } from '../WowQueryProvider';
import { wowQueryKeys } from '../query-keys';

export function useMyBusinesses() {
  const context = useWowApiContext();
  return useQuery({
    queryKey: wowQueryKeys.businesses.mine(context.userId),
    enabled: !!context.userId,
    queryFn: ({ signal }) => {
      const { client, userId } = requireWowApiSession(context);
      return getMyBusinesses(client, userId, signal);
    },
  });
}

export function useBusiness(businessId?: string | null) {
  const context = useWowApiContext();
  return useQuery({
    queryKey: wowQueryKeys.businesses.detail(businessId ?? null, context.userId),
    enabled: !!context.userId && !!businessId,
    queryFn: ({ signal }) => {
      const { client } = requireWowApiSession(context);
      if (!businessId) throw new Error('A business ID is required.');
      return getBusiness(client, businessId, signal);
    },
  });
}

/** Scoped hook for onboarding draft details with graceful pre-migration fallback. */
export function useBusinessDraftDetails(businessId?: string | null) {
  const context = useWowApiContext();
  return useQuery<BusinessDraftDetails | null>({
    queryKey: wowQueryKeys.businesses.detail(businessId ?? null, context.userId),
    enabled: !!context.userId && !!businessId,
    queryFn: ({ signal }) => {
      const { client } = requireWowApiSession(context);
      if (!businessId) throw new Error('A business ID is required.');
      return getBusinessDraftDetails(client, businessId, signal);
    },
  });
}

export function useCreateBusiness() {
  const context = useWowApiContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBusinessInput) => createBusiness(requireWowApiSession(context).client, input),
    onSuccess: async businessId => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: wowQueryKeys.businesses.mine(context.userId), exact: true }),
        queryClient.invalidateQueries({ queryKey: wowQueryKeys.businesses.detail(businessId, context.userId), exact: true }),
      ]);
    },
  });
}

export function useCreateBusinessWithCategory() {
  const context = useWowApiContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBusinessWithCategoryInput) =>
      createBusinessWithCategory(requireWowApiSession(context).client, input),
    onSuccess: async businessId => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: wowQueryKeys.businesses.mine(context.userId), exact: true }),
        queryClient.invalidateQueries({ queryKey: wowQueryKeys.businesses.detail(businessId, context.userId), exact: true }),
      ]);
    },
  });
}

export function useUpdateBusinessDraft() {
  const context = useWowApiContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateBusinessDraftInput) =>
      updateBusinessDraft(requireWowApiSession(context).client, input),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: wowQueryKeys.businesses.mine(context.userId), exact: true }),
        queryClient.invalidateQueries({ queryKey: wowQueryKeys.businesses.detail(variables.businessId, context.userId), exact: true }),
      ]);
    },
  });
}

/** Scoped hook for representative draft details with graceful pre-migration fallback. */
export function useBusinessRepresentativeDraft(businessId?: string | null) {
  const context = useWowApiContext();
  return useQuery<BusinessRepresentativeDraft | null>({
    queryKey: wowQueryKeys.businesses.representativeDraft(businessId ?? null, context.userId),
    enabled: !!context.userId && !!businessId,
    queryFn: ({ signal }) => {
      const { client } = requireWowApiSession(context);
      if (!businessId) throw new Error('A business ID is required.');
      return getBusinessRepresentativeDraft(client, businessId, signal);
    },
  });
}

export function useSaveBusinessRepresentativeDraft() {
  const context = useWowApiContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveBusinessRepresentativeDraftInput) =>
      saveBusinessRepresentativeDraft(requireWowApiSession(context).client, input),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: wowQueryKeys.businesses.representativeDraft(variables.businessId, context.userId),
          exact: true,
        }),
        queryClient.invalidateQueries({
          queryKey: wowQueryKeys.businesses.detail(variables.businessId, context.userId),
          exact: true,
        }),
      ]);
    },
  });
}
