---
name: wow-change-verification
description: Use when finishing, reviewing or preparing a Pull Request for any WOW source, asset, test, routing or configuration changes, to check correctness and report verifiable evidence before handoff.
---

# WOW change verification

1. Review the diff for accidental files, unrelated refactors, secrets and generated artifacts. Confirm scope against the requested behavior and existing API, Expo Router and component contracts.
2. Review for likely regressions: type safety, input validation, error handling, account isolation, authorization boundaries, RTL, theme contrasts and native/web compatibility, as relevant to the changed files.
3. Run relevant focused tests first. For cross-app/shared/integration changes, or before proposing merge, run `bash scripts/verify-ui-v08.sh` from the repository root, plus any targeted tests introduced by the change.
4. Do not modify dependencies or lockfiles unless necessary and reviewed. Preserve the frozen-install CI gate. A green static or mocked test does not certify real devices, screenshots, external auth or deployed RLS.
5. When relevant, manually inspect the screen against approved reference at mobile/web widths, Arabic RTL, light/dark and accessibility focus; if no runtime available, explicitly label this as unverified.
6. Summarize: changes and risk, exact checks actually run and PASS/FAIL/SKIPPED, remaining work, and whether review/merge approval is still required. Never claim a command was executed when it was only suggested.
