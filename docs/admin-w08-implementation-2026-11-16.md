# W08 — Complaints and ratings across Customer, Merchant and Admin

**Status: Admin read and confirmation-gated write UI implemented; live authorized E2E and evidence isolation remain OPEN. NOT approved for production.**

Source of scope: [W08 Issue #18](https://github.com/Musnad-Tech-Official/wow-platform/issues/18).

## Existing implementation audit

- Customer already has ratings and complaints screens and authenticated query hooks (`apps/customer/src/features/rating`, `complaint`).
- Merchant already has complaint routes and associated APIs (`apps/merchant/src/app/complaints`).
- `@wow/api` already defines owner/merchant/admin projections and hooks:
  `useAdminComplaints`, `useAdminComplaint`, `useAdminRatings`,
  `useAdminModerateRating`, `useAdminUpdateComplaint`,
  `useAdminRequestMerchantResponse`.
- The Admin app previously had no W08 complaints/ratings routes, and complaint navigation was shown as *Coming soon*.

This baseline means W08 must integrate existing services, **not recreate complaint tables or expose private evidence data**.

## Implemented in this first tranche

1. `/complaints`: server-backed status-filtered queue with bounded pagination, loading/error/empty states and access-controlled complaint detail links.
2. `/complaints/[id]`: UUID-validated, W06-guarded, admin-only complaint record rendering from allowlisted fields; raw JSON and private evidence keys are never printed.
3. `/ratings`: server-backed moderation-status-filtered ratings list, bounded pagination and state handling. Decisions require a verified reviewer/super-admin role, an explicit reason, confirmation and a fresh server-authorized RPC; no decision is automatically triggered.
4. Admin navigation to the two routes replaces the placeholder complaint item.
5. W08 source guards are added to the shared CI verification and real browser smoke adds guest-denial coverage for all three W08 routes.
6. Rating moderation adds a role-gated decision editor with 5–2000-character reason and a separate confirmation checkbox; audited RPC outcome invalidates the list.
7. Complaint details expose guarded status decisions (internal 5–3000-character note; closing requires a 5–2000-character customer-safe outcome) and merchant-response requests with explicit confirmation.
8. Both mutation flows remain bound to backend conflict-of-interest and audit checks. The W06/W07 theme fixes are inherited from the branch dependency.

## Important boundaries

- No SQL migration, direct table grant, privileged seed data, temporary elevated identity, or live administrative write was used. Only UI handlers calling existing guarded RPCs were added.
- Existing admin RPCs remain the authorization authority; W06GuardedPage only guards the interface.
- No client/merchant evidence URL is exposed and no automatic signed Storage URL is created.
- Summary lists are current-page lists, **not global metrics**.
- Source checks and guest browser tests are *not* the same as authenticated privileged E2E acceptance.

## Required remaining W08 scope

- Live signed reviewer/super-admin end-to-end verification of admin complaint status decisions, merchant response requests and rating moderation, including server audit records and affiliated-merchant denial.
- Merchant response acceptance testing and cross-account data boundaries, without leaking complainant identity or evidence.
- Verified complaint evidence upload/attach and signed-view access, including cross-account isolation.
- Customer offer-feedback entry point and any remaining customer/merchant acceptance gaps identified by reviewing W08 Issue #18.
- Real authorized multi-role E2E tests, Android/iOS RTL, keyboard, dark/light mode and accessibility review.
- W06 PR #55 and W07 PR #56 must be reconciled/merged first. This W08 branch is **stacked on W07** and must not be merged directly into main with unapproved W06/W07 code.

## Release rule

Leave W08 as Draft and block release until all above gates are complete and specifically approved.
