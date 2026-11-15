import { useQuery } from '@tanstack/react-query';
import { signAdminOfferAssets } from '../../admin-offer-assets';
import { requireWowApiSession, useWowApiContext } from '../WowQueryProvider';

/** Query keys never contain private object paths or signed URLs. */
export function useAdminOfferAssets(
  versionId: string | null,
  businessId: string | null,
  imageKeys: string[],
  evidenceKeys: string[],
  reviewerVerified: boolean,
) {
  const context = useWowApiContext();
  return useQuery({
    queryKey: ['admin', 'offer-signed-assets', context.userId, versionId],
    enabled: Boolean(context.userId && versionId && businessId && reviewerVerified &&
      (imageKeys.length > 0 || evidenceKeys.length > 0)),
    retry: false,
    staleTime: 0,
    gcTime: 60_000,
    queryFn: () => {
      if (!versionId || !businessId) throw new Error('Verified offer scope is required.');
      return signAdminOfferAssets(
        requireWowApiSession(context).client,
        businessId, versionId, imageKeys, evidenceKeys,
      );
    },
  });
}
