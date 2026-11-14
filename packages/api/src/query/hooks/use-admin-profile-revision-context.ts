import { useQuery } from '@tanstack/react-query';
import { requireWowApiSession, useWowApiContext } from '../WowQueryProvider';

export interface AdminProfileRevisionContext {
  revision_id: string;
  business_id: string;
  branch_id: string | null;
  current: Record<string, string | number | null>;
}

/** Reads allowlisted published fields for a selected pending revision; no raw table access. */
export function useAdminProfileRevisionContext(revisionId: string | null) {
  const context = useWowApiContext();
  return useQuery({
    queryKey: ['admin', 'profile-revision-context', context.userId, revisionId],
    enabled: Boolean(context.userId && revisionId),
    retry: false,
    queryFn: async (): Promise<AdminProfileRevisionContext | null> => {
      if (!revisionId) return null;
      const { data, error } = await requireWowApiSession(context).client.rpc(
        'wow_admin_get_profile_revision_context', { p_revision_id: revisionId },
      );
      if (error) throw error;
      if (data === null) return null;
      if (!data || typeof data !== 'object' || Array.isArray(data) ||
          data.revision_id !== revisionId || !data.current ||
          typeof data.current !== 'object' || Array.isArray(data.current)) {
        throw new Error('Unexpected approved profile baseline response.');
      }
      return data as unknown as AdminProfileRevisionContext;
    },
  });
}
