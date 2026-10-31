# WOW — Migration 009 Merchant Operations API

Source of truth: `009_merchant_operations.sql`, its README, and the `010_database_hardening.sql` branch-read rules. This change provides **nine SQL RPC wrappers and nine TanStack Query hooks** in `@wow/api`. It adds no new SQL, schema, third-party service, or UI screens.

## 1. Staff lifecycle

`setEmployeeAccess` / `useSetEmployeeAccess()` calls `wow_set_employee_access` with:

- `businessId`, `userId`, and `action: 'grant' | 'update' | 'revoke'`.
- Grant/update require all **four explicit booleans** `can_draft`, `can_submit`, `can_pause`, `can_monitor`, plus **1–100 unique branch IDs** belonging to the business. No arbitrary role parameter is accepted.
- Revoke deliberately sends `p_permissions: null` and `p_branch_ids: null`.
- Employees must already exist as active synchronized Clerk users in `public.users`. The owner cannot be changed or revoked using this RPC.

`listBusinessTeam` / `useBusinessTeam(businessId)` is an **owner-only** sanitized team listing. No raw SELECT from `business_members`, `business_member_branches` or `wow_private.merchant_operation_events`.

### Branch security note (Migration 010)

Migration 009 restricts writes and submissions of offer branch assignments. Migration 010 strengthens offer/version/item/media read authorization to be fail-closed for partial branch assignments, and blocks deleting an unassigned association. A member assigned only some branches of a multi-branch offer cannot see its shared version or its item/media data. Do not implement UI fallbacks that bypass these SQL restrictions.

## 2. Business and branch pauses

`setBusinessPause` / `useSetBusinessPause()` and `setBranchPause` / `useSetBranchPause()` both return a boolean. **Only the business owner** can pause/resume. A pause hides eligible offers through central discoverability without revoking the business/branch approval. Queries for merchant details and public discovery are invalidated after successful writes, but actual propagation to other sessions is not realtime.

## 3. Business/branch profile changes

The database strictly allowlists these optional JSON patch fields:

| Target | Allowed keys |
| --- | --- |
| Business | `name`, `description`, `contact_phone` |
| Branch | `name`, `city`, `district`, `address_line`, `latitude`, `longitude` |

Do not send `status`, `owner_id`, `approved`, `logo_url`, `cover_url`, permissions, or arbitrary JSON. Coordinates must be valid latitude/longitude pairs; SQL checks the final merged coordinates and field constraints.

- `updateMerchantDraft` / `useUpdateMerchantDraft()` is for **draft/rejected** business/branch records only and applies the patch directly. Returns boolean.
- `submitProfileRevision` / `useSubmitProfileRevision()` is for **approved** entities and creates a pending review row. Returns revision UUID. It does not apply the patch immediately.
- `listMyProfileRevisions` / `useMyProfileRevisions(businessId)` returns an owner-only JSON history array, including review status and the owner's own review reason.

Never treat a submitted profile revision as approved until the admin review completes.

## 4. Admin review

- `listAdminProfileRevisions` / `useAdminProfileRevisions({ limit, offset })` lists submitted revisions with SQL defaults 50 / 0 and bounds 1–100 / 0–10000.
- `decideAdminProfileRevision` / `useAdminDecideProfileRevision()` accepts `decision: 'approved' | 'rejected'` and an optional review reason. Rejection requires 5–2000 characters. Approval applies only the approved, validated patch.
- SQL prevents reviewers who own or actively belong to the target business from reviewing their own changes, and restricts reviewer access to authorized platform admins.

The Admin app is not an authorization boundary. All checks remain within SQL and authenticated Clerk JWTs. No direct client reads of `public.business_profile_revisions` or `wow_private.merchant_operation_events` are allowed.

## 5. Caching, errors, testing

All private read Query Keys include the current Clerk user ID; business-specific reads also include business ID. The existing session-bound `WowQueryProvider` manages cache isolation on session change. Hooks resolve the Supabase client lazily at use time with `requireWowApiSession`. The QueryClient has `mutations.retry: false`, since failed transport responses can conceal a committed write.

On success, hooks invalidate owner/team/revision listings as appropriate, and refresh merchant/discovery keys for pause/review operations.

```powershell
git fetch origin
git switch --track origin/feat/api-merchant-operations
pnpm.cmd typecheck
pnpm.cmd lint
pnpm.cmd test:query
pnpm.cmd test:integration
```

Expected **36 Query tests** (33 + 3 new tests), **19 local integration guard tests**. These are local mocked SDK/React Query checks, not a live Clerk/Supabase authorization campaign.

**Important deferred gates before production:** verify real owner/employee/revoked/suspended and independent admin accounts, cross-branch read and write restrictions, concurrent requests, pause/discoverability/Storage interaction, staging backups, and all Migration 010 security audit outputs. In particular do not assume local tests prove PostgreSQL RLS security.
