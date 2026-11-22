# Stage 4C — AUD-038: trial activation requires a publicly eligible offer

## Scope and deployment

**Deployed:** WOW Supabase `jfqmdnffqwkqevdhmtfi`, version `20261122202629`, name `stage4_trial_requires_visible_unpaused_offer`. The exact reviewed SQL is `supabase/migrations/20261122202629_stage4_trial_requires_visible_unpaused_offer.sql`.

The prior trial activation accepted an approved business even if paused, and a qualifying approved branch even if paused. Discovery correctly hid both, so the 30-day trial could begin without the offer appearing to customers.

The new `wow_private.activate_business_trial_internal` now verifies **before inserting any subscription or billing event** that:

1. The business is approved and not paused.
2. At least one active, merchant-available, approved, unexpired offer version is linked to an approved **unpaused** branch.
3. That offer version's category is active, its parent if present is active, and the category remains approved for the same business (consistent with AUD-034 public discovery).
4. No other active subscription already covers the business.
5. The caller remains the proven active business owner through existing `assert_billing_owner` checks.

The function does **not** call `has_publication_entitlement` before activation; doing so would prevent the first trial that is supposed to grant that entitlement. Existing trial IDs continue to be returned unchanged on retries, even if the business becomes paused afterward. No extension and no new billing event is permitted.

## Tests run

Source: `docs/sql/stage4-aud038-transacted-regression.sql`. A transaction-scoped real PostgreSQL fixture created an approved business with active owner membership and Clerk-like JWT claims, branch, categories, offer and approved version.

**10/10** assertions passed both before the migration (with proposed function inside a rollback transaction) **and after deployment**:

- paused business denied without creating trial;
- paused branch denied without creating trial;
- inactive offer category denied;
- inactive parent category denied;
- removed category assignment denied;
- all denied activations leave trial and event tables unchanged;
- eligible business activates one exact 30-day trial;
- one activation event is recorded;
- repeated activation returns identical original trial ID and expiry;
- repeated activation produces no additional billing event.

No synthetic rows persisted: production retained two pre-existing businesses, **zero offers, subscriptions, trial billing events, AUD-038 users and AUD-038 category fixtures**. Deployed function MD5 after verification: `02089891cdc43d77b0acb3832ca6d83d`.

## Acceptance remaining

No live signed-Clerk browser request or native/web end-to-end scenario has been run. These remain Stage 4 comprehensive acceptance requirements, along with open AUD-001 GitHub runner admission. A database-level 10/10 result does not certify the UI. The deployment was already applied; **do not apply this migration a second time**.
