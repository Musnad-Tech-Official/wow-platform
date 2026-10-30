import { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { createWowSupabaseClient, type ClerkTokenProvider } from '../supabase/client';
import { validatePublicSupabaseKey } from '../integration/helpers';

export interface WowSupabaseOptions {
  url?: string;
  publishableKey?: string;
  getToken: ClerkTokenProvider;
  sessionScopeKey: string | null;
}

export function useWowSupabaseClient({ url, publishableKey, getToken, sessionScopeKey }: WowSupabaseOptions) {
  const current = useRef({ getToken, sessionScopeKey });
  useLayoutEffect(() => {
    current.current = { getToken, sessionScopeKey };
    return () => { current.current = { getToken, sessionScopeKey: null }; };
  }, [getToken, sessionScopeKey]);

  const sessionToken = useCallback(async () => {
        const assertSession = () => {
          if (!sessionScopeKey || current.current.sessionScopeKey !== sessionScopeKey) throw new Error('Authentication session changed. Retry with the current session.');
        };
        assertSession();
        const token = await current.current.getToken();
        assertSession();
        if (!token) throw new Error('An authenticated session token is required.');
        return token;
  }, [sessionScopeKey]);

  return useMemo(() => {
    if (!url || !publishableKey || !sessionScopeKey) return null;
    validatePublicSupabaseKey(publishableKey);
    return createWowSupabaseClient({ url, publishableKey, getToken: sessionToken });
  }, [url, publishableKey, sessionScopeKey, sessionToken]);
}
