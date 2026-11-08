import type { WowSupabaseClient } from './supabase/client';
import { uuid } from './integration/helpers';

export interface Branch {
  id: string;
  name: string;
  business_id: string;
  city?: string;
  district?: string | null;
  address_line?: string;
  latitude?: number | null;
  longitude?: number | null;
  status: string;
  is_primary: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateBranchInput {
  businessId: string;
  name: string;
  city: string;
  addressLine: string;
  district?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface UpdateBranchDraftInput {
  businessId: string;
  branchId: string;
  patch: {
    name?: string;
    city?: string;
    district?: string | null;
    address_line?: string;
    latitude?: number | null;
    longitude?: number | null;
  };
}

export async function getBusinessBranches(
  client: WowSupabaseClient,
  businessId: string,
  signal?: AbortSignal,
): Promise<Branch[]> {
  // Migration 002 defines public.business_branches (not public.branches).
  let request = client.from('business_branches')
    .select('id,name,business_id,city,district,address_line,latitude,longitude,status,is_primary,created_at,updated_at')
    .eq('business_id', businessId)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true });
  if (signal) request = request.abortSignal(signal);
  const { data, error } = await request;
  if (error) throw error;
  return (data as Branch[]) ?? [];
}

export async function createBranch(client: WowSupabaseClient, input: CreateBranchInput): Promise<string> {
  const { data, error } = await client.rpc('wow_create_branch', {
    p_business_id: input.businessId,
    p_name: input.name,
    p_city: input.city,
    p_address_line: input.addressLine,
    p_district: input.district ?? null,
    p_latitude: input.latitude ?? null,
    p_longitude: input.longitude ?? null,
  });
  if (error) throw error;
  if (!uuid(data)) throw new Error('wow_create_branch did not return a scalar UUID. Check the write outcome before retrying.');
  return data;
}

export async function updateBranchDraft(
  client: WowSupabaseClient,
  input: UpdateBranchDraftInput,
): Promise<boolean> {
  const { data, error } = await client.rpc('wow_update_merchant_draft', {
    p_business_id: input.businessId,
    p_branch_id: input.branchId,
    p_patch: input.patch,
  });
  if (error) throw error;
  return Boolean(data);
}

export async function deleteDraftBranch(
  client: WowSupabaseClient,
  businessId: string,
  branchId: string,
): Promise<boolean> {
  const { data, error } = await client.rpc('wow_delete_draft_branch', {
    p_business_id: businessId,
    p_branch_id: branchId,
  });
  if (error) throw error;
  return Boolean(data);
}
