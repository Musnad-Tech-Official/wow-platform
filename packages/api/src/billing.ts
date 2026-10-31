import type { WowSupabaseClient } from './supabase/client';
import { uuid } from './integration/helpers';

export type PlanCode = 'BASIC' | 'ADVANCED';
export type Money = string | number;
export type PaymentMethod = 'cash' | 'bank_transfer' | 'wallet' | 'other';
export type PaymentStatus = 'submitted' | 'verified' | 'rejected';
export type AgreementType = 'exemption' | 'partnership' | 'other';
export type AgreementStatus = 'approved' | 'revoked';

export interface SubscriptionPlan {
  code: PlanCode;
  name: string;
  price: Money;
  currency: string;
  duration_days: number;
  feature_limits: Record<string, unknown>;
}
export interface SubscriptionRecord {
  id: string;
  kind: 'trial' | 'paid';
  status: 'pending' | 'active' | 'expired' | 'cancelled';
  plan_snapshot: (Record<string, unknown> & { code?: PlanCode; price?: Money }) | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
}
export interface SubscriptionPayment {
  id: string;
  subscription_id: string;
  amount: Money;
  currency: string;
  method: PaymentMethod;
  reference: string;
  status: PaymentStatus;
  created_at: string;
  verified_at: string | null;
}
export interface CommercialAgreement {
  id: string;
  agreement_type: AgreementType;
  grants_publication: boolean;
  starts_at: string;
  ends_at: string | null;
  status: AgreementStatus;
}
export interface BusinessBilling {
  business_id: string;
  has_publication_entitlement: boolean;
  subscriptions: SubscriptionRecord[];
  payments: SubscriptionPayment[];
  agreements: CommercialAgreement[];
}
export interface AdminSubscriptionPayment {
  payment_id: string;
  business_id: string;
  subscription_id: string;
  amount: Money;
  currency: string;
  method: PaymentMethod;
  reference: string;
  status: PaymentStatus;
  created_at: string;
}
export interface AdminPaymentListOptions {
  status?: PaymentStatus | null;
  limit?: number;
  offset?: number;
}
export interface RequestPaidSubscriptionInput {
  businessId: string;
  planCode: PlanCode;
}
export interface SubmitSubscriptionPaymentInput {
  subscriptionId: string;
  method: PaymentMethod;
  /** Manual payment reference; NOT proof or an automatic payment confirmation. */
  reference: string;
}
export interface AdminConfigureSubscriptionPlanInput {
  code: PlanCode;
  price: Money | null;
  currency: string | null;
  durationDays: number | null;
  featureLimits: Record<string, unknown>;
  active: boolean;
}
export interface AdminDecideSubscriptionPaymentInput {
  paymentId: string;
  approve: boolean;
  /** Verified independently by an authorized administrator; 10–1500 chars. */
  note: string;
}
export interface AdminCreateCommercialAgreementInput {
  businessId: string;
  agreementType: AgreementType;
  grantsPublication: boolean;
  startsAt: string;
  endsAt?: string | null;
  termsSnapshot: Record<string, unknown>;
  reason: string;
}
export interface AdminRevokeCommercialAgreementInput {
  agreementId: string;
  reason: string;
}

function requiredUuid(data: unknown, rpc: string): string {
  if (!uuid(data)) throw new Error(`${rpc} returned no scalar UUID. Verify write outcome before retrying.`);
  return data;
}

function requiredArray<T>(data: unknown, rpc: string): T[] {
  if (!Array.isArray(data)) throw new Error(`${rpc} did not return a JSON array.`);
  return data as T[];
}

function requiredObject<T>(data: unknown, rpc: string): T {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(`${rpc} did not return a JSON object.`);
  }
  return data as T;
}

/** Only active plans are exposed. The RPC requires an active authenticated user. */
export async function listSubscriptionPlans(client: WowSupabaseClient): Promise<SubscriptionPlan[]> {
  const { data, error } = await client.rpc('wow_list_subscription_plans');
  if (error) throw error;
  return requiredArray<SubscriptionPlan>(data, 'wow_list_subscription_plans');
}

/** Owner-only projection. No audit records, customer data or raw payment proofs. */
export async function getBusinessBilling(
  client: WowSupabaseClient, businessId: string,
): Promise<BusinessBilling> {
  const { data, error } = await client.rpc('wow_get_business_billing', { p_business_id: businessId });
  if (error) throw error;
  return requiredObject<BusinessBilling>(data, 'wow_get_business_billing');
}

/** A 30-day trial can be activated once, only after an approved live offer on an approved branch. */
export async function activateBusinessTrial(
  client: WowSupabaseClient, businessId: string,
): Promise<string> {
  const { data, error } = await client.rpc('wow_activate_business_trial', { p_business_id: businessId });
  if (error) throw error;
  return requiredUuid(data, 'wow_activate_business_trial');
}

export async function requestPaidSubscription(
  client: WowSupabaseClient, input: RequestPaidSubscriptionInput,
): Promise<string> {
  const { data, error } = await client.rpc('wow_request_paid_subscription', {
    p_business_id: input.businessId,
    p_plan_code: input.planCode,
  });
  if (error) throw error;
  return requiredUuid(data, 'wow_request_paid_subscription');
}

/** Never supplies receipt/proof key; payment is submitted for independent manual verification. */
export async function submitSubscriptionPayment(
  client: WowSupabaseClient, input: SubmitSubscriptionPaymentInput,
): Promise<string> {
  const { data, error } = await client.rpc('wow_submit_subscription_payment', {
    p_subscription_id: input.subscriptionId,
    p_method: input.method,
    p_reference: input.reference,
  });
  if (error) throw error;
  return requiredUuid(data, 'wow_submit_subscription_payment');
}

/** Super-admin only, enforced by the SQL function, not by the Expo admin UI. */
export async function adminConfigureSubscriptionPlan(
  client: WowSupabaseClient, input: AdminConfigureSubscriptionPlanInput,
): Promise<string> {
  const { data, error } = await client.rpc('wow_admin_configure_subscription_plan', {
    p_code: input.code,
    p_price: input.price,
    p_currency: input.currency,
    p_duration_days: input.durationDays,
    p_feature_limits: input.featureLimits,
    p_active: input.active,
  });
  if (error) throw error;
  return requiredUuid(data, 'wow_admin_configure_subscription_plan');
}

export async function adminListSubscriptionPayments(
  client: WowSupabaseClient, options: AdminPaymentListOptions = {},
): Promise<AdminSubscriptionPayment[]> {
  const { data, error } = await client.rpc('wow_admin_list_subscription_payments', {
    p_status: options.status ?? null,
    p_limit: options.limit ?? 50,
    p_offset: options.offset ?? 0,
  });
  if (error) throw error;
  return requiredArray<AdminSubscriptionPayment>(data, 'wow_admin_list_subscription_payments');
}

/** Only independent admin verification grants paid entitlement; never auto-approve. */
export async function adminDecideSubscriptionPayment(
  client: WowSupabaseClient, input: AdminDecideSubscriptionPaymentInput,
): Promise<string> {
  const { data, error } = await client.rpc('wow_admin_decide_subscription_payment', {
    p_payment_id: input.paymentId,
    p_approve: input.approve,
    p_note: input.note,
  });
  if (error) throw error;
  return requiredUuid(data, 'wow_admin_decide_subscription_payment');
}

export async function adminCreateCommercialAgreement(
  client: WowSupabaseClient, input: AdminCreateCommercialAgreementInput,
): Promise<string> {
  const { data, error } = await client.rpc('wow_admin_create_commercial_agreement', {
    p_business_id: input.businessId,
    p_agreement_type: input.agreementType,
    p_grants_publication: input.grantsPublication,
    p_starts_at: input.startsAt,
    p_ends_at: input.endsAt ?? null,
    p_terms_snapshot: input.termsSnapshot,
    p_reason: input.reason,
  });
  if (error) throw error;
  return requiredUuid(data, 'wow_admin_create_commercial_agreement');
}

export async function adminRevokeCommercialAgreement(
  client: WowSupabaseClient, input: AdminRevokeCommercialAgreementInput,
): Promise<string> {
  const { data, error } = await client.rpc('wow_admin_revoke_commercial_agreement', {
    p_agreement_id: input.agreementId,
    p_reason: input.reason,
  });
  if (error) throw error;
  return requiredUuid(data, 'wow_admin_revoke_commercial_agreement');
}
