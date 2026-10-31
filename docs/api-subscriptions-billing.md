# WOW Billing API — Migration 006

SQL source: `wow_migrations/006_subscriptions_trials.sql`, with eligibility hardening from Migration 010. This PR implements **10 public RPCs** and **10 TanStack Query hooks** in `@wow/api`, with no database changes, payments gateway, checkout, or storage uploads.

## Merchant-facing

| Hook | RPC | Purpose |
| --- | --- | --- |
| `useSubscriptionPlans()` | `wow_list_subscription_plans` | Active/configured plans only; signed-in user required |
| `useBusinessBilling(businessId)` | `wow_get_business_billing` | Owner-only subscriptions, payments and agreements projection |
| `useActivateBusinessTrial()` | `wow_activate_business_trial` | Explicit 30-day one-time trial, idempotent for already-used trial |
| `useRequestPaidSubscription()` | `wow_request_paid_subscription` | Pending request with immutable configured plan snapshot |
| `useSubmitSubscriptionPayment()` | `wow_submit_subscription_payment` | Manual method/reference submission; DOES NOT activate plan |

A business must be approved to request a paid subscription. The 30-day trial cannot start until there is a currently live approved offer on at least one approved branch; an existing trial is never restarted or extended. The database enforces all business conditions. **Do not automatically call trial activation from app launch or screen render**; a deliberate user action is required.

`BASIC` and `ADVANCED` plans remain inactive until authorized super-admin configuration. Pricing is **not assumed** or seeded client-side. Unconfigured plans do not appear in the active plan list.

`wow_submit_subscription_payment` accepts only `p_subscription_id`, `p_method`, `p_reference`; it does not upload a proof. Migration 006 enforces `subscription_payments_proof_disabled_ck`, requiring `proof_key IS NULL`. The user-facing copy should say **pending verification**, not paid/activated. Repeated payment attempts may be rejected or be ambiguous after network failure; no mutation auto-retry is enabled.

## Admin-only

| Hook | RPC |
| --- | --- |
| `useAdminConfigureSubscriptionPlan()` | `wow_admin_configure_subscription_plan` |
| `useAdminSubscriptionPayments(options)` | `wow_admin_list_subscription_payments` |
| `useAdminDecideSubscriptionPayment()` | `wow_admin_decide_subscription_payment` |
| `useAdminCreateCommercialAgreement()` | `wow_admin_create_commercial_agreement` |
| `useAdminRevokeCommercialAgreement()` | `wow_admin_revoke_commercial_agreement` |

Only appropriately privileged administrators may manage payments; configuring plans and creating/revoking agreements require a super-admin. SQL enforces conflict-of-interest restrictions when decisions involve affiliated businesses.

Payment approval requires **independent verification** by an administrator; the payment reference alone is never sufficient proof. `adminDecideSubscriptionPayment({ paymentId, approve, note })` expects a documented review note of 10–1500 characters. Rejected payments do not activate a plan. Commercial agreements are distinct from paid subscriptions and can grant time-limited publication rights under narrow types and explicit terms.

## Data, caching and security

- `BusinessBilling` exposes only the owner-safe billing projection, not `wow_private.billing_events`, private admin notes or raw billing tables.
- All plan and private billing query keys include Clerk user identity, and old sessions are isolated by the existing session-scoped `WowQueryProvider`.
- Public billing tables have no direct client grants. Do not fetch them with `client.from('subscription_payments')` or bypass RPC authorization.
- `has_publication_entitlement` is computed at request time by SQL. It does **not** override business/branch/offer verification or visibility conditions.
- Successful billing mutations invalidate relevant billing queries and any future discovery cache prefix, but do not push real-time changes to other devices.
- `price` and `amount` are `Money = string | number`. For exact money operations use server snapshots/decimal arithmetic, not client-side floating-point totals.
- No `service_role` keys or credentials belong in client apps.

## Local checks

```powershell
git fetch origin
git switch --track origin/feat/api-subscriptions-billing
pnpm.cmd typecheck
pnpm.cmd lint
pnpm.cmd test:query
pnpm.cmd test:integration
```

The query suite contains three new tests checking 10 RPC bodies, signed-out queries/session-scoped cache invalidation, and invalid response handling. Expected **25/25 query tests** and **19/19 local integration guard tests** after this PR. These tests use local HTTP doubles, not live Clerk/Supabase.

**Deferred to final integration campaign:** live merchant/owner/super-admin permissions, RLS policies, real payment approval, time-based entitlement, cross-account and replay scenarios, authenticated Android flows.
