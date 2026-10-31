import type { WowSupabaseClient } from './supabase/client';
import { uuid } from './integration/helpers';

export const wowStorageBuckets = {
  business: 'wow-business-media',
  offer: 'wow-offer-media',
  verification: 'wow-verification-evidence',
  complaint: 'wow-complaint-evidence',
} as const;

// Payment proofs are intentionally absent: Migration 006 forbids proof keys,
// and Migration 008 has no client upload/read policies for that bucket.
export type WowWritableMediaBucket = typeof wowStorageBuckets[keyof typeof wowStorageBuckets];
export type WowMediaMime = 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf';

export type WowMediaUploadScope =
  | { kind: 'business'; businessId: string }
  | { kind: 'offer'; businessId: string; versionId: string }
  | { kind: 'verification'; businessId: string }
  | { kind: 'complaint'; complaintId: string };

export interface UploadWowMediaInput {
  scope: WowMediaUploadScope;
  /** Current Clerk userId. Used ONLY for path placement; Storage RLS verifies JWT sub. */
  userId: string;
  /** Expo/React Native: use ArrayBuffer, not a browser Blob or File. */
  bytes: ArrayBuffer;
  contentType: WowMediaMime;
}

export interface UploadedWowMedia {
  bucket: WowWritableMediaBucket;
  key: string;
}

export interface AttachOfferMediaInput {
  versionId: string;
  storageKey: string;
  itemId?: string | null;
  altText?: string | null;
  isCover?: boolean;
  sortOrder?: number;
}

export interface AttachComplaintEvidenceInput {
  complaintId: string;
  storageKey: string;
}

/** Short-lived public discovery read model. These paths are NOT public URLs. */
export interface PublicOfferMedia {
  bucket: 'wow-offer-media';
  key: string;
  alt_text: string | null;
  is_cover: boolean;
  sort_order: number;
}

const fileExtensions: Record<WowMediaMime, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

function randomFilename(): string {
  // Never derive names from timestamps, user filenames or Math.random().
  const secure = globalThis.crypto?.getRandomValues;
  if (typeof secure !== 'function') {
    throw new Error('Secure random bytes are unavailable. Configure a supported crypto.getRandomValues provider.');
  }
  const raw = new Uint8Array(24);
  globalThis.crypto.getRandomValues(raw);
  return Array.from(raw, byte => byte.toString(16).padStart(2, '0')).join('');
}

function requireUserId(userId: string): void {
  if (!/^[A-Za-z0-9_-]{3,128}$/.test(userId)) {
    throw new Error('Invalid Clerk user ID for Storage object path.');
  }
}
function requireUuid(value: string, name: string): void {
  if (!uuid(value)) throw new Error(`Invalid ${name} UUID for Storage object path.`);
}

export function createWowMediaPath(
  scope: WowMediaUploadScope, userId: string, filenameHex: string, contentType: WowMediaMime,
): UploadedWowMedia {
  requireUserId(userId);
  if (!/^[a-f0-9]{48}$/.test(filenameHex)) {
    throw new Error('Storage filenames must contain 24 cryptographically secure random bytes as hex.');
  }
  const extension = fileExtensions[contentType];
  if (!extension) throw new Error('Unsupported WOW Storage MIME type.');

  switch (scope.kind) {
    case 'business':
      requireUuid(scope.businessId, 'business');
      return { bucket: wowStorageBuckets.business,
        key: `${scope.businessId}/${userId}/${filenameHex}.${extension}` };
    case 'offer':
      requireUuid(scope.businessId, 'business');
      requireUuid(scope.versionId, 'offer version');
      return { bucket: wowStorageBuckets.offer,
        key: `${scope.businessId}/${scope.versionId}/${userId}/${filenameHex}.${extension}` };
    case 'verification':
      requireUuid(scope.businessId, 'business');
      return { bucket: wowStorageBuckets.verification,
        key: `business-verifications/${scope.businessId}/${userId}/${filenameHex}.${extension}` };
    case 'complaint':
      requireUuid(scope.complaintId, 'complaint');
      return { bucket: wowStorageBuckets.complaint,
        key: `complaints/${userId}/${scope.complaintId}/${filenameHex}.${extension}` };
  }
}

/** Upload once, without overwrite or auto-retry. RLS authorizes path and ownership. */
export async function uploadWowMedia(
  client: WowSupabaseClient, input: UploadWowMediaInput,
): Promise<UploadedWowMedia> {
  const { scope, userId, bytes, contentType } = input;
  if (!(bytes instanceof ArrayBuffer)) {
    throw new Error('Use an ArrayBuffer for Expo/React Native Storage uploads.');
  }
  const documentBucket = scope.kind === 'verification' || scope.kind === 'complaint';
  if (!documentBucket && contentType === 'application/pdf') {
    throw new Error('Business and offer media accept images only.');
  }
  const maxBytes = documentBucket ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
  if (bytes.byteLength < 1 || bytes.byteLength > maxBytes) {
    throw new Error(`Storage file size must be between 1 and ${maxBytes} bytes.`);
  }
  const media = createWowMediaPath(scope, userId, randomFilename(), contentType);
  const { error } = await client.storage.from(media.bucket).upload(media.key, bytes, {
    contentType,
    upsert: false,
  });
  if (error) throw error;
  return media;
}

/** Attach ONLY after uploading and saving the draft. Returns new media record UUID. */
export async function attachOfferMedia(
  client: WowSupabaseClient, input: AttachOfferMediaInput,
): Promise<string> {
  const { data, error } = await client.rpc('wow_attach_offer_media', {
    p_version_id: input.versionId,
    p_storage_key: input.storageKey,
    p_item_id: input.itemId ?? null,
    p_alt_text: input.altText ?? null,
    p_is_cover: input.isCover ?? false,
    p_sort_order: input.sortOrder ?? 0,
  });
  if (error) throw error;
  if (!uuid(data)) throw new Error('wow_attach_offer_media did not return a UUID. Verify write outcome before retrying.');
  return data;
}

/** Attach only to a complaint the customer owns while it is open. */
export async function attachComplaintEvidence(
  client: WowSupabaseClient, input: AttachComplaintEvidenceInput,
): Promise<boolean> {
  const { data, error } = await client.rpc('wow_attach_complaint_evidence', {
    p_complaint_id: input.complaintId,
    p_storage_key: input.storageKey,
  });
  if (error) throw error;
  if (typeof data !== 'boolean') throw new Error('wow_attach_complaint_evidence did not return a boolean.');
  return data;
}

/** Public media list contains private bucket object references, never stable URLs. */
export async function getPublicOfferMedia(
  client: WowSupabaseClient, offerId: string,
): Promise<PublicOfferMedia[]> {
  const { data, error } = await client.rpc('wow_public_get_offer_media', { p_offer_id: offerId });
  if (error) throw error;
  if (!Array.isArray(data)) throw new Error('wow_public_get_offer_media did not return a JSON array.');
  return data as PublicOfferMedia[];
}

/** Sign only current eligible offer images. Storage RLS re-checks live eligibility.
 * Treat returned URL as a short-lived credential; never persist it or expose private evidence.
 */
export async function signPublicOfferMedia(
  publicClient: WowSupabaseClient, media: PublicOfferMedia, expiresIn = 60,
): Promise<string> {
  if (media.bucket !== wowStorageBuckets.offer ||
      !/^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[A-Za-z0-9_-]+\/[a-f0-9]{48}\.(jpg|jpeg|png|webp)$/.test(media.key)) {
    throw new Error('Invalid approved offer image reference.');
  }
  if (!Number.isInteger(expiresIn) || expiresIn < 1 || expiresIn > 120) {
    throw new Error('Offer media signed URL expiry must be 1–120 seconds.');
  }
  const { data, error } = await publicClient.storage.from(wowStorageBuckets.offer)
    .createSignedUrl(media.key, expiresIn);
  if (error) throw error;
  if (!data?.signedUrl) throw new Error('Storage did not return a signed media URL.');
  return data.signedUrl;
}
