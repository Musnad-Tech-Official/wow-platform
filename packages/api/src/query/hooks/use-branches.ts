import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createBranch,
  deleteDraftBranch,
  getBusinessBranches,
  updateBranchDraft,
  type CreateBranchInput,
  type UpdateBranchDraftInput,
} from '../../branches';
import { requireWowApiSession, useWowApiContext } from '../WowQueryProvider';
import { wowQueryKeys } from '../query-keys';

export function useBusinessBranches(businessId?: string | null) {
  const context = useWowApiContext();
  return useQuery({
    queryKey: wowQueryKeys.branches.business(businessId ?? null, context.userId),
    enabled: !!context.userId && !!businessId,
    queryFn: ({ signal }) => {
      const { client } = requireWowApiSession(context);
      if (!businessId) throw new Error('A business ID is required.');
      return getBusinessBranches(client, businessId, signal);
    },
  });
}

export function useCreateBranch() {
  const context = useWowApiContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBranchInput) => createBranch(requireWowApiSession(context).client, input),
    onSuccess: async (_branchId, input) => {
      await queryClient.invalidateQueries({ queryKey: wowQueryKeys.branches.business(input.businessId, context.userId), exact: true });
    },
  });
}

export function useUpdateBranchDraft() {
  const context = useWowApiContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateBranchDraftInput) => updateBranchDraft(requireWowApiSession(context).client, input),
    onSuccess: async (_result, input) => {
      await queryClient.invalidateQueries({ queryKey: wowQueryKeys.branches.business(input.businessId, context.userId), exact: true });
    },
  });
}

export function useDeleteDraftBranch() {
  const context = useWowApiContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ businessId, branchId }: { businessId: string; branchId: string }) =>
      deleteDraftBranch(requireWowApiSession(context).client, businessId, branchId),
    onSuccess: async (_result, { businessId }) => {
      await queryClient.invalidateQueries({ queryKey: wowQueryKeys.branches.business(businessId, context.userId), exact: true });
    },
  });
}
