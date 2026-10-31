# WOW Migration 008 — Storage & Media API

Source: `008_storage_media_security.sql`. This PR introduces typed wrappers for the **3 public RPCs**, upload helpers for the four writable private buckets, short-lived public-offer media signing, and React Query hooks. No SQL/schema changes, new backend or screen code.

## Storage security boundary

All five Migration 008 buckets are **PRIVATE**. Four have narrowly scoped authenticated INSERT permissions. The fifth bucket (`wow-payment-proofs`) is **reserved** and cannot be uploaded to or read by client-side APIs.

| Bucket | Upload path | Allowed uploader |
| --- | --- | --- |
| `wow-business-media` | `businessUUID/clerkUserId/random48hex.webp` | Active business owner |
| `wow-offer-media` | `businessUUID/draftVersionUUID/clerkUserId/random48hex.webp` | Authenticated merchant with draft permission on that version |
| `wow-verification-evidence` | `business-verifications/businessUUID/clerkUserId/random48hex.pdf` | Active business owner |
| `wow-complaint-evidence` | `complaints/clerkUserId/complaintUUID/random48hex.jpg` | Customer who owns an open complaint |

Client `uploadWowMedia` uses **24 cryptographically random bytes** for each filename, validates all path IDs, MIME type and size, and uses the Supabase Storage SDK with `upload(..., ArrayBuffer, { upsert: false })`. For images, max 5 MiB; for verification/complaint evidence, max 10 MiB. The allowed image types are JPEG, PNG and WebP; evidence additionally allows PDF. SVG/HTML/scripts are prohibited.

A supported `globalThis.crypto.getRandomValues` is **required** at runtime; this module does not downgrade to insecure `Math.random()`. On an Expo target without that cryptographic source, configure a supported native secure-random provider *before* using uploads. A runtime error rather than a weak key is intentional.

**Never use** `getPublicUrl()` for private buckets. The SDK's public-client key must be Supabase publishable/anon, never a `service_role` token.

## Merchant flow

1. Create offer and save entire draft payload with `useCreateOffer()` and `useSaveOfferDraft()`.
2. Take the resulting **draft version ID**. Convert device image bytes to `ArrayBuffer` via an Expo-compatible binary reader; do not assume browser `Blob` works on React Native.
3. Call `useUploadWowMedia()` with `scope: {kind: 'offer', businessId, versionId}`, `bytes`, and `contentType`. The hook gets current Clerk `userId` from `WowQueryProvider`; a caller cannot substitute user identity through the hook.
4. Call `useAttachOfferMedia().mutateAsync({versionId, storageKey: uploaded.key, ...})`. SQL ensures matching business, draft version, ownership, image existence and valid item ID.
5. **Do not save the draft after attaching**, because Migration 004's save replaces media child rows. If editing, save again then reattach. Upload success without attach leaves an orphan object; this API does not attempt DELETE because the Storage policy forbids client DELETE.

If a network call fails, the Storage write or attach might have committed. Do not automatically retry under a different random path: check state through an authorized read and reconcile manually. Mutations have `retry: false`.

The `wow-business-media` bucket is a staging area only. **Public logo/cover publishing is not implemented.** Do not map private Storage keys to public `businesses.logo_url` or `cover_url`.

## Complaint & verification evidence

- Verification: upload to `wow-verification-evidence` first, then submit keys using the existing Migration 003 `submitBusinessVerification`; Migration 008 checks object existence.
- Complaint: call `submitComplaint` without evidence, then upload to its private `complaints/clerkUserId/complaintUUID/...` path, then call `useAttachComplaintEvidence()`. SQL enforces open own case, allowed file, and max 8 attachments.
- No browser public URLs or generic public download endpoints for these documents. They must not appear in Customer/merchant/public offer media results.
- Only explicitly permitted reviewers may read evidence; the SQL disallows affiliated reviewers for private verification/complaint evidence.

## Public offer images

`usePublicOfferMedia(offerId)` uses the **anonymous** client and calls `wow_public_get_offer_media`. It returns an approved *media allowlist* of `{bucket,key,alt_text,is_cover,sort_order}`; it does not produce stable URLs. Only media attached to the currently approved visible version is returned.

For an eligible image, `signPublicOfferMedia(anonClient, media, 60)` asks Storage for a **1–120 second signed URL**. The Storage SELECT policy independently checks live discovery eligibility at signing. Treat signed URLs as bearer credentials, **do not persist or log them**, and remember they can remain accessible until expiry even if the offer becomes ineligible after signing. Signed URL consumption and renewal belong in an image component/UI integration phase.

Private Storage policies also govern authenticated owner/reviewer access, but this PR deliberately does not add generic evidence URL signing.

## Verification & limits

Local tests use mocked Storage and PostgREST I/O, not live Supabase. Execute on the branch:

```powershell
pnpm.cmd typecheck
pnpm.cmd lint
pnpm.cmd test:query
pnpm.cmd test:integration
```

**Before real customer evidence or production media:** live positive and negative Storage RLS tests with separate user/merchant/reviewer accounts; anonymous live visibility tests; bucket size/MIME tests; secure random support on Android; image sanitation/metadata handling and optional malware scanning, orphan cleanup/reconciliation policy, private signed URL expiry behavior. Do **not** treat passing local unit tests as Storage security certification.

Do not enable payment proof uploads without a separate reviewed migration and explicit user approval.
