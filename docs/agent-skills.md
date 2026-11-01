# WOW Developer Tools and Skills (selection rules, not installed packages)

Tools and ChatGPT app/skill connections are environment-specific. This document **does not claim** that every developer has them enabled. Discover and load relevant tool guidance **before** performing tool-specific work.

- **GitHub:** use the repository connection or ordinary Git to inspect branches, Issues W00–W09 and PR diffs. Preserve file ownership and approvals. Never use a tool to bypass required checks or branch reviews.
- **Supabase:** load the installed Supabase skill if available. Check current Supabase documentation and changelog before schema/RLS work. First compare the intended project and environment, and use read-only catalog access unless the owner explicitly approves separately reviewed mutations. Original SQL migrations and `010_verify.sql` are required; never infer them from React Query mocks.
- **Expo / React Native:** inspect current `apps/<app>/package.json` versions and relevant [Expo SDK 57 versioned documentation](https://docs.expo.dev/versions/v57.0.0/). Resolve dependencies with SDK-compatible Expo commands; verify pnpm workspace/lockfile. Never introduce browser-only UI libraries to shared native code without a proven cross-platform acceptance path.
- **Design / Figma:** only use Figma tools when design files are actually connected and requested, following the tool's installed skill. Treat approved preview packages and the design contract as reference, not permission to regenerate finished designs.
- **Quality:** `node scripts/test-engineering-readiness.cjs` and `bash scripts/verify-ui-v08.sh` are local and CI gates. UI smoke checks need real Expo Web, native/RTL/theme and keyboard/screen-reader verification. The mocked integration tests are not Supabase authorization tests.

The three-developer conversation handoff is governed by `docs/developer-handoff-protocol.md`: complete roadmap in the first answer, then a **single first executable command**. Record discovered tool limitations honestly rather than inventing skill capabilities.
