# W00 — Read-only production-readiness inventory (2026-11-15)

## Environment and boundaries

Connected pre-launch primary Supabase project: `wow-platform` (`jfqmdnffqwkqevdhmtfi`). Inventory query used catalog SELECTs only; **no application data or permissions were modified**. This is supplementary inventory and **NOT** the required unmodified `010_verify.sql` seven-block audit.

## Verified database metadata

| Item | Observed |
| --- | ---: |
| Application tables in `public` / `wow_private` | 35 |
| Application tables with RLS enabled | 35 |
| Application tables without RLS | 0 |
| WOW Storage buckets | 5 |
| WOW buckets marked private | 5 |
| `SECURITY DEFINER` functions in application schemas | 112 |
| `SECURITY DEFINER` functions executable by `anon` | 6 |
| `SECURITY DEFINER` functions executable by `authenticated` | 93 |
| PERMISSIVE offer-table policies | 6 |
| Explicit `subscription_payments_proof_disabled_ck` constraint | Present |
| Recorded Supabase migration versions | 20 |

**Interpretation:** RLS flags and private bucket settings are necessary but not sufficient. The 6 anonymous-executable and 93 authenticated-executable `SECURITY DEFINER` functions require policy-by-policy/function-by-function classification. Some functions intentionally expose limited, safe RPCs; counts alone do **not** imply that all are vulnerabilities. Likewise, 6 permissive offer policies require assessment for unintended OR-composition; do not blindly delete them.

## W06 findings and response

- Original `wow_private.can_read_wow_object` permitted any authenticated subject to access private staged business media if they knew a Storage key.
- Remediated under recorded migration `20261114223935_w06_private_business_media_read_role_guard`, with five-role PostgreSQL regression passing after deployment and no test data remaining.
- W06 billing and profile revision decision SQL reviews also passed for authorization, state transition and audit writes within rolled-back synthetic transactions.

## W00 still open

1. Locate and execute the *original, unchanged* `010_verify.sql` with all seven result sections and nine required assertions; this inventory does not stand in for it.
2. Review every offer SELECT policy and effective table grant for guest/authenticated role leakage, plus relevant `SECURITY DEFINER` function definitions/grants/search paths.
3. Run a complete multi-role test matrix including cross-business merchant scope, private Storage real HTTP signed files, revoked staff and reviewer affiliations.
4. Obtain a new complete database backup after recent migrations and perform an isolated restoration rehearsal. The owner's previous archive passed reading but was not restored in a second environment.
5. Review latest Supabase security advisors against intended public RPC contracts, and test real mobile release builds.

**Release gate: NOT CLEARED.** Do not interpret passing CI or this inventory as production certification.
