# WOW — Parallel UI Workstreams (Feature- and Page-Based)

**Goal:** Turn the stable `@wow/api` foundation into usable pages across Customer, Merchant and Admin without having three developers change the same code. This is a proposed development assignment for the current discovery/merchant-management MVP, not a launch-readiness sign-off.

## Rules for parallel work

- Assign each **connected workflow** to **one feature owner**, including its closely related pages and components. This is **not** a rigid one-application-per-person split.
- New routes belong under independent feature route names; share screen-specific components only within the feature's own directory. Do not edit another owner's feature files.
- The existing `packages/api`, `packages/auth`, `packages/theme`, `packages/ui`, and shared app `_layout.tsx` files are **frozen for concurrent page work**. Propose shared changes via a small dedicated PR; coordinate a single integrator for navigational changes.
- Each contributor starts from **latest main**, uses a feature branch and submits a narrowly scoped PR. Run `pnpm.cmd typecheck`, `pnpm.cmd lint`, `pnpm.cmd test:query`, `pnpm.cmd test:integration` locally.
- The root `index.tsx` and `_layout.tsx` files in each app are integration files: the coordinating developer owns those edits in a dedicated final wiring PR. Individual contributors implement their feature route and component files.
- Do not put private admin evidence, credentials, private Storage keys, or unpublished offers into public Customer UI; rely on role-appropriate API exports.
- Backend live integration is a separate audited workstream. UI teams can start with deterministic mock data and replace it with the typed hooks as soon as contracts are verified.

## Three feature-owner lanes

| Owner | Connected workflow and pages | Candidate file ownership |
| --- | --- | --- |
| **Islam** | Customer discovery: home, category browse, search/filter, business details, public offer details, favorites; Admin taxonomy screen for controlled categories | `apps/customer/src/features/discovery/**`, `apps/customer/src/features/favorites/**`, `apps/customer/src/app/discover/**`, `apps/customer/src/app/business/**`, `apps/customer/src/app/offer/**` (public offer display); `apps/admin/src/features/taxonomy/**` and `apps/admin/src/app/taxonomy/**` |
| **Sabri** | Merchant onboarding/management: business and branch setup, business/branch verification status and submission, owner team/access, pause/resume, profile revisions and billing/trial/subscriptions; the *corresponding* Admin verification/billing/profile-review screens | `apps/merchant/src/features/business/**`, `branches/**`, `verification/**`, `team/**`, `billing/**`, `profile/**` under `features/`; merchant routes by the same names; `apps/admin/src/features/verification/**`, `billing/**`, `profile-revisions/**`, matching Admin routes |
| **Shahir** | Offer lifecycle and trust: Merchant offer create/edit/submit/media/availability; Admin offer queue and independent offer decisions; Customer rating/complaint components and complaint history; Merchant complaint reply; Admin rating/complaint moderation | `apps/merchant/src/features/offers/**`, `complaints/**`; Merchant routes `offers/**`, `complaints/**`; `apps/admin/src/features/offer-review/**`, `moderation/**` and matching routes; `apps/customer/src/features/feedback/**`, `apps/customer/src/app/feedback/**` |

The lanes are **functional ownership**, not a prohibition against working in multiple apps. The complete complaint workflow remains with Shahir; the public offer details page remains with Islam. For the “Rate / Report” entry actions on offer details, Shahir supplies reusable, exported feedback UI components and Islam attaches them to the public offer details page in a coordinated integration PR. Avoid simultaneous changes to `apps/customer/src/app/offer/**`.

Before implementation, agree on the design shell and naming scheme once: Arabic RTL, Tajawal typography, accessible loading/empty/error states, responsive targets, and the current brand/theme. Do not let individual features each reinvent the global navigation or duplicated UI primitives.

## Proposed delivery batches

### Batch A — independently runnable UI

- Islam: guest home/discovery/search/details using public discovery RPCs, then favorites after auth.
- Sabri: merchant business selector, business profile, branches and verification states; admin verification decision panel.
- Shahir: merchant offers list, draft editor, review submission and status; admin pending offer review.

All can develop in parallel after their base branches are created from the same `main`, with no overlapping feature folders.

### Batch B — operational UI

- Islam: filters/categories, public offer media presentation, favorites and polished empty/error states, admin taxonomy.
- Sabri: employees/permissions, branch pause, profile revisions, trials/paid subscription requests and admin payment review.
- Shahir: attachment workflow, availability pause/resume, registered-user conformity rating and complaint submission/history, merchant complaint response and admin moderation.

### Batch C — integration and acceptance

One coordinator integrates feature entry routes and navigation in `index.tsx`/`_layout.tsx`. Validate Auth gating, signed-out discovery, guest-to-signed-in transitions, partial employee branch permissions, no drafts appearing in Customer, no paid plan activation from a submitted payment reference. Run local gates and cross-feature smoke tests.

## Suggested branch names

| Owner | Batch A branch | Batch B branch |
| --- | --- | --- |
| Islam | `feat/customer-discovery-pages` | `feat/customer-discovery-polish` |
| Sabri | `feat/merchant-onboarding-pages` | `feat/merchant-operations-pages` |
| Shahir | `feat/offers-review-pages` | `feat/trust-moderation-pages` |

Once Batch A PRs merge, each owner branches Batch B from fresh `main`. Keep PRs small enough for clear review and local testing, not one PR per entire application.

## Page contract review

Every page should identify the matching `@wow/api` hook, user role, input IDs, loading/empty/error outcomes, retry semantics, and success-state invalidation. A feature that needs a missing RPC or schema field should open a focused backend-contract issue/PR rather than inventing a client-only security bypass.

**This plan covers the approved first-release offer discovery platform.** Cart, integrated customer checkout, delivery and consumer-wallet payments require a separately approved API/schema phase and are not assumed to exist today.
