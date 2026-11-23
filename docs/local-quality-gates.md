# WOW — No-cost local quality gates

## Purpose

GitHub-hosted runners currently fail to start for the private `wow-platform` repository before any job step (AUD-001, [Issue #64](https://github.com/Musnad-Tech-Official/wow-platform/issues/64)). This is an infrastructure/billing-eligibility blocker, not a pass/fail result for the source code.

**Do not pay for runners, publish the private repository, disable security checks, or mark unexecuted GitHub checks successful to bypass this issue.** Run the project's real checks on a trusted developer laptop or existing workstation until hosted CI can be reinstated.

## One-time prerequisites

- Clone the **private** repository with the developer's existing Git access.
- Install Node.js **22**, pnpm **10.21.0**, Git and Bash (macOS/Linux/WSL or Git Bash).
- For web browser checks, install the operating system dependencies required by Playwright/Chromium (the script installs the Chromium browser binary locally, but may need OS packages on Linux).
- For app bundles and browser tests, configure each app with its own ignored `.env.local` using the existing `.env.example`. Use **development publishable** Clerk/Supabase credentials only. Never put service-role keys, database passwords or live user credentials into `EXPO_PUBLIC_*`.
- Do not publish or share logs containing personally identifying information or secrets; inspect local logs before attaching them to a PR.

## Commands

From the repository root **after committing changes**, on the exact revision to be reviewed:

```bash
bash scripts/verify-local-quality.sh static
bash scripts/verify-local-quality.sh web
bash scripts/verify-local-quality.sh native
bash scripts/verify-local-quality.sh all
```

The default mode is `static`. `web`, `native`, and `all` **also run the full static gate first**. Run just `all` when verifying an entire release candidate:

```bash
bash scripts/verify-local-quality.sh all
```

| Mode | What actually runs |
| --- | --- |
| `static` | frozen pnpm install, repository and brand assets integrity, browser/staging script syntax, existing `scripts/verify-ui-v08.sh` UI/API/query/integration/typecheck/lint gate |
| `web` | `static` plus real Customer/Merchant/Admin Expo Web exports; Customer deep-link/onboarding SPA checks in development and production, Merchant/Admin browser guest/editor/permissions smokes, Admin screenshots, and production preview-bypass checks |
| `native` | `static` plus 6 Expo production JS exports: Customer/Merchant/Admin × Android/iOS |
| `all` | `static`, `web`, and `native` combined |

The script refuses a dirty Git working tree, checks the Node/pnpm versions used by the primary CI job, stops on the first failing command, and writes a private timestamped `PASS` or `FAIL` report under `~/wow-qa-reports/`. Build outputs are temporary; screenshot tools can also write their existing local `artifacts/` folders.

## Stage 4 development and acceptance policy (approved 2026-11-22)

During development of each Stage 4 wave, the assistant may review source, add bounded regressions and merge changes **without requiring the developer to run local tests after every commit**. Every such merge MUST disclose that full tests have not run; source review or JavaScript syntax alone must not be reported as functional acceptance. Database authorization, billing and RLS migrations remain exceptions: validate actual transaction-scoped SQL role cases before/after applying any sensitive change, and preserve the applied migration version.

**End-of-stage acceptance is separate and mandatory**:

1. Developer updates `main`, verifies a clean working tree, and runs `bash scripts/verify-local-quality.sh all` with Node 22 and pnpm 10.21.0. Capture the **exact tested SHA**, command exit status and private report path.
2. Reviewer checks that the tested SHA is the exact current `main` SHA. Preserve the report after reviewing it for secrets. Any new code change invalidates that acceptance; repeat the full gate on the new revision.
3. Reviewer checks the Customer, Merchant and Admin browser exports, Guest vs authorized role behavior, dark/light/system persistence, RTL, breakpoint widths, link refresh/back/navigation, and signed Clerk/Supabase Storage scope where needed. Real device/iOS/Android accessibility and signed-in OAuth remain **separate evidence items**.
4. Existing automated `all` does not run authenticated Clerk login/OTP, signed Storage object GET/LIST, real-device screen reader, or production deployment HTTP rewrites. These must be explicitly marked `NOT_RUN` until separately verified. **Do not approve Stage 4** merely because `all` passes.
5. GitHub-hosted runner allocation remains tracked in [issue #64](https://github.com/Musnad-Tech-Official/wow-platform/issues/64); a green local result is not a green GitHub Actions result.

Unexecuted gates remain **pending** and are not silently waived. No PR may be described as deployed/accepted unless independently verified on the actual target environment.

## Important uncovered gates

This script **does not** replace the separate pnpm 12 compatibility install, live authenticated Clerk OTP + Supabase Storage/RLS tests, signed-object access with actual accounts, screen-reader tests, physical device validation, or launch approval. Run them separately when relevant and keep NO-GO if they are required but missing.

There is **no need for a paid GitHub Actions subscription to continue coding, code review, local automated tests or manual acceptance**. A continuously running trusted machine is required only if the team later elects to operate an automated self-hosted runner; this runbook does not create or expose one.
