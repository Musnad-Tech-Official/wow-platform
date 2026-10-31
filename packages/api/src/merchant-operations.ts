import type { WowSupabaseClient } from './supabase/client';
import { uuid } from './integration/helpers';

export type EmployeeAction = 'grant' | 'update' | 'revoke';
export type ProfileRevisionDecision = 'approved' | 'rejected';
export type ProfileRevisionStatus = 'submitted' | 'approved' | 'rejected';

export interface EmployeePermissions {
  can_draft: boolean;
  can_submit: boolean;
  can_pause: boolean;
  can_monitor: boolean;
}

export interface BusinessTeamMember extends EmployeePermissions {
  id: string;
  user_id: string;
  role: 'owner' | 'employee';
  status: 'active' | 'revoked';
  branch_ids: string[];
}

export interface BusinessProfilePatch {
  name?: string;
  description?: string | null;
  contact_phone?: string | null;
}

export interface BranchProfilePatch {
  name?: string;
  city?: string;
  district?: string | null;
  address_line?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface MerchantProfileRevision {
  id: string;
  branch_id: string | null;
  patch: BusinessProfilePatch | BranchProfilePatch;
  status: ProfileRevisionStatus;
  review_reason: string | null;
  created_at: string;
  decided_at: string | null;
}

export interface AdminProfileRevision {
  id: string;
  business_id: string;
  branch_id: string | null;
  patch: BusinessProfilePatch | BranchProfilePatch;
  status: ProfileRevisionStatus;
  created_at: string;
}

export type SetEmployeeAccessInput =
  | { businessId: string; userId: string; action: 'grant' | 'update'; permissions: EmployeePermissions; branchIds: string[] }
  | { businessId: string; userId: string; action: 'revoke' };

export interface SetBusinessPauseInput {
  businessId: string;
  pause: boolean;
}

export interface SetBranchPauseInput {
  branchId: string;
  pause: boolean;
}

export type MerchantProfilePatchTarget =
  | { businessId: string; branchId?: null; patch: BusinessProfilePatch }
  | { businessId: string; branchId: string; patch: BranchProfilePatch };

export interface AdminProfileRevisionsOptions {
  limit?: number;
  offset?: number;
}

export interface AdminDecideProfileRevisionInput {
  revisionId: string;
  decision: ProfileRevisionDecision;
  reason?: string | null;
}

function expectUuid(data: unknown, rpc: string): string {
  if (!uuid(data)) throw new Error(`${rpc} did not return a UUID; check write outcome before retrying.`);
  return data;
}

function expectBoolean(data: unknown, rpc: string): boolean {
  if (typeof data !== 'boolean') throw new Error(`${rpc} did not return a boolean.`);
  return data;
}

function expectArray<T>(data: unknown, rpc: string): T[] {
  if (!Array.isArray(data)) throw new Error(`${rpc} did not return a JSON array.`);
  return data as T[];
}

/** Owner-only. Requires a target synced active Clerk user and existing business branches. */
export async function setEmployeeAccess(
  client: WowSupabaseClient,
  input: SetEmployeeAccessInput,
): Promise<string> {
  const { data, error } = await client.rpc('wow_set_employee_access', {
    p_business_id: input.businessId,
    p_user_id: input.userId,
    p_action: input.action,
    p_permissions: input.action === 'revoke' ? null : input.permissions,
    p_branch_ids: input.action === 'revoke' ? null : input.branchIds,
  });
  if (error) throw error;
  return expectUuid(data, 'wow_set_employee_access');
}

/** Sanitized owner-only listing: do not read public.business_members directly. */
export async function listBusinessTeam(
  client: WowSupabaseClient,
  businessId: string,
): Promise<BusinessTeamMember[]> {
  const { data, error } = await client.rpc('wow_list_business_team', { p_business_id: businessId });
  if (error) throw error;
  return expectArray<BusinessTeamMember>(data, 'wow_list_business_team');
}

/** Owner pause toggles visibility but never revokes approval. */
export async function setBusinessPause(
  client: WowSupabaseClient,
  input: SetBusinessPauseInput,
): Promise<boolean> {
  const { data, error } = await client.rpc('wow_set_business_pause', {
    p_business_id: input.businessId,
    p_pause: input.pause,
  });
  if (error) throw error;
  return expectBoolean(data, 'wow_set_business_pause');
}

export async function setBranchPause(
  client: WowSupabaseClient,
  input: SetBranchPauseInput,
): Promise<boolean> {
  const { data, error } = await client.rpc('wow_set_branch_pause', {
    p_branch_id: input.branchId,
    p_pause: input.pause,
  });
  if (error) throw error;
  return expectBoolean(data, 'wow_set_branch_pause');
}

/** Direct draft/rejected profile patch only. Approved profiles require a review. */
export async function updateMerchantDraft(
  client: WowSupabaseClient,
  input: MerchantProfilePatchTarget,
): Promise<boolean> {
  const { data, error } = await client.rpc('wow_update_merchant_draft', {
    p_business_id: input.businessId,
    p_branch_id: input.branchId ?? null,
    p_patch: input.patch,
  });
  if (error) throw error;
  return expectBoolean(data, 'wow_update_merchant_draft');
}

/** Review submission for approved business/branch; does not apply changes immediately. */
export async function submitProfileRevision(
  client: WowSupabaseClient,
  input: MerchantProfilePatchTarget,
): Promise<string> {
  const { data, error } = await client.rpc('wow_submit_profile_revision', {
    p_business_id: input.businessId,
    p_branch_id: input.branchId ?? null,
    p_patch: input.patch,
  });
  if (error) throw error;
  return expectUuid(data, 'wow_submit_profile_revision');
}

export async function listMyProfileRevisions(
  client: WowSupabaseClient,
  businessId: string,
): Promise<MerchantProfileRevision[]> {
  const { data, error } = await client.rpc('wow_list_my_profile_revisions', {
    p_business_id: businessId,
  });
  if (error) throw error;
  return expectArray<MerchantProfileRevision>(data, 'wow_list_my_profile_revisions');
}

export async function listAdminProfileRevisions(
  client: WowSupabaseClient,
  options: AdminProfileRevisionsOptions = {},
): Promise<AdminProfileRevision[]> {
  const { data, error } = await client.rpc('wow_admin_list_profile_revisions', {
    p_limit: options.limit ?? 50,
    p_offset: options.offset ?? 0,
  });
  if (error) throw error;
  return expectArray<AdminProfileRevision>(data, 'wow_admin_list_profile_revisions');
}

export async function decideAdminProfileRevision(
  client: WowSupabaseClient,
  input: AdminDecideProfileRevisionInput,
): Promise<string> {
  const { data, error } = await client.rpc('wow_admin_decide_profile_revision', {
    p_revision_id: input.revisionId,
    p_decision: input.decision,
    p_reason: input.reason ?? null,
  });
  if (error) throw error;
  return expectUuid(data, 'wow_admin_decide_profile_revision');
}
