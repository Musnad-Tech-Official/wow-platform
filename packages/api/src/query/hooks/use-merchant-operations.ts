import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  decideAdminProfileRevision,
  listAdminProfileRevisions,
  listBusinessTeam,
  listMyProfileRevisions,
  setBranchPause,
  setBusinessPause,
  setEmployeeAccess,
  submitProfileRevision,
  updateMerchantDraft,
  type AdminDecideProfileRevisionInput,
  type AdminProfileRevisionsOptions,
  type MerchantProfilePatchTarget,
  type SetBranchPauseInput,
  type SetBusinessPauseInput,
  type SetEmployeeAccessInput,
} from '../../merchant-operations';
import { requireWowApiSession, useWowApiContext } from '../WowQueryProvider';
import { wowQueryKeys } from '../query-keys';

export function useBusinessTeam(businessId?: string | null) {
  const context = useWowApiContext();
  return useQuery({
    queryKey: wowQueryKeys.merchantOperations.team(context.userId, businessId ?? null),
    enabled: !!context.userId && !!businessId,
    queryFn: () => {
      if (!businessId) throw new Error('Business ID required.');
      return listBusinessTeam(requireWowApiSession(context).client, businessId);
    },
  });
}

export function useSetEmployeeAccess() {
  const context = useWowApiContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SetEmployeeAccessInput) =>
      setEmployeeAccess(requireWowApiSession(context).client, input),
    onSuccess: async (_memberId, input) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: wowQueryKeys.merchantOperations.team(context.userId, input.businessId),
        }),
        queryClient.invalidateQueries({ queryKey: wowQueryKeys.branches.business(input.businessId, context.userId) }),
        queryClient.invalidateQueries({ queryKey: wowQueryKeys.offers.merchantRoot(context.userId) }),
      ]);
    },
  });
}

export function useSetBusinessPause() {
  const context = useWowApiContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SetBusinessPauseInput) =>
      setBusinessPause(requireWowApiSession(context).client, input),
    onSuccess: async (_paused, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: wowQueryKeys.businesses.detail(input.businessId, context.userId) }),
        queryClient.invalidateQueries({ queryKey: wowQueryKeys.businesses.mine(context.userId) }),
        queryClient.invalidateQueries({ queryKey: wowQueryKeys.offers.merchantRoot(context.userId) }),
        queryClient.invalidateQueries({ queryKey: wowQueryKeys.discovery.root() }),
      ]);
    },
  });
}

export function useSetBranchPause() {
  const context = useWowApiContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SetBranchPauseInput) =>
      setBranchPause(requireWowApiSession(context).client, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['branches'] }),
        queryClient.invalidateQueries({ queryKey: wowQueryKeys.offers.merchantRoot(context.userId) }),
        queryClient.invalidateQueries({ queryKey: wowQueryKeys.discovery.root() }),
      ]);
    },
  });
}

export function useUpdateMerchantDraft() {
  const context = useWowApiContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MerchantProfilePatchTarget) =>
      updateMerchantDraft(requireWowApiSession(context).client, input),
    onSuccess: async (_updated, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: wowQueryKeys.businesses.detail(input.businessId, context.userId) }),
        queryClient.invalidateQueries({ queryKey: wowQueryKeys.businesses.mine(context.userId) }),
        queryClient.invalidateQueries({ queryKey: wowQueryKeys.branches.business(input.businessId, context.userId) }),
      ]);
    },
  });
}

export function useSubmitProfileRevision() {
  const context = useWowApiContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: MerchantProfilePatchTarget) =>
      submitProfileRevision(requireWowApiSession(context).client, input),
    onSuccess: async (_revisionId, input) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: wowQueryKeys.merchantOperations.revisions(context.userId, input.businessId),
        }),
        queryClient.invalidateQueries({
          queryKey: wowQueryKeys.merchantOperations.adminRoot(context.userId),
        }),
      ]);
    },
  });
}

export function useMyProfileRevisions(businessId?: string | null) {
  const context = useWowApiContext();
  return useQuery({
    queryKey: wowQueryKeys.merchantOperations.revisions(context.userId, businessId ?? null),
    enabled: !!context.userId && !!businessId,
    queryFn: () => {
      if (!businessId) throw new Error('Business ID required.');
      return listMyProfileRevisions(requireWowApiSession(context).client, businessId);
    },
  });
}

export function useAdminProfileRevisions(options: AdminProfileRevisionsOptions = {}) {
  const context = useWowApiContext();
  const { limit = 50, offset = 0 } = options;
  return useQuery({
    queryKey: wowQueryKeys.merchantOperations.adminList(context.userId, limit, offset),
    enabled: !!context.userId,
    queryFn: () => listAdminProfileRevisions(requireWowApiSession(context).client, { limit, offset }),
  });
}

export function useAdminDecideProfileRevision() {
  const context = useWowApiContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AdminDecideProfileRevisionInput) =>
      decideAdminProfileRevision(requireWowApiSession(context).client, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: wowQueryKeys.merchantOperations.adminRoot(context.userId),
        }),
        queryClient.invalidateQueries({
          queryKey: wowQueryKeys.merchantOperations.ownerRoot(context.userId),
        }),
        queryClient.invalidateQueries({ queryKey: ['businesses'] }),
        queryClient.invalidateQueries({ queryKey: ['branches'] }),
        queryClient.invalidateQueries({ queryKey: wowQueryKeys.discovery.root() }),
      ]);
    },
  });
}
