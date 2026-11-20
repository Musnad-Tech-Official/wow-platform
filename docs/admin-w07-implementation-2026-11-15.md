# W07 — Admin offer moderation and category management

Status: **implemented for source/SQL verification; NOT approved for release**.
Issue: #17. Branch: `feat/admin-w07-offer-review-categories-20261115`. Draft PR: #56.

## Branch dependencies

W07 was based on W06 head commit `42aea6ba`, because the W06 admin shell, server role gate, and shared visual components were not yet merged into `main`.

PR #56 currently targets `main` **only so CI executes**. It contains W06 commits in addition to W07. Do **not** merge or count its entire diff as W07. After W06 PR #55 is approved and merged, rebase/reconcile W07 against the new `main` without losing any recent security migrations.

## Interfaces

- `/offer-review` — ordered live pending offer versions, current-page search, bounded pagination, explicit loading/error/empty states.
- `/offer-review/[id]` — version-locked review context (business, offer, amounts, fees, terms, attributes, branches and review history); private offer media and offer-evidence keys are converted to short-lived signed links **only after server-verified reviewer access**; approve/reject/needs-info require explicit confirmation. Approval with former price/clearance requires signed evidence and reviewer acknowledgement.
- `/categories` — full category management including inactive categories; category editing limited to `super_admin`. Approved business category replacement is limited to `reviewer`/`super_admin`, with up to 12 active categories, selected primary, reviewer reason and explicit confirmation. Server RPCs enforce affiliation conflicts.

All three routes reuse W06's `W06GuardedPage` access boundary, which rejects preview fixtures and does not infer a role. Guest and forged preview URLs are checked in the real Expo Web browser smoke test.

## Backend work

Existing verified server RPCs were **reused**, not reimplemented:

- `wow_admin_list_pending_offers`, `wow_admin_get_offer_review`, `wow_admin_decide_offer`.
- `wow_admin_upsert_category`, `wow_admin_set_business_categories`.

One read-only migration was added and **applied** to the pre-launch database:

`20261115174302_w07_admin_category_read_models`

- `wow_admin_list_categories()` lists active and inactive catalog entries without raw table grants.
- `wow_admin_search_business_categories(p_query,p_limit)` returns limited business search results and their existing approved category assignments; it omits extra internal timestamps.
- Both `SECURITY DEFINER` functions use `SET search_path = ''`, check `wow_private.has_admin_permission(false)`, revoke `PUBLIC`/`anon` access and grant only the authenticated role. Viewers can read but cannot mutate.
- No changes to public discovery behavior or to existing audit/decision rules.

## Verified SQL regression

1. `docs/sql/w07-offer-decision-transaction-smoke.sql` — **passed** in an explicit transaction with full rollback:
   - owner-reviewer, affiliated active employee-reviewer, viewer and revoked reviewer denied;
   - short rejection reason and approval without required historic-price evidence denied;
   - independent reviewer successfully approved, rejected and requested info on separate pending versions;
   - accepted version became current and active, rejected versions remained immutable, and exactly three review audit entries were recorded.
2. `docs/sql/w07-category-management-transaction-smoke.sql` — **passed** with full rollback:
   - viewer and owner conflict denied category writes;
   - reviewer allowed independent business category assignment with documented reason and audit event, but denied super-admin category creation;
   - super-admin allowed edit and nested child creation.
3. The new read-only RPCs were initially rehearsed and denied an unrelated guest. Post-deployment privilege checks confirm `anon` cannot EXECUTE either function, `authenticated` has the intended grant, and **0** W07 synthetic users/offers/categories survived the tests.

No permanent W07 test offers, categories, business assignments, users, events or evidence files were created.

## Open release gates

- CI, web-render/hydration tests and route protection must pass on PR #56.
- Screenshot-based review against the owner's original approved designs and real Android/iOS keyboard, RTL, dark-mode and accessibility testing.
- Real Clerk-signed reviewer end-to-end offer inspection and private Storage signing on actual evidence and image files, with a safe object cleanup route.
- End-to-end category writing using a genuine signed reviewer/super-admin session; SQL-only test is insufficient for production acceptance.
- W06 PR #55 and its remaining Storage signed URL retrieval gate must be closed before W07 can be merged.

**Do not merge PR #56 or mark W07 production ready until these gates are closed.**
