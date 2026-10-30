
import { useMemo } from 'react';
import { useAuth } from '@wow/auth';
import { createWowSupabaseClient } from '@wow/api';

export function useSupabase() {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  const supabase = useMemo(() => {
    return createWowSupabaseClient({
      url: process.env.EXPO_PUBLIC_SUPABASE_URL!,
      publishableKey:
        process.env.EXPO_PUBLIC_SUPABASE_KEY!,
      getToken: async () => {
        if (!isSignedIn) return null;

        return getToken();
      },
    });
  }, [getToken, isSignedIn]);

  return {
    supabase,
    isLoaded,
    isSignedIn,
  };
}
