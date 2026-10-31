import { createClient } from '@supabase/supabase-js';
import { useCallback, useRef } from 'react';
import { validatePublicSupabaseKey } from '../integration/helpers';
import type { WowSupabaseClient } from './client';

// Expo statically replaces these literal process.env.EXPO_PUBLIC_* expressions.
// Keep this declaration module-local: @wow/api intentionally does not depend on Node typings.
declare const process: {
  env: {
    EXPO_PUBLIC_SUPABASE_URL?: string;
    EXPO_PUBLIC_SUPABASE_KEY?: string;
  };
};

/** This client never attaches Clerk credentials. Public discovery RPCs are available to guests. */
export function createWowPublicSupabaseClient(url: string, publishableKey: string): WowSupabaseClient {
  validatePublicSupabaseKey(publishableKey);
  return createClient(url, publishableKey, {
    db: { retry: false },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export interface WowPublicSupabaseOptions {
  url?: string;
  publishableKey?: string;
}

/** Lazy accessor keeps the SDK out of React props and avoids creating it during rendering. */
export function useWowPublicSupabaseClient(options: WowPublicSupabaseOptions = {}): () => WowSupabaseClient | null {
  const url = options.url ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
  const publishableKey = options.publishableKey ?? process.env.EXPO_PUBLIC_SUPABASE_KEY;
  const cached = useRef<{
    url: string;
    publishableKey: string;
    client: WowSupabaseClient;
  } | null>(null);

  return useCallback(() => {
    if (!url || !publishableKey) return null;
    if (!cached.current || cached.current.url !== url || cached.current.publishableKey !== publishableKey) {
      cached.current = {
        url,
        publishableKey,
        client: createWowPublicSupabaseClient(url, publishableKey),
      };
    }
    return cached.current.client;
  }, [url, publishableKey]);
}
