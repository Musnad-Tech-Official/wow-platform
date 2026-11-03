import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  decideAdminBusinessVerification,
  getAdminBusinessVerification,
  getBusinessVerifications,
  listAdminBusinessVerifications,
  resubmitBusinessVerification,
  submitBusinessVerification,
  type AdminVerificationListFilters,
  type DecideBusinessVerificationInput,
  type ResubmitBusinessVerificationInput,
  type SubmitBusinessVerificationInput,
} from '../../verifications';
import { requireWowApiSession, useWowApiContext } from '../WowQueryProvider';
import { wowQueryKeys } from '../query-keys';

export function useBusinessVerifications(businessId?: string | null) {
  const context = useWowApiContext();
  return useQuery({
    queryKey: wowQueryKeys.verifications.business(businessId ?? null, context.userId),
    enabled: !!context.userId && !!businessId,
    queryFn: () => {
      if (!businessId) throw new Error('A business ID is required.');
      return getBusinessVerifications(requireWowApiSession(context).client, businessId);
    },
  });
}

export function useSubmitBusinessVerification() {
  const context = useWowApiContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SubmitBusinessVerificationInput) =>
      submitBusinessVerification(requireWowApiSession(context).client, input),
    onSuccess: async (_id, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: wowQueryKeys.verifications.business(input.businessId, context.userId) }),
        queryClient.invalidateQueries({ queryKey: wowQueryKeys.businesses.detail(input.businessId, context.userId) }),
        queryClient.invalidateQueries({ queryKey: wowQueryKeys.branches.business(input.businessId, context.userId) }),
      ]);
    },
  });
}

export function useResubmitBusinessVerification() {
  const context = useWowApiContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ResubmitBusinessVerificationInput) =>
      resubmitBusinessVerification(requireWowApiSession(context).client, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['verifications', 'business'] });
    },
  });
}

export function useAdminBusinessVerifications(filters: AdminVerificationListFilters = {}) {
  const context = useWowApiContext();
  const { status = 'submitted', limit = 50, offset = 0 } = filters;
  return useQuery({
    queryKey: wowQueryKeys.verifications.adminList(context.userId, status, limit, offset),
    enabled: !!context.userId,
    queryFn: () => listAdminBusinessVerifications(requireWowApiSession(context).client, { status, limit, offset }),
  });
}

export function useAdminBusinessVerification(verificationId?: string | null) {
  const context = useWowApiContext();
  return useQuery({
    queryKey: wowQueryKeys.verifications.adminDetail(verificationId ?? null, context.userId),
    enabled: !!context.userId && !!verificationId,
    queryFn: () => {
      if (!verificationId) throw new Error('A verification ID is required.');
      return getAdminBusinessVerification(requireWowApiSession(context).client, verificationId);
    },
  });
}

export function useAdminDecideBusinessVerification() {
  const context = useWowApiContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: DecideBusinessVerificationInput) =>
      decideAdminBusinessVerification(requireWowApiSession(context).client, input),
    onSuccess: async (_id, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: wowQueryKeys.verifications.adminLists(context.userId) }),
        queryClient.invalidateQueries({ queryKey: wowQueryKeys.verifications.adminDetail(input.verificationId, context.userId) }),
        queryClient.invalidateQueries({ queryKey: ['businesses'] }),
        queryClient.invalidateQueries({ queryKey: ['branches'] }),
      ]);
    },
  });
}
