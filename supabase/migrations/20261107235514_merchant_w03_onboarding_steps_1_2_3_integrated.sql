-- Migration: 20261107235514_merchant_w03_onboarding_steps_1_2_3_integrated.sql
-- Purpose: Reconciliation marker for cloud-applied integrated onboarding batch.
--
-- RATIONALE & REPRODUCIBILITY:
-- This migration version exists in the deployed Supabase project (jfqmdnffqwkqevdhmtfi)
-- migration history representing the applied integrated Steps 1-3 batch.
-- In repository source control, all underlying schema changes, functions, triggers, and
-- security boundaries are already defined by the three individual additive W03 migrations:
--   1. 20261103000000_merchant_requested_category.sql (Step 1 - MER-02-01)
--   2. 20261104000000_merchant_representative_draft.sql (Step 2 - MER-02-02)
--   3. 20261105000000_merchant_delete_draft_branch.sql (Step 3 - MER-02-03)
--
-- To prevent DDL collisions, duplicate index errors, or replaying temporary seed data
-- during fresh database setups, this migration acts as an idempotent no-op marker.

DO $$
BEGIN
  -- No-op: all schema elements are established by migrations 20261103000000-20261105000000.
  NULL;
END $$;
