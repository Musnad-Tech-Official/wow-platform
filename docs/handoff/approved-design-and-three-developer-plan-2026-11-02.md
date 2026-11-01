# WOW — Approved UI Closure and Three-Developer Handoff
Date: 2026-11-02
Status: **UI/UX design approved and closed for planning; implementation authorized.** This document records the user's latest decision and supersedes older unassigned-workstream guidance **for this three-developer execution cycle**. It does not merge PR #22 or certify production readiness.

## 1. Design approval
- Approved Customer, Merchant and Admin UI designs, existing shared components, illustrations, colors, typography, RTL rules and motion are the **visual implementation baseline**.
- This is an adaptable baseline, not a freeze on responsible improvements. Developers may fix defects, refine components, or add reusable components needed on multiple pages, preserving the design language, accessible behavior, light/dark contrast, responsive layouts and compatibility with Expo React Native/Web.
- Reuse compatible OSS where it helps; do not add platform-incompatible packages merely for visual appeal. Prefer existing @wow/ui, @wow/theme, @wow/assets, Lucide and Reanimated.
- Do not prebuild every component or character illustration. Introduce product-specific OfferCard, MerchantCard, CategoryCard and other components only when approved page flows need them.
- **Revised Stepper note:** number/circle alignment in the Stepper component is a known *non-blocking implementation polish issue*. Keep it in the implementation backlog; do not silently claim it is fixed. Cross-app component edits require a dedicated coordinated change.
- Validation done previously was not a substitute for final device/browser accessibility and production security verification. UI design sign-off does not mean all platform QA is complete.

## 2. Handoff prerequisite / branch baseline
- Repository: Musnad-Tech-Official/wow-platform.
- Latest verified shared UI branch in earlier review: feat/shared-ui-foundation, commit fbf3b85db6e54857f9aa1487ed787866abb30efb, draft PR #22. Additional V0.7/V0.8 changes were delivered as local overlay ZIPs and **must be committed/pushed and verified before parallel implementation relies on them**.
- main currently has the earlier Clerk/RTL fixes; do not assume that the UI branch has been merged into main.
- First synchronize and review a common branch/commit containing the approved UI plus the latest local overlays. When ready, make each developer branch from that **same verified commit**. Do not rebase others' in-progress work behind their backs or merge PR #22 automatically.
- Existing GitHub Issues #10–#19 describe the work. They currently have no verified named assignees. "Developer 1/2/3" are approved roles, not GitHub user accounts; set assignees after actual GitHub identities are known.

## 3. Work distribution (three concurrent lanes)
### Developer 1 — Customer
Primary scope: apps/customer/src/features/** and feature-owned customer routes, excluding app/index.tsx and app/_layout.tsx.
Sequence: W01 (#11) Customer discovery and approved offer/business details -> W02 (#12) saved offers/businesses, account states -> Customer-specific part of W08 (#18) feedback/ratings. Coordinate W08 integration with Developer 3. Own public offer detail routes, so other developers do not edit them.
First package: W01.

### Developer 2 — Merchant
Primary scope: apps/merchant/src/features/** and feature-owned merchant routes, excluding app/index.tsx and app/_layout.tsx.
Sequence: W03 (#13) business onboarding, branches, verification and profile -> W04 (#14) offer drafts, media, versions, review and pausing -> W05 (#15) staff, trial, subscriptions and billing -> Merchant-specific part of W08 (#18) complaint responses.
First package: W03.

### Developer 3 — Admin, integration and security coordination
Primary scope: apps/admin/src/features/** and feature-owned admin routes; independent W00 testing, then global navigation only in a later exclusive integration window.
Sequence: **start W00 (#10)** Migration 010 read-only verification and cross-role RLS/Storage checks in staging with synthetic identities; in parallel where safe implement W07 (#17) offer/category review -> W06 (#16) merchant verification/profile/billing review -> Admin moderation component of W08 (#18) -> W09 (#19) final navigation/access/shell acceptance after page handoffs. Do not perform privileged production database changes without separate authorization.
First packages: W00 security (priority) and W07 UI (synthetic data), with non-overlapping files.

### Coordination and ownership
- For W08, preserve original cross-app issue and break into explicitly scoped sub-issues/PRs per developer before simultaneous edits.
- W09 owns apps/*/src/app/index.tsx and _layout.tsx and any cross-app shell/nav changes. Defer until routes are supplied; a single developer at a time owns these files.
- Shared packages (@wow/ui, @wow/theme, @wow/assets, @wow/api, @wow/auth), package manifests and lockfiles are controlled surfaces. Proposed changes go through a *separate small coordinated PR*, owned by one developer at a time; others consume its merged/approved version.
- Each feature works in its owned folders and opens a separate draft PR. No direct edits to main, no merges without owner approval.
- Screens must match approved UI, including illustrations, responsive mobile/tablet/web, RTL, light/dark, content states (loading/empty/error/denied), accessibility labels and minimum targets.
- Use typed @wow/api and session-aware auth/query hooks; no direct SQL/RLS bypass, no public URL for private storage, no fake success, no automatic replay of ambiguous writes.
- Run pnpm typecheck, pnpm lint, pnpm test:query, pnpm test:integration and UI smoke review. These local tests cannot certify live database security.
- Do not use real private customer data until W00 live security controls are confirmed.

## 4. Conversation handoff briefs
Start one new chat for each lane, supplying the same approved project archive/doc and relevant GitHub repository branch. A chat is a planning/work context; it is not automatically a Git branch.

### Chat 1 — WOW / DEV-01 / CUSTOMER
Continue MUSNAD-WOW from the approved UI/UX baseline dated 2026-11-02. You are Developer 1, responsible for Customer W01 (#11), then W02 (#12), then the Customer scope of W08 (#18). Read this handoff and the repository current files before implementing. Do not recreate the design system or edit shared root layout/navigation. Match approved Customer previews, build complete user-facing pages from actual page specs, and create reusable feature components when needed. Keep changes in your own feature branch from the verified shared baseline. Report file ownership, tests, states and PR; do not merge.

### Chat 2 — WOW / DEV-02 / MERCHANT
Continue MUSNAD-WOW from the approved UI/UX baseline dated 2026-11-02. You are Developer 2, responsible for Merchant W03 (#13), then W04 (#14), W05 (#15), then Merchant W08 (#18) scope. Read this handoff and the repository current files before implementing. Preserve the approved Merchant visuals and assets. Begin with business/onboarding/branches/verification using typed APIs and synthetic data. Avoid shared package/root route edits. Keep a separate branch, test and provide a draft PR; do not merge.

### Chat 3 — WOW / DEV-03 / ADMIN-QA
Continue MUSNAD-WOW from the approved UI/UX baseline dated 2026-11-02. You are Developer 3, responsible first for W00 (#10) read-only structural audit and staged role/Storage security checks, and for Admin UI W07 (#17) with synthetic data, followed by W06 (#16), Admin W08 (#18) and W09 (#19) integration when the others hand off route exports. No production SQL changes or actual customer evidence. Preserve Admin visual design, authorization boundaries, RTL/light/dark/accessibility; edit cross-app entry layouts only in the exclusive W09 phase. Keep separate branches/PRs, test and do not merge.

## 5. Current phase gate
Design: **closed / approved** by the project owner.
Three-developer allocation: **approved by role**; GitHub account assignment pending.
Development: **ready after shared baseline synchronization**; W00 audit can start independently.
Stepper circle-number alignment: **open low-priority visual defect**.
PR #22: **draft/unmerged** unless independently verified otherwise.
Production security and launch readiness: **not approved by this document**.
