import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import type { WowSupabaseClient } from '../supabase/client';
import { createWowQueryClient } from './query-client';
import { subscribeToNativeFocus } from './native-focus';

export interface WowQueryProviderProps {
  children: ReactNode;
  // Keep the SDK object out of props/context: React's development profiler
  // traverses object props and can touch Supabase's protected auth proxy.
  getClient: () => WowSupabaseClient | null;
  userId: string | null;
  sessionScopeKey: string | null;
  isAuthReady: boolean;
}

export interface WowApiContextValue {
  getClient: () => WowSupabaseClient | null;
  userId: string | null;
}

const WowApiContext = createContext<WowApiContextValue | null>(null);

export function WowQueryProvider(props: WowQueryProviderProps) {
  useEffect(subscribeToNativeFocus, []);
  const active = props.isAuthReady && props.userId && props.sessionScopeKey;
  // Replacing this subtree makes the new cache available in the very first render,
  // including a new session for the same user. Token refreshes do not change the key.
  const scope = active ? JSON.stringify([props.userId, props.sessionScopeKey]) : 'signed-out';
  return <SessionQueryProvider key={scope} getClient={props.getClient} userId={active ? props.userId : null}>
    {props.children}
  </SessionQueryProvider>;
}

function SessionQueryProvider({ getClient, userId, children }: WowApiContextValue & { children: ReactNode }) {
  const [queryClient] = useState(createWowQueryClient);
  const mounted = useRef(false);
  const value = useMemo(() => ({ getClient, userId }), [getClient, userId]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      // StrictMode immediately sets effects up again. Clear only after an
      // actual unmount; a session change already exposes a fresh cache.
      queueMicrotask(() => { if (!mounted.current) queryClient.clear(); });
    };
  }, [queryClient]);
  return <QueryClientProvider client={queryClient}>
    <WowApiContext.Provider value={value}>{children}</WowApiContext.Provider>
  </QueryClientProvider>;
}

export function useWowApiContext(): WowApiContextValue {
  const context = useContext(WowApiContext);
  if (!context) throw new Error('WOW query hooks require WowQueryProvider.');
  return context;
}

export function requireWowApiSession(context: WowApiContextValue) {
  if (!context.userId) throw new Error('A ready, signed-in session is required.');
  const client = context.getClient();
  if (!client) throw new Error('Configure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY.');
  return { client, userId: context.userId };
}
