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
  // The deployed RPC signature is not checked into this repository.
  parameters?: Record<`p_${string}`, unknown>;
}

export async function getBusinessBranches(client: WowSupabaseClient, businessId: string, signal?: AbortSignal): Promise<Branch[]> {
  let request = client.from('branches').select('id,name,business_id,status,is_primary').eq('business_id', businessId).order('id');
  if (signal) request = request.abortSignal(signal);
  const { data, error } = await request;
  if (error) throw error;
  return data ?? [];
}

export async function createBranch(client: WowSupabaseClient, input: CreateBranchInput): Promise<string> {
  const { data, error } = await client.rpc('wow_create_branch', {
    ...input.parameters,
    p_business_id: input.businessId,
    p_name: input.name,
  });
  if (error) throw error;
  if (!uuid(data)) throw new Error('wow_create_branch did not return a scalar UUID. Check the write outcome before retrying.');
  return data;
}
