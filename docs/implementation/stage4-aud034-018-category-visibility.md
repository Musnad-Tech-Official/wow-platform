# Stage 4C — AUD-034 public discovery and AUD-018 category constraints

## AUD-034: revoked categories stop public offer discovery

**Deployed to original WOW Supabase** `jfqmdnffqwkqevdhmtfi` as migration `20261122202334_stage4_discovery_requires_active_assigned_offer_category`. This changes only the existing `wow_private.discoverable_offer_branches()` function. It retains existing business, branch, offer approval, time, merchant availability and publication-entitlement predicates.

Every discovery read now requires the offer version's `category_id` to be both:
- a currently active category whose parent (if any) is also active, and
- an approved business-category assignment for the same business.

The condition is evaluated on every query, not just when an offer was originally approved. Revoking the leaf, its parent or the assignment therefore immediately removes the offer from public discovery; restoring authorization permits it again. Draft/other nonpublic offer versions remain hidden by their original predicates.

### Verified PostgreSQL regression

Used `docs/sql/stage4-aud034-transacted-regression.sql` inside a transaction with synthetic owner, business, branch, subscription, approved offer, linked category and authenticated JWT claim. This fixture respects the production version state machine (`draft → pending → approved`) and member-submission trigger. The SQL was run **with the proposed function in a rolled-back transaction, then against the deployed function**. All **8/8** cases passed both times:

- active approved category appears;
- deactivating leaf category hides;
- deactivating parent category hides;
- restoring category reappears;
- removing business-category assignment hides;
- reassigning category reappears;
- pausing business still hides;
- unpausing business reappears.

The transaction rolled back all temporary rows. The live database retained **2 existing business rows, 0 offers, 0 AUD-034 fixture users and 0 AUD-034 categories** after validation. A live function MD5 was recorded: `a3391cf5780d41d30d57de4a70c97853`. No public grants, role grants or other functions were changed.

**Not yet tested:** a real visitor HTTP request to the REST discovery RPC and visual/browser/physical-device acceptance; these remain part of the end-of-Stage-4 verification and cannot be counted as passing.

## AUD-018: existing category constraints, no migration

A live read-only inspection of the original database found that `public.categories` already enforces both:
- `categories_slug_check`: lowercase ASCII alphanumerics separated by single hyphens, max 100 characters.
- `categories_sort_order_check`: integer `0..100000`.

The upsert RPC delegates the final check to these table constraints. Do **not** create redundant category constraints or rewrite the existing upsert merely to close an outdated audit observation. The DB contract is already present; separate input-error UI/edge-case acceptance has not been run.

## Remaining security notices

Supabase Security Advisor still reports generic `SECURITY DEFINER` accessibility warnings and an RLS policy coverage info notice. These were not introduced by this migration. They require a separate authorization/grant review; this fix does not waive them.

Project gate: GitHub hosted runner allocation unresolved (AUD-001); do not claim full CI success.
