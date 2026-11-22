import type { WowSupabaseClient } from './supabase/client';
import { uuid } from './integration/helpers';

export interface Business {
  id: string;
  name: string;
  owner_user_id: string;
  status: string;
  description?: string | null;
  contact_phone?: string | null;
  logo_url?: string | null;
  cover_url?: string | null;
  requested_category_id?: string | null;
}

export interface BusinessDraftDetails extends Business {
  description?: string | null;
  requested_category_id?: string | null;
}

export interface CreateBusinessInput {
  name: string;
  description?: string | null;
}

export interface CreateBusinessWithCategoryInput {
  name: string;
  requestedCategoryId?: string | null;
  description?: string | null;
}

export interface UpdateBusinessDraftInput {
  businessId: string;
  name: string;
  requestedCategoryId?: string | null;
  description?: string | null;
}

export type RepresentativeRole = 'owner' | 'authorized_representative' | 'legal_agent' | 'manager';

export interface BusinessRepresentativeDraft {
  business_id: string;
  name: string;
  role: RepresentativeRole;
  evidence_storage_key?: string | null;
  evidence_file_name?: string | null;
  evidence_file_size?: number | null;
  evidence_content_type?: string | null;
  updated_at?: string;
}

export interface SaveBusinessRepresentativeDraftInput {
  businessId: string;
  name: string;
  role: RepresentativeRole;
  evidenceStorageKey?: string | null;
  evidenceFileName?: string | null;
  evidenceFileSize?: number | null;
  evidenceContentType?: string | null;
}

/** Owner + delegated merchant navigation scope, securely projected by SQL.
 *  This is not a replacement for owner-only onboarding queries.
 */
export async function listAccessibleMerchantBusinesses(client: WowSupabaseClient): Promise<Business[]> {
  const { data, error } = await client.rpc('wow_merchant_list_accessible_businesses');
  if (error) throw error;
  if (!Array.isArray(data)) {
    throw new Error('wow_merchant_list_accessible_businesses did not return an array.');
  }
  return data as Business[];
}

/** Existing business listing query; preserves baseline schema projection without requiring new migrations. */
export async function getMyBusinesses(client: WowSupabaseClient, userId: string, signal?: AbortSignal): Promise<Business[]> {
  let request = client.from('businesses').select('id,name,owner_user_id,status').eq('owner_user_id', userId).order('id');
  if (signal) request = request.abortSignal(signal);
  const { data, error } = await request;
  if (error) throw error;
  return data ?? [];
}

/**
 * Owner and authorized employee business details share the server's sanitized
 * projection. Never query public.businesses directly for an employee: the
 * direct-table SELECT policy is restricted to active owners (AUD-016).
 */
export async function getBusiness(client: WowSupabaseClient, businessId: string, signal?: AbortSignal): Promise<Business | null> {
  let request = client.rpc('wow_merchant_list_accessible_businesses');
  if (signal) request = request.abortSignal(signal);
  const { data, error } = await request;
  if (error) throw error;
  if (!Array.isArray(data)) {
    throw new Error('wow_merchant_list_accessible_businesses did not return an array.');
  }
  return (data as Business[]).find((business) => business.id === businessId) ?? null;
}

/** Scoped onboarding/draft detail reader that handles pre-migration databases gracefully. */
export async function getBusinessDraftDetails(
  client: WowSupabaseClient,
  businessId: string,
  signal?: AbortSignal
): Promise<BusinessDraftDetails | null> {
  let request = client
    .from('businesses')
    .select('id,name,description,requested_category_id,owner_user_id,status')
    .eq('id', businessId);
  if (signal) request = request.abortSignal(signal);

  const { data, error } = await request.maybeSingle<BusinessDraftDetails>();
  if (error) {
    // If requested_category_id column is not yet deployed on the backend, fall back gracefully
    // to the baseline description and status projection rather than breaking the client.
    const isMissingColumn =
      error.code === '42703' ||
      error.code === 'PGRST204' ||
      /requested_category_id/i.test(error.message);

    if (isMissingColumn) {
      let fallbackReq = client
        .from('businesses')
        .select('id,name,description,owner_user_id,status')
        .eq('id', businessId);
      if (signal) fallbackReq = fallbackReq.abortSignal(signal);
      const fallback = await fallbackReq.maybeSingle<BusinessDraftDetails>();
      if (fallback.error) throw fallback.error;
      return fallback.data ? { ...fallback.data, requested_category_id: null } : null;
    }
    throw error;
  }
  return data;
}

export async function createBusiness(client: WowSupabaseClient, input: CreateBusinessInput): Promise<string> {
  const { data, error } = await client.rpc('wow_create_business', {
    p_name: input.name,
    p_description: input.description ?? null,
  });
  if (error) throw error;
  if (!uuid(data)) throw new Error('wow_create_business did not return a scalar UUID. Check the write outcome before retrying.');
  return data;
}

export async function createBusinessWithCategory(
  client: WowSupabaseClient,
  input: CreateBusinessWithCategoryInput
): Promise<string> {
  const { data, error } = await client.rpc('wow_create_business_with_category', {
    p_name: input.name,
    p_requested_category_id: input.requestedCategoryId ?? null,
    p_description: input.description ?? null,
  });
  if (error) throw error;
  if (!uuid(data)) {
    throw new Error('wow_create_business_with_category did not return a scalar UUID. Check the write outcome before retrying.');
  }
  return data;
}

export async function updateBusinessDraft(
  client: WowSupabaseClient,
  input: UpdateBusinessDraftInput
): Promise<boolean> {
  const { data, error } = await client.rpc('wow_update_business_draft', {
    p_business_id: input.businessId,
    p_name: input.name,
    p_requested_category_id: input.requestedCategoryId ?? null,
    p_description: input.description ?? null,
  });
  if (error) throw error;
  return Boolean(data);
}

/** Scoped representative draft loader with pre-migration database tolerance. */
export async function getBusinessRepresentativeDraft(
  client: WowSupabaseClient,
  businessId: string,
  signal?: AbortSignal
): Promise<BusinessRepresentativeDraft | null> {
  let request = client.rpc('wow_get_business_representative_draft', {
    p_business_id: businessId,
  });
  if (signal) request = request.abortSignal(signal);

  const { data, error } = await request;
  if (error) {
    const isMissing =
      error.code === '42883' ||
      error.code === 'PGRST202' ||
      error.code === '42P01' ||
      Boolean(
        error.message &&
          /could not find the function|function .* does not exist|relation .* does not exist/i.test(
            error.message
          )
      );

    if (isMissing) {
      return null;
    }
    throw error;
  }
  return (data as BusinessRepresentativeDraft | null) ?? null;
}

export async function saveBusinessRepresentativeDraft(
  client: WowSupabaseClient,
  input: SaveBusinessRepresentativeDraftInput
): Promise<boolean> {
  const { data, error } = await client.rpc('wow_save_business_representative_draft', {
    p_business_id: input.businessId,
    p_name: input.name,
    p_role: input.role,
    p_evidence_storage_key: input.evidenceStorageKey ?? null,
    p_evidence_file_name: input.evidenceFileName ?? null,
    p_evidence_file_size: input.evidenceFileSize ?? null,
    p_evidence_content_type: input.evidenceContentType ?? null,
  });
  if (error) throw error;
  return Boolean(data);
}
