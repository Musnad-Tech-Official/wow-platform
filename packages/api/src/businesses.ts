import type { WowSupabaseClient } from './supabase/client';
import { uuid } from './integration/helpers';

export interface Business {
  id: string;
  name: string;
  owner_user_id: string;
  status: string;
}

export interface CreateBusinessInput {
  name: string;
  description?: string | null;
}

export async function getMyBusinesses(client: WowSupabaseClient, userId: string, signal?: AbortSignal): Promise<Business[]> {
  let request = client.from('businesses').select('id,name,owner_user_id,status').eq('owner_user_id', userId).order('id');
  if (signal) request = request.abortSignal(signal);
  const { data, error } = await request;
  if (error) throw error;
  return data ?? [];
}

export async function getBusiness(client: WowSupabaseClient, businessId: string, signal?: AbortSignal): Promise<Business | null> {
  let request = client.from('businesses').select('id,name,owner_user_id,status').eq('id', businessId);
  if (signal) request = request.abortSignal(signal);
  const { data, error } = await request.maybeSingle<Business>();
  if (error) throw error;
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
