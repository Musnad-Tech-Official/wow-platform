# WOW API verification integration — migration 003

This feature branch adds direct Supabase RPC functions and TanStack Query hooks for the business verification workflow, while keeping the existing authentication and provider architecture unchanged.

## APIs

- `getBusinessVerifications` / `useBusinessVerifications(businessId)`
- `submitBusinessVerification` / `useSubmitBusinessVerification()`
- `resubmitBusinessVerification` / `useResubmitBusinessVerification()`
- `listAdminBusinessVerifications` / `useAdminBusinessVerifications(filters)`
- `getAdminBusinessVerification` / `useAdminBusinessVerification(id)`
- `decideAdminBusinessVerification` / `useAdminDecideBusinessVerification()`

Input names match migration 003 SQL. Admin rights are checked in PostgreSQL, never inferred from installing Admin app. Do not expose admin responses to Customer UI.

## Foundation corrections

- `getBusinessBranches` reads `public.business_branches`, not the nonexistent `branches` table.
- `createBranch` requires `city` and `addressLine` matching deployed migration 002 RPC parameters; removes unsafe arbitrary parameter merging.

## Live verification

Runtime Clerk/Supabase role enforcement and deployed RPC permissions require live staging tests using `docs/database-test-runbook.md`. Local TypeScript and mocked tests alone are insufficient.
