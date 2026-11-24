# Stage 4B — AUD-059 / D-02: Clerk sign-in policy reconciliation

## Observed configuration (2026-11-22)

The connected WOW Clerk app is `app_3LFNZpGt05X1SpRVKee8olgCme9`. It currently has a **Development instance only**, and the source apps expose Google and Facebook SSO buttons.

Live development configuration read (secrets redacted):
- `connection_oauth_google.enabled = true`
- `connection_oauth_facebook.enabled = true`
- `auth_password.enabled = true`, `auth_password.required = true`
- `auth_email.used_for_sign_in = true`, `auth_email.sign_in_strategies = ["email_code"]`

At the time of this review Clerk Development returned **10 accounts**, of which **1 had password_enabled=true**, **6 had a Google external account**, **0 had a Facebook external account**, and **4 had no external OAuth account listed**. These counts describe development accounts only and may change. No private user identifiers or addresses are stored in this report. A user with no listed external OAuth identity could lose access if other sign-in methods are disabled abruptly.

Allowlisted **native redirect URLs were independently verified**:
- `customer://sso-callback`
- `merchant://oauth-callback`
- `admin://oauth-callback`

No WOW Clerk Production instance exists. Production Google/Facebook client credentials and live redirect/domain flows are NOT verified.

## Non-breaking remediation completed

The customer recovery screen previously stated as a fact that WOW does not store account passwords while its connected Clerk development configuration enables password sign-in. Its help copy now truthfully describes **the authentication buttons presented by the WOW apps** without making assertions about all accounts in Clerk or providing a nonexistent in-app password recovery action. The Google/Facebook official recovery links remain only for accounts actually linked to those providers.

The existing `scripts/test-customer-auth-completion.cjs` source regression was updated to require accurate copy and prohibit the unsupported blanket no-password claim.

## Approved product decision and safe cutover dependency

**D-02 is approved by the product owner: Google/Facebook-only for the first release.** Implementation alignment remains open. Do not silently disable `auth_password` or `email_code`, delete users, change identity settings or create Production. Prerequisites:
1. Preserve existing account identities; review the current account inventory (the historical count above is not current).
2. A tested recovery or account-linking path for currently non-OAuth or password-enabled users; do not require users to create new unrelated identities.
3. Real sign-up/sign-in/return/cancellation/logout/role-isolation E2E across all three apps.
4. Production instance, OAuth credentials, domains and callback policy approved separately (Stage 7).

**2026-11-24 acceptance status:** safe source copy update implemented; provider-policy alignment remains incomplete. Owner approved deferral of comprehensive real authentication tests to Stage 6. The configuration cutover is coupled to the safe transition and signed-session tests, not a reason to disable methods untested. Development remains unchanged. Production remains Stage 7. See [transfer register](stage4-stage6-acceptance-transfer-20261124.md).
