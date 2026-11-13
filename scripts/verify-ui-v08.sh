#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
echo '== WOW V0.5 / V0.6 / V0.7 / V0.8 =='
node scripts/test-ui-v05.cjs
node scripts/test-ui-v06.cjs
node scripts/test-ui-v07.cjs
node scripts/test-ui-v08.cjs
node scripts/test-merchant-batch-01.cjs
node --experimental-strip-types scripts/test-admin-batch-01.cjs
node --experimental-strip-types scripts/test-admin-batch-02.cjs
node --experimental-strip-types scripts/test-merchant-access-boundary.cjs
echo '== Workspace type, lint, API and integration checks =='
pnpm --filter @wow/ui exec tsc --noEmit
pnpm typecheck
pnpm lint
pnpm test:query
pnpm test:integration
node scripts/test-customer-auth-completion.cjs
node scripts/test-customer-offer-ratings.cjs
printf '\nStatic tests passed. Web/native visual, keyboard, screen-reader, and physical-device acceptance are separate gates.\n'
