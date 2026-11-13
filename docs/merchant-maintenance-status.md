# WOW Merchant — Maintenance checkpoint / نقطة الاستئناف

**Last update:** 2026-11-14  
**Source of truth:** `docs/MERCHANT_PRODUCTION_MASTER_PLAN_V2_AR.md`.  
**PR:** #54 Draft — https://github.com/Musnad-Tech-Official/wow-platform/pull/54  
**Branch:** `maint/merchant-production-readiness` (based on PR #53 merge `0e42ddb`).  
**Workflow:** V2.2, development branch changes permitted; no merge or production deployment without explicit owner approval.  
**Current phase:** **PLAN REVIEW — no implementation phase has started.**

## Latest verified status

- The 23-screen merchant initial development baseline was merged through PR #53.
- A master maintenance plan V2.0 has been created for monorepo, shared UI, navigation tabs, onboarding, permissions, billing, offers, complaints, release acceptance.
- The master plan's architectural and product-sensitive proposals are **awaiting owner acceptance**. Do not treat ADR-02/04/05/06/07/08 as decisions already approved.
- **Real physical-device Android/iOS tests are deferred to the owner**, explicitly unverified.
- Previous CI success is for a historical head SHA and **must not be treated as current test completion** after future branch edits.
- No real production resources should be modified as part of this planning work.

## Pending next steps (priority)

1. Owner reviews and approves/amends `MERCHANT_PRODUCTION_MASTER_PLAN_V2_AR.md`.
2. Discuss security-sensitive decisions S-01 (auth/OTP conflict), S-02 (version-bound proprietor consent), S-03 (exceptional account recovery), S-04 (private evidence/retention), S-06 (billing) and S-09 (environment separation).
3. Start Phase 0 — inventory all 23 screens, shared package imports and all data endpoints; publish evidence and the P0/P1/P2 backlog.
4. Carry out Phase 1 server-side security matrix and P0 fixes before risky navigation or onboarding refactoring.
5. Continue through all phases. For each completion update this file with tests actually run, changes, latest SHA and remaining blockers.

## Permanent handoff fields (fill/update after each phase)

| Field | Value |
|---|---|
| Current phase | Plan review, awaiting owner approval |
| Latest working SHA | Read directly from GitHub PR #54 head before each session |
| Latest CI | Read GitHub Actions for current SHA; not inherited from PR #53 |
| Completed phases | None under new master plan |
| Open blockers | S-01 to S-10; see detailed master plan |
| Current PR | #54 Draft; never merge by assumption |
| Migrations on development | Not applied as part of this planning pass |
| Physical devices | Owner deferred; not tested |
| Next action | Approve/discuss plan, then Phase 0 |

## Start of a new conversation

> استأنف صيانة تطبيق التاجر WOW من PR #54. اقرأ `docs/MERCHANT_PRODUCTION_MASTER_PLAN_V2_AR.md` و`docs/merchant-maintenance-status.md` و`docs/merchant-production-readiness-maintenance-v1.md`، وافحص حالة GitHub والـCI ولا تعتمد على الذاكرة. ابدأ بأول مرحلة أو P0 مفتوح، ولا تعِد تنفيذ ما تم إثباته. لا دمج ولا إنتاج دون موافقتي. اختبارات الأجهزة الفعلية مؤجلة لي.
