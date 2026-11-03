import { useLayoutEffect, useRef, useState } from 'react';
import { createWowSupabaseClient, type ClerkTokenProvider, type WowSupabaseClient } from '../supabase/client';
import { validatePublicSupabaseKey } from '../integration/helpers';

export interface WowSupabaseOptions {
  url?: string;
  publishableKey?: string;
  getToken: ClerkTokenProvider;
  sessionScopeKey: string | null;
}

export function useWowSupabaseClient({ url, publishableKey, getToken, sessionScopeKey }: WowSupabaseOptions) {
  const currentGetToken = useRef(getToken);
  const [connection, setConnection] = useState<{
    client: WowSupabaseClient | null;
    url?: string;
    publishableKey?: string;
    sessionScopeKey: string | null;
    error?: unknown;
  } | null>(null);

  useLayoutEffect(() => {
    currentGetToken.current = getToken;
  }, [getToken]);

  // Supabase immediately requests a Realtime token in its constructor. Create
  // the client after commit, so abandoned renders never request session tokens.
  useLayoutEffect(() => {
    let active = true;
    let client: WowSupabaseClient | null = null;
    const assertSession = () => {
      if (!active) throw new Error('Authentication session changed. Retry with the current session.');
    };
    const sessionToken = async () => {
      assertSession();
      const token = await currentGetToken.current();
      assertSession();
      if (!token) throw new Error('An authenticated session token is required.');
      return token;
    };
    // Deferring also lets Strict Mode's discarded mount cancel before the SDK
    // starts its eager token request.
    void Promise.resolve().then(() => {
      if (!active) return;
      if (!url || !publishableKey || !sessionScopeKey) {
        setConnection(null);
        return;
      }
      validatePublicSupabaseKey(publishableKey);
      client = createWowSupabaseClient({ url, publishableKey, getToken: sessionToken });
      setConnection({ client, url, publishableKey, sessionScopeKey });
    }).catch(error => {
      if (active) setConnection({ client: null, url, publishableKey, sessionScopeKey, error });
    });
    return () => {
      active = false;
      void client?.removeAllChannels();
    };
  }, [url, publishableKey, sessionScopeKey]);

  // Never expose a previous session's client while its replacement is pending.
  if (!connection || connection.url !== url || connection.publishableKey !== publishableKey || connection.sessionScopeKey !== sessionScopeKey) return null;
  if ('error' in connection) throw connection.error;
  return connection.client;
}
