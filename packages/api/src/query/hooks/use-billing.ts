import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  activateBusinessTrial,
  adminConfigureSubscriptionPlan,
  adminCreateCommercialAgreement,
  adminDecideSubscriptionPayment,
  adminListSubscriptionPayments,
  adminRevokeCommercialAgreement,
  getBusinessBilling,
  listSubscriptionPlans,
  requestPaidSubscription,
  submitSubscriptionPayment,
  type AdminConfigureSubscriptionPlanInput,
  type AdminCreateCommercialAgreementInput,
  type AdminDecideSubscriptionPaymentInput,
  type AdminPaymentListOptions,
  type AdminRevokeCommercialAgreementInput,
  type RequestPaidSubscriptionInput,
  type SubmitSubscriptionPaymentInput,
} from '../../billing';
import { requireWowApiSession, useWowApiContext } from '../WowQueryProvider';
import { wowQueryKeys } from '../query-keys';

export function useSubscriptionPlans() {
  const context = useWowApiContext();
  return useQuery({
    queryKey: wowQueryKeys.billing.plans(context.userId),
    enabled: !!context.userId,
    queryFn: () => listSubscriptionPlans(requireWowApiSession(context).client),
  });
}

export function useBusinessBilling(businessId?: string | null) {
  const context = useWowApiContext();
  return useQuery({
    queryKey: wowQueryKeys.billing.business(context.userId, businessId ?? null),
    enabled: !!context.userId && !!businessId,
    queryFn: () => {
      if (!businessId) throw new Error('A business ID is required.');
      return getBusinessBilling(requireWowApiSession(context).client, businessId);
    },
  });
}

export function useActivateBusinessTrial() {
  const context = useWowApiContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (businessId: string) => activateBusinessTrial(requireWowApiSession(context).client, businessId),
    onSuccess: async (_trialId, businessId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: wowQueryKeys.billing.business(context.userId, businessId) }),
        queryClient.invalidateQueries({ queryKey: ['discovery'] }),
      ]);
    },
  });
}

export function useRequestPaidSubscription() {
  const context = useWowApiContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RequestPaidSubscriptionInput) =>
      requestPaidSubscription(requireWowApiSession(context).client, input),
    onSuccess: async (_subscriptionId, input) => {
      await queryClient.invalidateQueries({
        queryKey: wowQueryKeys.billing.business(context.userId, input.businessId),
      });
    },
  });
}

export function useSubmitSubscriptionPayment() {
  const context = useWowApiContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SubmitSubscriptionPaymentInput) =>
      submitSubscriptionPayment(requireWowApiSession(context).client, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: wowQueryKeys.billing.businessRoot(context.userId) }),
        queryClient.invalidateQueries({ queryKey: wowQueryKeys.billing.adminPaymentsRoot(context.userId) }),
      ]);
    },
  });
}

export function useAdminSubscriptionPayments(options: AdminPaymentListOptions = {}, canQuery = true) {
  const context = useWowApiContext();
  const { status = null, limit = 50, offset = 0 } = options;
  return useQuery({
    queryKey: wowQueryKeys.billing.adminPayments(context.userId, status, limit, offset),
    enabled: !!context.userId && canQuery,
    queryFn: () => adminListSubscriptionPayments(
      requireWowApiSession(context).client, { status, limit, offset },
    ),
  });
}

export function useAdminConfigureSubscriptionPlan() {
  const context = useWowApiContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AdminConfigureSubscriptionPlanInput) =>
      adminConfigureSubscriptionPlan(requireWowApiSession(context).client, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: wowQueryKeys.billing.plans(context.userId) });
    },
  });
}

export function useAdminDecideSubscriptionPayment() {
  const context = useWowApiContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AdminDecideSubscriptionPaymentInput) =>
      adminDecideSubscriptionPayment(requireWowApiSession(context).client, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: wowQueryKeys.billing.adminPaymentsRoot(context.userId) }),
        queryClient.invalidateQueries({ queryKey: wowQueryKeys.billing.businessRoot(context.userId) }),
        queryClient.invalidateQueries({ queryKey: ['discovery'] }),
      ]);
    },
  });
}

export function useAdminCreateCommercialAgreement() {
  const context = useWowApiContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AdminCreateCommercialAgreementInput) =>
      adminCreateCommercialAgreement(requireWowApiSession(context).client, input),
    onSuccess: async (_id, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: wowQueryKeys.billing.business(context.userId, input.businessId) }),
        queryClient.invalidateQueries({ queryKey: ['discovery'] }),
      ]);
    },
  });
}

export function useAdminRevokeCommercialAgreement() {
  const context = useWowApiContext();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AdminRevokeCommercialAgreementInput) =>
      adminRevokeCommercialAgreement(requireWowApiSession(context).client, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: wowQueryKeys.billing.businessRoot(context.userId) }),
        queryClient.invalidateQueries({ queryKey: ['discovery'] }),
      ]);
    },
  });
}
