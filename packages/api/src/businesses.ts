import type { WowSupabaseClient } from './supabase/client';
import { uuid } from './integration/helpers';

export interface Business {
  id: string;
  name: string;
  owner_user_id: string;
  status: string;
  description?: string | null;
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

/** Existing business listing query; preserves baseline schema projection without requiring new migrations. */
export async function getMyBusinesses(client: WowSupabaseClient, userId: string, signal?: AbortSignal): Promise<Business[]> {
  let request = client.from('businesses').select('id,name,owner_user_id,status').eq('owner_user_id', userId).order('id');
  if (signal) request = request.abortSignal(signal);
  const { data, error } = await request;
  if (error) throw error;
  return data ?? [];
}

/** Existing business detail query; preserves baseline schema projection without requiring new migrations. */
export async function getBusiness(client: WowSupabaseClient, businessId: string, signal?: AbortSignal): Promise<Business | null> {
  let request = client.from('businesses').select('id,name,owner_user_id,status').eq('id', businessId);
  if (signal) request = request.abortSignal(signal);
  const { data, error } = await request.maybeSingle<Business>();
  if (error) throw error;
  return data;
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
