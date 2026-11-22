# Stage 4 AUD-002 — CI regression script coverage

## Scope

The source gate previously ran the broad workspace/lint/type/integration and UI suites, but it did not invoke nine available Customer regression suites. This change adds the missing Customer source, route, state, and mocked API suites to the **existing** `scripts/verify-ui-v08.sh`. Both the main GitHub `verify` job and the no-cost local `verify-local-quality.sh` call that same script, so they share coverage.

The added suites, in execution order:

1. `test-customer-navigation-onboarding.cjs`
2. `test-customer-account.cjs`
3. `test-customer-business-details.cjs`
4. `test-customer-offer-details.cjs`
5. `test-customer-complaint.cjs`
6. `test-customer-my-complaints.cjs`
7. `test-customer-complaint-details.cjs`
8. `test-customer-favorites.cjs`
9. `test-customer-discovery.cjs`

These existing files use source contracts, isolated Node tests and local mocks. The discovery suite also compiles source into a temporary directory; it may take longer than other source tests.

## Deliberately separate gates

The Playwright scripts `test-admin-browser-playwright`, `test-merchant-guest-playwright`, `test-merchant-final-8-playwright`, `test-merchant-batch-02-playwright` are executed in dedicated browser jobs and/or `verify-local-quality.sh web`; they **must not** be launched as plain source tests because they require Chromium and a fresh Expo export.

The `test-merchant-live-auth-playwright.cjs`, `test-merchant-authenticated-http.cjs`, and `test-stage4-offer-scope-staging.cjs` depend on explicit non-public credentials or staging fixtures; they are opt-in and must not be silently inserted into default CI. Browser capture utilities with independent launch/build requirements remain separately scheduled.

## Acceptance status

The source coverage and wiring were reviewed; full workspace execution, web exports, and live authentication **remain unverified** until end-of-stage QA or GitHub-hosted runners recover. Do not interpret adding a script to CI as a passing test. Ref: AUD-001 private-runner admission remains open.
