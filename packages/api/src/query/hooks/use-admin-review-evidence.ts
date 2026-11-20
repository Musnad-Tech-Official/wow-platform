import { useQuery } from '@tanstack/react-query';
import { signAdminVerificationEvidence } from '../../admin-review-evidence';
import { requireWowApiSession, useWowApiContext } from '../WowQueryProvider';

/** No evidence keys or signed URLs in the React Query key. */
export function useAdminVerificationEvidence(
  verificationId: string | null,
  businessId: string | null,
  evidenceRefs: string[],
  reviewerVerified: boolean,
) {
  const context = useWowApiContext();
  return useQuery({
    queryKey: ['admin', 'verification-signed-evidence', context.userId, verificationId],
    enabled: Boolean(context.userId && verificationId && businessId && evidenceRefs.length > 0 && reviewerVerified),
    retry: false,
    staleTime: 0,
    gcTime: 60_000,
    queryFn: () => {
      if (!businessId) throw new Error('A verified business is required.');
      return signAdminVerificationEvidence(
        requireWowApiSession(context).client, businessId, evidenceRefs,
      );
    },
  });
}
