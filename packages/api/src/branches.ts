import type { WowSupabaseClient } from './supabase/client';
import { uuid } from './integration/helpers';

export interface Branch {
  id: string;
  name: string;
  business_id: string;
  status: string;
  is_primary: boolean;
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

export async function getBusinessBranches(
  client: WowSupabaseClient,
  businessId: string,
  signal?: AbortSignal,
): Promise<Branch[]> {
  // Migration 002 defines public.business_branches (not public.branches).
  let request = client.from('business_branches')
    .select('id,name,business_id,status,is_primary')
    .eq('business_id', businessId)
    .order('id');
  if (signal) request = request.abortSignal(signal);
  const { data, error } = await request;
  if (error) throw error;
  return data ?? [];
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
