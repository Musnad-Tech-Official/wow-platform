import type { WowSupabaseClient } from './supabase/client';
import { uuid } from './integration/helpers';

export interface BusinessVerification {
  id: string;
  branch_id: string | null;
  request_type: string;
  status: string;
  submitted_at: string | null;
  decided_at: string | null;
  merchant_feedback: string | null;
  created_at: string;
}

export interface AdminBusinessVerificationSummary {
  id: string;
  business_id: string;
  business_name: string;
  branch_id: string | null;
  request_type: string;
  status: string;
  submitted_at: string | null;
}

export interface AdminVerificationListFilters {
  status?: string | null;
  limit?: number;
  offset?: number;
}

export interface SubmitBusinessVerificationInput {
  businessId: string;
  branchId: string;
  requestType: 'initial' | 'branch_addition';
  evidenceRefs: string[];
}

export interface ResubmitBusinessVerificationInput {
  verificationId: string;
  evidenceRefs: string[];
}

export interface DecideBusinessVerificationInput {
  verificationId: string;
  decision: 'approved' | 'rejected' | 'needs_info';
  reason?: string | null;
  expectedSubmissionId?: string;
  expectedEvidenceRefs?: string[];
}

function requiredUuid(data: unknown, name: string): string {
  if (!uuid(data)) {
    throw new Error(`${name} did not return a UUID. Confirm the write outcome before retrying.`);
  }
  return data;
}

export async function getBusinessVerifications(
  client: WowSupabaseClient,
  businessId: string,
): Promise<BusinessVerification[]> {
  const { data, error } = await client.rpc('wow_get_my_business_verifications', {
    p_business_id: businessId,
  });
  if (error) throw error;
  return (data ?? []) as BusinessVerification[];
}

export async function submitBusinessVerification(
  client: WowSupabaseClient,
  input: SubmitBusinessVerificationInput,
): Promise<string> {
  const { data, error } = await client.rpc('wow_submit_business_verification', {
    p_business_id: input.businessId,
    p_branch_id: input.branchId,
    p_request_type: input.requestType,
    p_evidence_refs: input.evidenceRefs,
  });
  if (error) throw error;
  return requiredUuid(data, 'wow_submit_business_verification');
}

export async function resubmitBusinessVerification(
  client: WowSupabaseClient,
  input: ResubmitBusinessVerificationInput,
): Promise<string> {
  const { data, error } = await client.rpc('wow_resubmit_business_verification', {
    p_verification_id: input.verificationId,
    p_evidence_refs: input.evidenceRefs,
  });
  if (error) throw error;
  return requiredUuid(data, 'wow_resubmit_business_verification');
}

export async function listAdminBusinessVerifications(
  client: WowSupabaseClient,
  filters: AdminVerificationListFilters = {},
): Promise<AdminBusinessVerificationSummary[]> {
  const { data, error } = await client.rpc('wow_admin_list_business_verifications', {
    p_status: filters.status === undefined ? 'submitted' : filters.status,
    p_limit: filters.limit ?? 50,
    p_offset: filters.offset ?? 0,
  });
  if (error) throw error;
  return (data ?? []) as AdminBusinessVerificationSummary[];
}

/** Admin-only JSONB projection returned by the database; never expose to customer screens. */
export async function getAdminBusinessVerification(
  client: WowSupabaseClient,
  verificationId: string,
): Promise<Record<string, unknown> | null> {
  const { data, error } = await client.rpc('wow_admin_get_business_verification', {
    p_verification_id: verificationId,
  });
  if (error) throw error;
  return data as Record<string, unknown> | null;
}

export async function decideAdminBusinessVerification(
  client: WowSupabaseClient,
  input: DecideBusinessVerificationInput,
): Promise<string> {
  if (input.decision === 'approved' && (!input.expectedSubmissionId || !input.expectedEvidenceRefs?.length)) {
    throw new Error('Approval requires a reviewed submission and evidence set.');
  }
  const args = { p_verification_id: input.verificationId, p_decision: input.decision, p_reason: input.reason ?? null };
  const { data, error } = input.decision === 'approved'
    ? await client.rpc('wow_admin_decide_business_verification_checked', { ...args, p_expected_submission_id: input.expectedSubmissionId, p_expected_evidence_refs: input.expectedEvidenceRefs })
    : await client.rpc('wow_admin_decide_business_verification', args);
  if (error) throw error;
  return requiredUuid(data, 'wow_admin_decide_business_verification');
}

/** Owner-scoped verification document draft, independent of representative identity. */
export interface VerificationDraftDocument {
  storageKey: string;
  name: string;
  size: number;
  mimeType: 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp';
  isPrimaryRequirement: boolean;
}
export interface SaveVerificationDraftInput {
  businessId: string;
  documents: VerificationDraftDocument[];
}
/** Null = draft not created; [] = deliberately empty draft. */
export async function getBusinessVerificationEvidenceDraft(
  client: WowSupabaseClient, businessId: string,
): Promise<VerificationDraftDocument[] | null> {
  const { data, error } = await client.rpc('wow_get_business_verification_draft_evidence', { p_business_id: businessId });
  if (error) throw error;
  if (data === null) return null;
  if (!Array.isArray(data)) throw new Error('Invalid verification evidence draft response');
  return data as VerificationDraftDocument[];
}
export async function saveBusinessVerificationEvidenceDraft(
  client: WowSupabaseClient, input: SaveVerificationDraftInput,
): Promise<void> {
  const { data, error } = await client.rpc('wow_save_business_verification_draft_evidence', {
    p_business_id: input.businessId, p_documents: input.documents,
  });
  if (error) throw error;
  if (data !== true) throw new Error('Draft save was not acknowledged by the server.');
}
