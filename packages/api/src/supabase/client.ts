
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
  const client = createClient(url, publishableKey, {
    accessToken: getToken,
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  // With Clerk's accessToken callback, the SDK disables auth with a proxy that
  // throws even on React's $$typeof inspection. Exclude it from React's recursive
  // development prop logging while preserving the SDK's errors for auth API use.
  Object.defineProperty(client, 'auth', { enumerable: false });

  return client;
}

export type WowSupabaseClient =
  ReturnType<typeof createWowSupabaseClient>;
