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
| `web` | `static` plus real Merchant & Admin Expo Web exports, Playwright guest/editor/permissions smoke, Admin screenshots, and production-mode preview-bypass checks |
| `native` | `static` plus 6 Expo production JS exports: Customer/Merchant/Admin × Android/iOS |
| `all` | `static`, `web`, and `native` combined |

The script refuses a dirty Git working tree, checks the Node/pnpm versions used by the primary CI job, stops on the first failing command, and writes a private timestamped `PASS` or `FAIL` report under `~/wow-qa-reports/`. Build outputs are temporary; screenshot tools can also write their existing local `artifacts/` folders.

## Required manual approval while GitHub Actions is blocked

1. Developer runs `all` against the **exact PR head commit SHA** on a clean tree, preserves the exit status and full report path.
2. Developer shares the SHA, passing report (after secret review) and required visual screenshots with the reviewer; reviewer checks the SHA matches GitHub's actual PR head.
3. Reviewer examines changed code, safety/data authorization, Android/iOS/web functionality, RTL, dark mode, responsive widths, and any additional role or Storage test fixtures implicated by that PR.
4. Any code update **invalidates the earlier report**. Repeat the relevant verification on the new SHA. Do not merge with failing or absent required evidence. A green local report is **not** a green GitHub check.
5. Retain the GitHub workflow for eventual restoration; note the external blocked status explicitly in the PR and project issue.

## Important uncovered gates

This script **does not** replace the separate pnpm 12 compatibility install, live authenticated Clerk OTP + Supabase Storage/RLS tests, signed-object access with actual accounts, screen-reader tests, physical device validation, or launch approval. Run them separately when relevant and keep NO-GO if they are required but missing.

There is **no need for a paid GitHub Actions subscription to continue coding, code review, local automated tests or manual acceptance**. A continuously running trusted machine is required only if the team later elects to operate an automated self-hosted runner; this runbook does not create or expose one.
