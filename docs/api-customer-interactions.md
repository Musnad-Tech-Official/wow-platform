# Migration 005 — Customer Interactions API

This package uses **Migration 005's 13 exact public RPC contracts** for bookmarks, assessments, complaints and moderation. It adds **2 read-only favorite table APIs** and **15 TanStack Query hooks**. Its source contract is `005_customer_interactions.sql`; no schema, RPC or permission changes are introduced.

## Customer

- `getSavedOffers` / `useSavedOffers()` — owner-scoped SELECT on `public.saved_offers`.
- `getSavedBusinesses` / `useSavedBusinesses()` — owner-scoped SELECT on `public.saved_businesses`.
- `setSavedOffer` / `useSetSavedOffer()` — idempotent `wow_set_saved_offer`; boolean result.
- `setSavedBusiness` / `useSetSavedBusiness()` — idempotent `wow_set_saved_business`; boolean result.
- `rateOffer` / `useRateOffer()` — `wow_rate_offer`; optional 1–5 experience stars, conformity is `matches`, `does_not_match` or `could_not_verify`. Stars are forbidden for `could_not_verify`; database enforces this and a 14-day assessment window.
- `getMyRatings` / `useMyRatings(options)` — `wow_get_my_ratings`; customer projection intentionally excludes moderation reason/reviewer.
- `submitComplaint` / `useSubmitComplaint()` — `wow_submit_complaint`; must reference an approved version (explicit or current) and an optional participating branch. Complaint description must contain 15–4000 characters.
- `getMyComplaints` / `useMyComplaints(options)` — `wow_get_my_complaints`; customer-safe messages only. Merchant/internal investigation notes must never appear in this projection.

**Privacy:** Customer should not query raw `offer_ratings`, `complaints`, `complaint_updates` or admin-only moderation history. Those tables have no client SELECT grants.

**Complaint evidence:** `submitComplaint` hardcodes `p_private_evidence_keys: []`, preserving Migration 005's prohibition on unverified evidence keys. Any later verified upload must use Migration 008's dedicated attachment workflow. Never pass arbitrary URLs or user-controlled storage keys into complaint creation.

## Merchant

- `getBusinessComplaints` / `useBusinessComplaints(options)` — `wow_get_business_complaints` only for the active owner; the returned projection **omits customer ID, complaint description, incident details, attachments and private notes**.
- `merchantRespondComplaint` / `useMerchantRespondComplaint()` — `wow_merchant_respond_complaint`; response is marked **admin_only** by SQL and cannot be submitted to closed cases.

Business employees cannot use these owner-only complaint RPCs.

## Admin

- `listAdminRatings` / `useAdminRatings(options)` — `wow_admin_list_ratings`.
- `adminModerateRating` / `useAdminModerateRating()` — `wow_admin_moderate_rating`; status `normal`, `under_review` or `excluded`; reason mandatory (5–2000 chars). The database enforces no self-moderation for affiliated merchants.
- `listAdminComplaints` / `useAdminComplaints(options)` — `wow_admin_list_complaints`.
- `getAdminComplaint` / `useAdminComplaint(complaintId)` — `wow_admin_get_complaint`; full sensitive case and history only for authorized admins, never expose it to Customer/Merchant UI.
- `adminUpdateComplaint` / `useAdminUpdateComplaint()` — `wow_admin_update_complaint`; allowed target status `investigating`, `waiting`, `closed`; requires internal note. Closing requires a separate customer-safe `publicOutcome` (5–2000 chars). SQL prohibits decisions on affiliated businesses.

## Identity, caching and security

Every private query key contains Clerk user ID. The existing session-scoped `WowQueryProvider` disposes cache on sign-out and account/session changes. Reads are disabled without authentication, and writes go through `requireWowApiSession`. No direct INSERT/UPDATE/DELETE operations on customer interactions tables are implemented. Favorite reads rely on owner-scoped RLS *and* filter on the current Clerk user ID. All admin/merchant authorization remains in PostgreSQL; merely running Admin or Merchant Expo does not grant permissions.

Query invalidations are targeted to the current user and relevant resource prefix. Successful mutations do not prove that other users' devices are immediately refreshed; realtime/cross-device syncing is out of scope.

Migration 005's JSON listing RPCs bound `limit` 1–100 and `offset` 0–10000; defaults are 50 and 0. For simpler pagination, hooks use these exact fields and keys.

## Validation

```powershell
git fetch origin
git switch --track origin/feat/api-customer-interactions
pnpm.cmd typecheck
pnpm.cmd lint
pnpm.cmd test:query
pnpm.cmd test:integration
```

The local `test:query` suite adds three cases covering **all 13 RPC argument contracts**, read-only favorite RLS request paths/identity filters, and signed-out hooks/account-scoped cache invalidation. Expected **22** tests (up from 19), with **19** integration local guard tests.

**Not covered:** live Clerk JWT, deployed Supabase grants/RLS, old/cross-account writes, abuse prevention, incident proofs, real native lifecycle, and production screens. Those require the final real-environment test campaign.
