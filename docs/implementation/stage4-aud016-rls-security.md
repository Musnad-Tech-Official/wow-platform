# Stage 4A — AUD-016: scoped business reads

## Security invariant

The merchant's authenticated role originally had table-wide `SELECT` over `public.businesses` and an RLS policy granting all active business members row visibility. This allowed any active employee to query sensitive owner fields in the direct Data API despite the dedicated sanitized RPC.

**Deployed:** Supabase `jfqmdnffqwkqevdhmtfi`, migration version `20261122195559`, `stage4_owner_only_business_direct_select`.

- Direct `SELECT` on `public.businesses` is allowed by RLS only for an **active owner** via `wow_private.is_business_owner(id)`. The `authenticated` table permission is unchanged; RLS filters non-owner rows.
- Employee-visible business details are fetched through the preexisting `public.wow_merchant_list_accessible_businesses()` RPC. Its internal definer checks active business membership, capability flags and an assigned approved branch; for employees it redacts owner identity, contact phone, logos, requested category and related draft metadata. Owner and employee app paths both use the safe projection, with owner-only onboarding drafts still restricted.
- Direct owner onboarding reads (`getMyBusinesses`, `getBusinessDraftDetails`) retain their previous data shapes. No new public ACLs or private keys are exposed.

## Executed validation

The production schema received the migration after the client source patch had been merged. A transaction-specific SQL role matrix was executed **twice**, once against the proposed policy within `BEGIN/ROLLBACK` and once after deployment:

1. Active, branch-assigned employee: raw business `SELECT` denied.
2. Employee: business remains available through scoped RPC.
3. Employee: private owner fields absent from returned projection.
4. Employee: name, approved status and public description remain.
5. Active owner: direct business row and owner contact remain visible.
6. Active owner: RPC continues to contain own contact.
7. Revoked employee: raw row access denied.
8. Revoked employee: business no longer returned by RPC.

**8/8 checks passed both before and after deployment.** Synthetic users, memberships, branch and business were created inside a transaction and rolled back; no test fixtures remained. The exact fixture script is `docs/sql/stage4-aud016-transacted-regression.sql`.

## Acceptance still open

No real PostgREST HTTP JWT request/response, signed Storage path E2E, Expo merchant UI session, or browser/native regression has been run in the current stage. These remain part of Stage 4 comprehensive testing and later release acceptance. GitHub Actions hosted-runner admission is currently blocked for the private repository; see [AUD-001 #64](https://github.com/Musnad-Tech-Official/wow-platform/issues/64).

A code-only rollback is not sufficient to safely restore broad raw member reads; reverting the RLS restriction without an alternative projection reintroduces the audited exposure. Any change requires renewed security review.
