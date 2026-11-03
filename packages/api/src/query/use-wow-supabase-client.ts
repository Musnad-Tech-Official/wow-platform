import { useCallback, useLayoutEffect, useRef } from 'react';
import { createWowSupabaseClient, type ClerkTokenProvider, type WowSupabaseClient } from '../supabase/client';
import { validatePublicSupabaseKey } from '../integration/helpers';

export interface WowSupabaseOptions {
  url?: string;
  publishableKey?: string;
  getToken: ClerkTokenProvider;
  sessionScopeKey: string | null;
}

// Returns a stable accessor. The SDK eagerly requests a token on construction,
// so create it on first use by a query/event/effect, after auth has committed.
export function useWowSupabaseClient({ url, publishableKey, getToken, sessionScopeKey }: WowSupabaseOptions): () => WowSupabaseClient | null {
  const current = useRef({ getToken, sessionScopeKey });
  const cached = useRef<{
    url: string;
    publishableKey: string;
    sessionScopeKey: string;
    client: WowSupabaseClient;
  } | null>(null);
  useLayoutEffect(() => {
    current.current = { getToken, sessionScopeKey };
    return () => { current.current = { getToken, sessionScopeKey: null }; };
  }, [getToken, sessionScopeKey]);
  useLayoutEffect(() => () => { cached.current = null; }, [url, publishableKey, sessionScopeKey]);

  const sessionToken = useCallback(async () => {
    const assertSession = () => {
      if (!sessionScopeKey || current.current.sessionScopeKey !== sessionScopeKey) {
        throw new Error('Authentication session changed. Retry with the current session.');
      }
    };
    assertSession();
    const token = await current.current.getToken();
    assertSession();
    if (!token) throw new Error('An authenticated session token is required.');
    return token;
  }, [sessionScopeKey]);

  return useCallback(() => {
    if (!url || !publishableKey || !sessionScopeKey) return null;
    if (current.current.sessionScopeKey !== sessionScopeKey) {
      throw new Error('Authentication session changed. Retry with the current session.');
    }
    if (!cached.current || cached.current.url !== url ||
      cached.current.publishableKey !== publishableKey || cached.current.sessionScopeKey !== sessionScopeKey) {
      validatePublicSupabaseKey(publishableKey);
      cached.current = { url, publishableKey, sessionScopeKey,
        client: createWowSupabaseClient({ url, publishableKey, getToken: sessionToken }) };
    }
    return cached.current.client;
  }, [url, publishableKey, sessionScopeKey, sessionToken]);
}
