import type { WowMediaMime } from '@wow/api';
export const MAX_COMPLAINT_EVIDENCE_BYTES = 10 * 1024 * 1024;
export interface ComplaintEvidenceFile {
  name: string; bytes: ArrayBuffer; contentType: WowMediaMime;
}
export function validateComplaintEvidence(name: string, mime: string | null | undefined, bytes: ArrayBuffer): ComplaintEvidenceFile {
  if (bytes.byteLength < 1 || bytes.byteLength > MAX_COMPLAINT_EVIDENCE_BYTES) throw new Error('Invalid file size');
  const ext = name.split('.').pop()?.toLowerCase();
  const data = new Uint8Array(bytes);
  const matches = (signature: number[], offset = 0) => signature.every((v,i) => data[offset+i] === v);
  const type = ext === 'pdf' && matches([37,80,68,70,45]) ? 'application/pdf'
    : (ext === 'jpg' || ext === 'jpeg') && matches([255,216,255]) ? 'image/jpeg'
    : ext === 'png' && matches([137,80,78,71,13,10,26,10]) ? 'image/png'
    : ext === 'webp' && matches([82,73,70,70]) && matches([87,69,66,80],8) ? 'image/webp' : null;
  if (!type || (mime && mime !== 'application/octet-stream' && mime !== type)) throw new Error('Invalid file content');
  return { name,bytes,contentType:type };
}
export type EvidenceSubmissionResult =
  | { kind:'busy' | 'upload_unconfirmed' | 'attached' }
  | { kind:'attach_unconfirmed'; storageKey:string };
/** Never automatically repeat an upload or create another complaint. */
export async function submitComplaintEvidence(options: {
  busy:{current:boolean}; pendingKey:string|null;
  upload:()=>Promise<{key:string}>; attach:(key:string)=>Promise<boolean>;
}):Promise<EvidenceSubmissionResult> {
  if (options.busy.current) return {kind:'busy'};
  options.busy.current = true;
  let key = options.pendingKey;
  try {
    if (!key) {
      try { key = (await options.upload()).key; }
      catch { return {kind:'upload_unconfirmed'}; }
    }
    try {
      await options.attach(key);
      return {kind:'attached'};
    } catch { return {kind:'attach_unconfirmed',storageKey:key}; }
  } finally { options.busy.current=false; }
}
