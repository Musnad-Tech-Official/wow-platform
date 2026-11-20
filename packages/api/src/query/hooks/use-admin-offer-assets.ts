import { useQuery } from '@tanstack/react-query';
import { signAdminOfferAssets } from '../../admin-offer-assets';
import { requireWowApiSession, useWowApiContext } from '../WowQueryProvider';

/** Use a compact scope fingerprint: never put private object paths in query keys.
 * A changed evidence/image set must not reuse a previous signed URL result. */
function assetScopeFingerprint(
  businessId: string | null,
  imageKeys: string[],
  evidenceKeys: string[],
): string {
  const parts = [businessId ?? '', `images:${imageKeys.length}`, ...imageKeys,
    `evidence:${evidenceKeys.length}`, ...evidenceKeys];
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (const part of parts) {
    const segment = `${part.length}:${part};`;
    for (let i = 0; i < segment.length; i += 1) {
      const code = segment.charCodeAt(i);
      first = Math.imul(first ^ code, 0x01000193);
      second = Math.imul(second ^ code, 0x85ebca6b);
    }
  }
  return [first, second].map((value) => (value >>> 0).toString(16).padStart(8, '0')).join('');
}

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
    queryKey: ['admin', 'offer-signed-assets', context.userId, versionId,
      assetScopeFingerprint(businessId, imageKeys, evidenceKeys)],
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
