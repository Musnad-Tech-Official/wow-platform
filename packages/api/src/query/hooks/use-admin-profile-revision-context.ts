import { useQuery } from '@tanstack/react-query';
import { requireWowApiSession, useWowApiContext } from '../WowQueryProvider';
import { reviewScopeFingerprint } from './use-admin-review-evidence';

export interface AdminProfileRevisionContext {
  revision_id: string;
  business_id: string;
  branch_id: string | null;
  current: Record<string, string | number | null>;
  media_review_allowed?: boolean;
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

/** Never return raw candidate paths to the UI or put them in cache keys. */
export function useAdminProfileMedia(revisionId: string | null, businessId: string | null, fields: {slot:string;key:unknown}[], allowed:boolean, scope:string) {
  const context = useWowApiContext();
  return useQuery({
    queryKey: ['admin','profile-media',context.userId,revisionId,reviewScopeFingerprint(scope)],
    enabled: Boolean(context.userId && revisionId && businessId && allowed && fields.length),
    retry:false, staleTime:0, gcTime:60_000,
    queryFn: async () => {
      const {client}=requireWowApiSession(context);
      if(!allowed || !businessId) throw new Error('Independent reviewer required');
      const items = await Promise.all(fields.map(async ({slot,key}) => {
        if(key === null || key === undefined) return {slot,url:null};
        if(typeof key !== 'string' || !key.startsWith(businessId+'/') || !/^[0-9a-f-]{36}\/[A-Za-z0-9_-]{3,128}\/[a-f0-9]{48}\.(jpg|jpeg|png|webp)$/.test(key)) throw new Error('Invalid business image reference');
        const {data,error}=await client.storage.from('wow-business-media').createSignedUrl(key,60);
        if(error) throw error;
        if(!data?.signedUrl) throw new Error('Image unavailable');
        return {slot,url:data.signedUrl};
      }));
      return {scope,items};
    },
  });
}
