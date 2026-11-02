# WOW — Approved W00–W09 Packages (Pending Three-Developer Allocation)

**Status:** Package boundaries W00–W09 are approved. The latest owner decision requires **three developers** and a **complete assignment approved in the parent conversation before claims or coding**. No individual is currently assigned. This updates only the allocation procedure, not the scope or dependencies of the packages.

## How it works

Each package is a self-contained group of closely related pages or tasks, potentially spanning Customer, Merchant and Admin. Package boundaries are chosen to minimize conflicts in feature folders, not to force one person to own a particular application.

1. The project owner approves the complete distribution of W00–W09 across the three developers in the parent conversation. Check package dependencies, issues and active PRs before finalizing ownership.
2. **After approval**, the assigned developer comments `Taking W##` in the issue, self-assigns and updates status to in progress. **Only one active owner per package/file scope**. Divide large packages into non-overlapping issues only with explicit coordination.
3. Branch from latest `main`: `feat/w01-customer-discovery`, `feat/w04-offer-workflow`, etc. Use a descriptive suffix. PRs must mention `Refs #issue-number`.
4. Work only in the package's owned feature folders. Shared changes to `packages/api`, `packages/ui`, `packages/auth`, `packages/theme`, root app `index.tsx` or `_layout.tsx` require a dedicated, coordinated PR.
5. Run local `pnpm.cmd typecheck`, `pnpm.cmd lint`, `pnpm.cmd test:query`, `pnpm.cmd test:integration` and relevant UI smoke checks before requesting a merge.
6. After owner-approved merge, continue with the next package in that developer's approved roadmap. Ownership/reallocation changes require the owner's approval; avoid ad hoc package claiming.

## Open package catalog

| ID | Work package | Issue | Dependencies / ownership notes |
| --- | --- | --- | --- |
| W00 | Database structural verification + real multi-role RLS/Storage tests | [#10](https://github.com/Musnad-Tech-Official/wow-platform/issues/10) | **Do first; required before real data or release.** Can run alongside mock-based UI work |
| W01 | Customer home, search, categories, business & offer discovery | [#11](https://github.com/Musnad-Tech-Official/wow-platform/issues/11) | Public offer-details route belongs only to W01 |
| W02 | Customer saved offers/businesses and account states | [#12](https://github.com/Musnad-Tech-Official/wow-platform/issues/12) | Reusable Save component; no W01 route edits |
| W03 | Merchant business creation, branches, verification and profile | [#13](https://github.com/Musnad-Tech-Official/wow-platform/issues/13) | Supplies business and branch IDs needed by merchant workflows |
| W04 | Merchant offer draft, version, media, submission and pause | [#14](https://github.com/Musnad-Tech-Official/wow-platform/issues/14) | Depends on W03 data context (mocks acceptable initially) |
| W05 | Merchant employee access, trial, subscription and billing | [#15](https://github.com/Musnad-Tech-Official/wow-platform/issues/15) | Depends on W03 business context (mocks acceptable initially) |
| W06 | Admin business verification, profile revision and billing decisions | [#16](https://github.com/Musnad-Tech-Official/wow-platform/issues/16) | Admin privilege checked server-side, not inferred from app |
| W07 | Admin offer review and category approval | [#17](https://github.com/Musnad-Tech-Official/wow-platform/issues/17) | Owns its Admin feature folders only |
| W08 | Customer ratings/complaints, Merchant responses and Admin moderation | [#18](https://github.com/Musnad-Tech-Official/wow-platform/issues/18) | Owns cross-app complaint workflow, not the W01 offer-details route |
| W09 | Global app shell, navigation wiring, RTL and acceptance integration | [#19](https://github.com/Musnad-Tech-Official/wow-platform/issues/19) | **Do after** primary feature routes are ready; exclusive ownership of shared app layouts/navigation |

Issues #10–#19 currently have **no confirmed developer assignees**. Assign them only after the three-developer allocation is approved in the parent conversation; do not infer an owner from earlier examples.

### Avoid merge conflicts

Keep each feature's route and components in its own folder. Do not add deep links to another package's route without review. Consumers of `@wow/api` use the exported typed functions and hooks; missing API capabilities become separate backend-contract issues instead of unauthorized direct SQL calls or client-side privilege bypasses.

All private queries rely on the current Clerk session, and customer-facing public discovery must work for signed-out guests. Storage buckets remain private; never use public URL helpers for private evidence. Business/offer approval, billing and Admin actions are server-authorized.

### What should start first?

**W00 is the priority security gate** and can be undertaken by any available contributor while mock-based UI work proceeds independently. For UI, **W01 (customer discovery)** and **W03 (merchant onboarding)** are good independent starting packages, with **W07 (admin offer review)** also independent. This order is about dependencies, **not identities**.

The release-one contract currently covers discoverable verified offers, merchant management and moderation. Shopping cart, online customer checkout and delivery are separate future scope. A local green build does **not** certify a live Supabase database; consult `docs/database-test-runbook.md`.
