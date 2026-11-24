# Stage 6 — acceptance register and first execution evidence

Baseline: main 31a688daa355921009b90ab3a61e016257115ae3 (Stage 5 implementation closure). CI 45490447243 passed applicable jobs. Keep approved Stage 4 acceptance-transfer register and frozen backlog authoritative. This is not final product acceptance.

| Workstream | Evidence obtained | Remaining gate / status |
|---|---|---|
| AUD-003 / W08 | 24/24 cross-role SQL cases under authenticated DB role, synthetic JWT claims; full rollback | signed Clerk JWT + HTTP, actual browser workflow, storage; PARTIAL |
| AUD-012 | 41 unindexed FK advisor findings, 12 unused-index INFO findings | measure each high-impact FK join/delete and write cost; no blanket index creation; OPEN |
| AUD-040 | 1,000 saved IDs per account, two accounts, RLS isolates; 5 full reads median 0.733 ms/max 0.904; 5 limit-24 reads median 0.663/max 0.720 ms | API keyset paging + virtualized rows implemented on branch, CI and large-list browser/native metrics pending; PARTIAL |
| AUD-060 | Advisor names users, business_members, saved_offers, saved_businesses. All four inspected policy definitions already use scalar SELECT auth.jwt(); saved_offers actual EXPLAIN confirms InitPlan loops=1 | verify remaining three actual plans, compare representative data; do not rewrite based on advisor warning alone; PARTIAL |
| AUD-008 / 011 / 046–048 | Previous source/guest checks | signed login/logout/return, role error, two businesses, account switch/cache isolation and history; NOT_RUN |
| AUD-015 / 016 / 021 / 022 / 043 | previous transactional SQL only | cross-role real JWT and Storage GET/LIST/sign/upload, concurrency; NOT_RUN |
| AUD-017–019 / 034 / 038 and 5A–5D | existing SQL + public browser gates; W08 additional cases above | real workflows with authorized role matrix; NOT_RUN |
| AUD-039 / 041 / 061 / 062 / 063 | previous source/browser limited checks | all screens widths 320/375/430/599/600/639/640/768/1023/1024/1439/1440/1920, RTL themes, focus/keyboard, device, approved visual references; NOT_RUN |
| AUD-052 / 054 / 056 / 059 | existing route and development redirect setup | real provider flows, recovery/linking preserving subjects; do not disable legacy factors until validated; BLOCKED for protected auth setup |

## Real-session prerequisites (not provisioned or verified)
- Existing public CI uses trusted main + manual workflow_dispatch + protected wow-merchant-e2e environment. Connector rejects environments endpoint and lacks environment/secret write and manual dispatch. Do not add secrets to PRs, repo, logs or public artifacts; do not enable automatic credentialed execution on public PRs.
- Dedicated QA identities only, distinct subject IDs; fresh sessions; exact fixture inventory and cleanup/rollback. Guest, two unrelated customers, two businesses, owner, assigned/unassigned/zero-permission employee, viewer, independent reviewer, conflicted reviewer, super_admin and suspended roles. Elevated memberships only for scoped test window after protected setup. Do not grant permanent reviewer or super_admin access.
- Existing manual OTP test is not Google/Facebook acceptance. Existing optional Storage checks require isolated fixture and scoped cleanup. No standing DELETE policy or broad service role for client tests.
- Historical credential incident remains urgent: three affected profiles are suspended in Supabase; Clerk read confirms three users not banned or locked, password_enabled false. Provider session revocation, identity containment and historical scan remain unverified; no provider action available. Do not use those accounts for tests.

## Measurement interpretation
Benchmark used rollback-only inserts of 1,000 draft offers and two sets of 1,000 saved offers; 5 executions each, actual authenticated role with synthetic claims. Not a production workload, network or browser performance result. No residual synthetic users/businesses/offers/saves. API page size 200; request ordering uses created_at DESC/id DESC with cursor and duplicate guard. Grid keeps existing breakpoints, uses FlatList row virtualization (initial 4 rows, 4 per batch, window 5); 1,001-ID contract tests added, pending CI. No new persistent migration. 
