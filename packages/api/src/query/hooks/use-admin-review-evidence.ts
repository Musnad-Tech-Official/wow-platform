import { useQuery } from '@tanstack/react-query';
import { signAdminVerificationEvidence } from '../../admin-review-evidence';
import { requireWowApiSession, useWowApiContext } from '../WowQueryProvider';

/** Compact cache key; the exact scope is also checked against the result. */
export function reviewScopeFingerprint(scope: string): string {
  let a = 0x811c9dc5, b = 0x9e3779b9;
  for (let i = 0; i < scope.length; i += 1) {
    a = Math.imul(a ^ scope.charCodeAt(i), 0x01000193);
    b = Math.imul(b ^ scope.charCodeAt(i), 0x85ebca6b);
  }
  return [a,b].map(n => (n >>> 0).toString(16).padStart(8,'0')).join('');
}

/** No evidence keys or signed URLs in the React Query key. */
export function useAdminVerificationEvidence(
  verificationId: string | null,
  businessId: string | null,
  evidenceRefs: string[],
  reviewerVerified: boolean,
  scope: string,
) {
  const context = useWowApiContext();
  return useQuery({
    queryKey: ['admin', 'verification-signed-evidence', context.userId, verificationId, reviewScopeFingerprint(scope)],
    enabled: Boolean(context.userId && verificationId && businessId && evidenceRefs.length > 0 && reviewerVerified),
    retry: false,
    staleTime: 0,
    gcTime: 60_000,
    queryFn: async () => {
      if (!businessId) throw new Error('A verified business is required.');
      const items = await signAdminVerificationEvidence(
        requireWowApiSession(context).client, businessId, evidenceRefs,
      );
      return { scope, items };
    },
  });
}
