import type { WowSupabaseClient } from './supabase/client';

export interface CurrentUser {
  id: string;
  account_status: string;
}

export async function getCurrentUser(client: WowSupabaseClient, userId: string, signal?: AbortSignal): Promise<CurrentUser | null> {
  let request = client.from('users').select('id,account_status').eq('id', userId);
  if (signal) request = request.abortSignal(signal);
  const { data, error } = await request.maybeSingle<CurrentUser>();
  if (error) throw error;
  // A Clerk webhook may not have created the profile yet. Absence is not an error.
  return data;
}
