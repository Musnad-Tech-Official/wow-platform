import { useQuery } from '@tanstack/react-query';
import { requireWowApiSession, useWowApiContext } from '../WowQueryProvider';

export type EffectiveAdminRole = 'super_admin' | 'reviewer' | 'viewer';

/**
 * Reads the current caller's role only. Never trusts Clerk public metadata.
 * The database must deploy wow_admin_get_effective_role before this hook succeeds.
 * Without that contract, the admin UI remains read-only (role === null).
 */
export function useAdminEffectiveRole() {
  const context = useWowApiContext();
  return useQuery({
    queryKey: ['admin', 'effective-role', context.userId],
    enabled: Boolean(context.userId),
    retry: false,
    queryFn: async (): Promise<EffectiveAdminRole | null> => {
      const { data, error } = await requireWowApiSession(context).client.rpc(
        'wow_admin_get_effective_role',
      );
      if (error) throw error;
      if (data === 'super_admin' || data === 'reviewer' || data === 'viewer') return data;
      if (data === null) return null;
      throw new Error('Unexpected effective admin role response.');
    },
  });
}
