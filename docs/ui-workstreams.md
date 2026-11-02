# WOW — Feature package catalog (W00–W09)

These are **functional specifications**, not developer assignments or chat-management instructions. Each numbered package has a corresponding GitHub issue containing its acceptance criteria.

| ID | Feature | Issue | Key technical dependencies |
| --- | --- | --- | --- |
| W00 | Database structural verification, staging, real RLS/Storage role-matrix and security review | [#10](https://github.com/Musnad-Tech-Official/wow-platform/issues/10) | Original reviewed migration source, isolated test identities and `docs/database-test-runbook.md` |
| W01 | Customer discovery: home, search, categories, business and offer details | [#11](https://github.com/Musnad-Tech-Official/wow-platform/issues/11) | Public `@wow/api` discovery hooks |
| W02 | Customer saved offers/businesses and account states | [#12](https://github.com/Musnad-Tech-Official/wow-platform/issues/12) | Signed-in hooks and W01 detail entry points |
| W03 | Merchant business onboarding, branches, verification and profile | [#13](https://github.com/Musnad-Tech-Official/wow-platform/issues/13) | Business/branch/verification/profile APIs |
| W04 | Merchant offer drafts, revisions, media, submission, pause | [#14](https://github.com/Musnad-Tech-Official/wow-platform/issues/14) | W03 business/branch context; offer and media APIs |
| W05 | Merchant staff access, trial, subscriptions and billing | [#15](https://github.com/Musnad-Tech-Official/wow-platform/issues/15) | W03 business context; staff/billing APIs |
| W06 | Admin verification, profile revisions and merchant billing review | [#16](https://github.com/Musnad-Tech-Official/wow-platform/issues/16) | Server-authorized admin identity and APIs |
| W07 | Admin offer review and categories | [#17](https://github.com/Musnad-Tech-Official/wow-platform/issues/17) | Admin offer/category APIs |
| W08 | Ratings, complaints, merchant responses and Admin moderation | [#18](https://github.com/Musnad-Tech-Official/wow-platform/issues/18) | Customer/merchant/admin complaint and media APIs |
| W09 | Shared application shell, navigation, RTL, access states and acceptance | [#19](https://github.com/Musnad-Tech-Official/wow-platform/issues/19) | Feature routes and app-level providers |

## Implementation boundaries

- UI follows `docs/design-system.md`; only actual accepted screens and business behaviors should be implemented.
- Customer public discovery must work without signing in; private profile, saved and evidence data require authenticated authorization.
- Use exported typed `@wow/api` hooks. No direct restricted-table writes, no auth bypass, no private Storage public links, and no optimistic confirmation of uncommitted financial decisions.
- `W09` is the app-level routing and navigation integration surface, including root `src/app/index.tsx` and `_layout.tsx`.
- Native/web UI must cover loading, empty, error, forbidden and signed-out states, plus light/dark contrast and Arabic RTL.

Acceptance details live in Issues #10–#19. SQL testing instructions live in `docs/database-test-runbook.md`.
