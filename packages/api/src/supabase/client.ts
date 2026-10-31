
import { createClient } from '@supabase/supabase-js';

export type ClerkTokenProvider =
  () => Promise<string | null>;

export interface SupabaseClientConfig {
  url: string;
  publishableKey: string;
  getToken: ClerkTokenProvider;
}

export function createWowSupabaseClient({
  url,
  publishableKey,
  getToken,
}: SupabaseClientConfig) {
  return createClient(url, publishableKey, {
    accessToken: getToken,
    // Query retries belong to TanStack; avoid multiplying SDK and query retries.
    db: { retry: false },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export type WowSupabaseClient =
  ReturnType<typeof createWowSupabaseClient>;
