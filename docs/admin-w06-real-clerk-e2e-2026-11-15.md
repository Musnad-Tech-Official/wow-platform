# W06 — Real Clerk reviewer and application smoke test

Date: 2026-11-15 (Asia/Aden). Database: `wow-platform` primary pre-launch Supabase project.

## Verified run

GitHub Actions **WOW quality gates #269**, run ID `43645667580`, completed successfully on `feat/admin-w06-main-sync-review-20261114` before the follow-up role-loading UX refinement.

The job **Real Clerk OTP and Supabase profile RLS (development only)**:
- Used pre-existing, dedicated **Clerk development test users** with real OTP sign-in and real session JWTs, not simulated SQL JWT claims.
- Temporarily granted only **reviewer** role to the dedicated test administrator in `wow_private.admin_members`; did not elevate a human administrator or grant `super_admin`.
- Verified `wow_admin_get_effective_role()` returned `reviewer` to that signed session.
- Verified signed-session reads of `wow_admin_list_business_verifications`, `wow_admin_list_profile_revisions`, and `wow_admin_list_subscription_payments`.
- Verified a separate signed merchant user was refused access to both platform admin list and effective-role RPC.
- Opened the actual Expo Web Admin routes as the reviewer in Chromium; captured screenshots on desktop and mobile.
- Merchant account isolation/RLS test gates still passed.

## Real application screenshots

GitHub workflow artifact `admin-w06-real-clerk-screenshots`, artifact ID `14133654226`:
- `01_adm03_verifications_desktop.png`
- `02_adm04_details_desktop.png`
- `03_w06_profile_revisions_desktop.png`
- `04_adm10_payments_desktop.png`
- `05_adm03_verifications_mobile.png`
- `06_adm10_payments_mobile.png`

Screen ADM-04 used **one synthetic submitted verification** tied to a pre-existing dedicated merchant QA business. It had **zero evidence files**. Accordingly the UI could inspect the request but was not permitted to approve it; no actual merchant was approved or paid.

Visual inspection found that the ADM-04 snapshot was taken while the Admin role query was still resolving: the shell momentarily displayed a generic verified-administrator label and the decision control remained unavailable. A subsequent ADM-10 desktop screenshot showed the correct `مراجع` badge once the role query completed. A follow-up patch now waits for the trusted role query before presenting authorized review controls.

## Cleanup verification

Immediately after successful authenticated test:
- Deleted the exact synthetic verification (guarded by UUID, requesting account, QA marker and status).
- Deleted the dedicated temporary reviewer membership (guarded by user ID and role).
- Confirmed remaining test verification rows: **0**.
- Confirmed remaining test admin memberships: **0**.
- Confirmed review decision/audit rows for the synthetic verification: **0**.
- Preserved the pre-existing E2E merchant and existing real admin memberships.
- Routine CI was returned to a **non-elevated signed-session test**; reviewer mode requires an explicit separately managed test grant and cleanup, not a standing admin membership.

## Remaining limits

- **No real Storage object signing E2E:** `storage.objects` count was 0, and this test deliberately did not upload private evidence with no approved deletion route. Earlier SQL policy tests are not evidence of actual HTTP Storage signing. Test with a provisioned, removable test object before release.
- ADM-10 was validated as an **empty-state UI** and read authorization, not as a real payment decision. No funds, paid invoice, or live subscription was mutated.
- ADM-04 was validated for real session, signed-in route and a submitted QA record; **approval was not exercised**, since it lacked verified evidence.
- ADM-03/04/10 visual matching against original approved design source and Android/iOS native behavior have not been signed off.
- PR #55 remains **DRAFT** and must not merge before owner approval.

Evidence: GitHub Actions `https://github.com/Musnad-Tech-Official/wow-platform/actions/runs/43645667580`.
