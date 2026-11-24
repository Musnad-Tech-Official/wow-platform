import type { WowSupabaseClient } from './supabase/client';
import { uuid } from './integration/helpers';
import { wowStorageBuckets } from './media';

export interface AdminSignedVerificationEvidence {
  keyIndex: number;
  mimeType: 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp';
  signedUrl: string;
}

/**
 * Signed URLs are short-lived credentials. Never log, persist, copy to analytics,
 * or expose private object paths to unauthenticated users.
 * Existing Storage RLS must authorize object.sign for the independent reviewer.
 */
export async function signAdminVerificationEvidence(
  client: WowSupabaseClient, businessId: string, references: string[],
): Promise<AdminSignedVerificationEvidence[]> {
  if (!uuid(businessId)) throw new Error('Invalid verification business ID.');
  if (!Array.isArray(references) || references.length === 0 || references.length > 20) {
    throw new Error('Expected 1–20 verification evidence references.');
  }

  const prefix = 'business-verifications/' + businessId + '/';
  const allowed = /^business-verifications\/[0-9a-f-]{36}\/[A-Za-z0-9_-]{3,128}\/[a-f0-9]{48}\.(pdf|jpg|jpeg|png|webp)$/;
  const result: AdminSignedVerificationEvidence[] = [];

  for (const [keyIndex, key] of references.entries()) {
    if (typeof key !== 'string' || !key.startsWith(prefix) || !allowed.test(key)) {
      throw new Error('Invalid private verification evidence reference.');
    }
    const extension = key.split('.').pop();
    const mimeType = extension === 'pdf' ? 'application/pdf' :
      extension === 'png' ? 'image/png' :
      extension === 'webp' ? 'image/webp' : 'image/jpeg';
    const { data, error } = await client.storage.from(wowStorageBuckets.verification)
      .createSignedUrl(key, 60);
    if (error) throw error;
    if (!data?.signedUrl) throw new Error('Verification evidence could not be signed by the server.');
    result.push({ keyIndex, mimeType, signedUrl: data.signedUrl });
  }
  return result;
}

/** Sign only the case-specific private reference; Storage rechecks the actor. */
export async function signAdminComplaintEvidence(
  client: WowSupabaseClient, complaintId: string, reference: string,
): Promise<string> {
  if (!uuid(complaintId)) throw new Error('Invalid complaint ID.');
  const parts = reference.split('/');
  if (parts.length !== 4 || parts[0] !== 'complaints' ||
      !/^[A-Za-z0-9_-]{3,128}$/.test(parts[1]) || parts[2] !== complaintId ||
      !/^[a-f0-9]{48}\.(pdf|jpg|jpeg|png|webp)$/.test(parts[3])) {
    throw new Error('Invalid private complaint evidence reference.');
  }
  const { data, error } = await client.storage.from(wowStorageBuckets.complaint)
    .createSignedUrl(reference, 60);
  if (error) throw error;
  if (!data?.signedUrl) throw new Error('Complaint evidence could not be signed.');
  return data.signedUrl;
}
