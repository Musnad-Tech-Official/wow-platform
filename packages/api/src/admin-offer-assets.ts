import type { WowSupabaseClient } from './supabase/client';
import { uuid } from './integration/helpers';
import { wowStorageBuckets } from './media';

export interface AdminSignedOfferAsset {
  keyIndex: number;
  kind: 'image' | 'evidence';
  mimeType: string;
  signedUrl: string;
}

/**
 * Server RLS independently authorizes each object.sign request. These URLs are
 * temporary bearer credentials: never log them, store them in persistent state,
 * expose the raw Storage key, or pass them to public/Customer endpoints.
 */
export async function signAdminOfferAssets(
  client: WowSupabaseClient,
  businessId: string,
  versionId: string,
  images: string[],
  evidence: string[],
): Promise<AdminSignedOfferAsset[]> {
  if (!uuid(businessId) || !uuid(versionId)) throw new Error('Invalid offer review scope.');
  if (!Array.isArray(images) || !Array.isArray(evidence) ||
      images.length > 30 || evidence.length > 20) {
    throw new Error('Unexpected private asset count.');
  }
  const imagePrefix = businessId + '/' + versionId + '/';
  const evidencePrefix = 'offer-verifications/' + businessId + '/';
  const imagePattern = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[A-Za-z0-9_-]{3,128}\/[a-f0-9]{48}\.(jpg|jpeg|png|webp)$/;
  const evidencePattern = /^offer-verifications\/[0-9a-f-]{36}\/[A-Za-z0-9_-]{3,128}\/[a-f0-9]{48}\.(pdf|jpg|jpeg|png|webp)$/;
  const output: AdminSignedOfferAsset[] = [];
  for (const [kind, refs, prefix, pattern, bucket] of [
    ['image', images, imagePrefix, imagePattern, wowStorageBuckets.offer],
    ['evidence', evidence, evidencePrefix, evidencePattern, wowStorageBuckets.verification],
  ] as const) {
    const unique = new Set<string>();
    for (const [keyIndex, key] of refs.entries()) {
      if (typeof key !== 'string' || !key.startsWith(prefix) || !pattern.test(key) || unique.has(key)) {
        throw new Error('Invalid or duplicated private offer asset reference.');
      }
      unique.add(key);
      const ext = key.split('.').pop();
      const mimeType = ext === 'pdf' ? 'application/pdf' :
        ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      const { data, error } = await client.storage.from(bucket).createSignedUrl(key, 60);
      if (error) throw error;
      if (!data?.signedUrl) throw new Error('Private offer asset signing denied.');
      output.push({ keyIndex, kind, mimeType, signedUrl: data.signedUrl });
    }
  }
  return output;
}
