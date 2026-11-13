# WOW Merchant App — Production-Readiness Maintenance V1

**Status:** OPEN — engineering maintenance, **not a production-ready certificate**  
**Development baseline:** PR #53 merged into `main` at `0e42ddb26810da4141640c934376956407a3fd28`.  
**Maintenance branch:** `maint/merchant-production-readiness`  
**Owner-approved exception:** physical Android/iOS device tests are deferred to the project owner. They must remain explicitly listed as **not executed**, never marked passed.

## 1. Scope and distinction

The 23-screen merchant implementation is now the **development baseline**, not a guarantee that all journeys are production-ready. This phase reviews and repairs all merchant app screens and supporting APIs, authentication, merchant operations, branch onboarding, offers, staff delegation, subscriptions, complaints, storage, error handling, and navigation.

Keep `main` unchanged during review. Make fixes in the maintenance branch, verify them, and deliver a separate Draft PR for owner approval. Never merge maintenance into `main` solely because static CI passed.

## 2. Mandatory acceptance gates

### A — Screen and navigation acceptance
- Review all 23 merchant screens (including MER-01-01/01-02, the existing 13, and MER-12/07/07-01/10/11/11-01/08/09).
- Every visible action must work or explicitly communicate an authorized prerequisite. No silent/no-op/false-success UI.
- Enforce Arabic RTL, light/dark contrast, 390×844 phone viewport, in-app scrolling, keyboard focus, accessibility labels, error/empty/loading/retry/unauthorized states.
- Produce **real rendered** evidence for every screen in both color schemes and relevant full-scroll segments; do not call source mockups implementation evidence.

### B — Real merchant workflows and data integrity
- Login, account recovery, business creation and verification, representative identity, branch create/edit/revision, dashboard, offer creation/pricing/branch scope/evidence/review/publishing, subscriptions/entitlements, staff permissions and revocation, complaints/admin replies, account/profile-media revision.
- Test success, failure, network retry, stale session, concurrent edits, unsaved draft, double submit, business switching, revoked access, deep links and wrong IDs.
- Never silently rely on synthetic preview data in authenticated/production execution.

### C — Server-authoritative security
- Active Clerk subject and Supabase JWT session; production preview bypass prohibited.
- Owner vs delegated employee rights enforced **server-side**, with branch scoping, cache invalidation and audit events.
- Storage keys and files bound to authorized user/business/complaint with strict MIME/size validation; signed URLs only when authorized; no complainant private identity exposure.
- RLS, `SECURITY DEFINER` and RPC `EXECUTE` privileges inspected and tested with owner, delegate, outsider and revoked actor.
- Positive and negative transactional integration tests must clean up their test records.

### D — Full integration
- Test actual authenticated end-to-end routes where permitted by development configuration, not only snapshots or source assertions.
- Regression coverage in CI for both legacy and final merchant screens and for previously observed security failures.
- Production JavaScript exports for Android and iOS and web output checks; export is **not** a physical-device pass.
- Perform a final independent code/security/visual review on the **exact** commit proposed for merging.

### E — Release operations
- Provide release configuration, integration/environment readiness, migrations/runbook and rollback procedures before any production release.
- Production external services and missing admin functionality must be enabled or formally excluded from release scope with clear product acceptance; absence cannot be masked by preview UX.
- Record the deferred device-test gate clearly as an owner-held release follow-up.

## 3. Known blockers to investigate and close

1. **Per-version owner consent for offers:** confirmed in prior review as missing mandatory server-side proof in the administrative approval flow. Implement explicit owner confirmation tied to the precise immutable offer version, enforce before approval/publication, log audit and test delegate/owner/replay/version-switch boundaries.
2. **Clerk production/native readiness:** development Google/Facebook providers and callback were verified; a production Clerk instance and native application registrations were not confirmed. Verify actual release configuration; do not assume production SSO is ready.
3. **Billing/plan configuration:** development `BASIC` and `ADVANCED` plans were inactive and lacked approved real prices at review time. No fabricated purchasing/processing or false activation. Define approved commercial workflow and reconcile with administrative actions.
4. **Administrative complaint lifecycle:** merchant replies must be directed **only to administration**; full cross-app administrative workflow depends on the admin implementation. Validate request-for-clarification, secure evidence, decision visibility and owner-only official response; record cross-team dependencies.
5. **Exceptional account recovery/ownership:** existing MER-01-02 can direct the user to identity-provider recovery. Recovery of business ownership or a lost identity requires a separately approved, audited administrative identity-proofing process; never auto-regrant revoked access.
6. **Full authenticated journey coverage:** expanded light/dark browser previews and CI checks are not equivalent to authenticated, persisted E2E across all merchant flows; close remaining journey-level gaps.
7. **Device acceptance:** explicitly deferred by owner. No physical Android/iOS testing has been claimed.

## 4. Execution order

1. Freeze baseline and inventory screens, flows, permissions, migrations and CI gates.
2. Prioritize **P0** security/data-integrity blockers, then **P1** broken workflows, then **P2** visual/accessibility issues.
3. Fix root causes on this branch; record each issue, test and changed route. Re-test neighboring screens and cross-business boundaries.
4. Add missing automated and authenticated tests. Obtain actual screenshots in both schemes and scrolling contexts.
5. Verify server migrations on development before any separate production deployment. Do not apply migrations to production without owner-approved release procedure.
6. Re-run the full CI and independently review the exact final maintenance commit.
7. Open or update a Draft PR with issue closure matrix, evidence, release runbook and remaining external dependencies. Request owner approval for any later merge.

## 5. Closure criteria

The maintenance loop may be labeled **engineering-complete / ready for owner device acceptance** only if all in-scope P0/P1 issues are closed with evidence, all supported CI and authenticated workflows pass, and no fabricated functionality remains.

**Never label the application fully production-accepted while the owner-held physical device gate or any essential external production integration remains unverified.** A maintenance merge is distinct from a production release.
