# WOW — Design foundation approval and implementation handoff

**Decision date:** 2026-11-02  
**Status:** Approved design baseline; implementation can begin after work allocation is agreed.

## Approved scope

The existing WOW UI/UX visual direction, shared design tokens, common components, icons, animations and approved Customer/Merchant/Admin screen previews are the **visual implementation baseline**. No exhaustive component catalog is required before building product pages. Build app-specific components as actual screen requirements demand.

## Change policy during implementation

Developers **may propose and implement** improvements to existing components or add reusable components when they find genuine cross-screen reuse, accessibility, responsiveness, visual defects, or missing states. Match approved screen specifications and brand language. Changes to shared `packages/ui`, `packages/theme`, `packages/assets`, navigation shells or cross-app contracts must use a separately scoped reviewed PR and coordinate file ownership to avoid competing edits. Do not silently alter approved layouts or business rules. Include light/dark, RTL, responsive, keyboard and screen-reader checks wherever relevant.

## Closed design issue

`Stepper` numeric badges were visually misaligned in Arabic RTL preview. The patch centers digits in an explicitly LTR text container inside the status circle, keeping semantic colors, completed checkmarks and the existing component API. Source/type-syntax checks passed; cross-platform rendering should be confirmed during page-level QA.

## Next planning discussion — not authorized for execution yet

Agree the division of work among **three developers**, dependencies, branch boundaries, shared package ownership, integration and review process, and independent ChatGPT conversation branches. Existing `docs/ui-workstreams.md` currently describes self-service unassigned W00–W09 packages; it has **not** yet been replaced by a three-developer assignment plan. No developer assignments or feature branches are created by this decision record.

## State and limitations

Design is approved for implementation, not a claim that every device-specific behavior has been exhaustively tested. Prior local V0.7 and V0.8 patches were not confirmed present in GitHub when this decision was recorded; before further code work, the team must reconcile any uncommitted local changes with the merged repository. Live database/RLS tests remain an independent security gate before using real customer data or release.
