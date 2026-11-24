# AUD-025 development migration evidence

Applied on 2026-11-24 to WOW Development, migration `20261124184019_stage5_aud025_assessment_target`.

The exact migration SQL passed 17/17 transaction-scoped regression cases before application and the installed functions passed the same 17/17 cases afterwards. No real signed Clerk JWT/HTTP or device acceptance asserted; Stage 6 retains those gates. Advisor review found no new lint entry specifically naming the assessment functions; existing database advisories remain open for their appropriate review. Public discovery remains unchanged. Rollback: revert dependent clients first; drop only `public.wow_customer_get_assessment_offer(uuid,text)` followed by `wow_private.customer_get_assessment_offer_internal(uuid,text)` in an approved tracked migration. No production deployment.
