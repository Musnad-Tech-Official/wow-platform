#!/usr/bin/env bash
# No paid hosted runner required. Run on a trusted developer machine.
set -Eeuo pipefail
cd "$(dirname "$0")/.."

mode=static
if (( $# > 0 )); then mode="$1"; fi
case "$mode" in
  static|web|native|all) ;;
  *) printf 'Usage: bash scripts/verify-local-quality.sh [static|web|native|all]\n' >&2; exit 2 ;;
esac

for tool in git node pnpm; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    printf 'Missing tool: %s (requires Git, Node 22 and pnpm 10.21.0)\n' "$tool" >&2
    exit 2
  fi
done
if [[ "$(node -p 'process.versions.node.split(".")[0]')" != 22 ]]; then
  printf 'Node.js 22 is required to match GitHub CI.\n' >&2
  exit 2
fi
if [[ "$(pnpm --version)" != 10.21.0 ]]; then
  printf 'pnpm 10.21.0 is required to match the primary CI gate.\n' >&2
  exit 2
fi
if [[ -n "$(git status --porcelain)" ]]; then
  printf 'Working tree must be clean: commit changes before recording verification.\n' >&2
  exit 2
fi

umask 077
sha="$(git rev-parse HEAD)"
mkdir -p "$HOME/wow-qa-reports"
report="$HOME/wow-qa-reports/$sha-$mode-$(date -u +%Y%m%dT%H%M%SZ).log"
temp_dir="$(mktemp -d)"
finish() {
  status=$?
  trap - EXIT
  if (( status == 0 )); then
    printf 'RESULT: PASS | SHA: %s | MODE: %s\n' "$sha" "$mode"
  else
    printf 'RESULT: FAIL (%s) | SHA: %s | MODE: %s\n' "$status" "$sha" "$mode"
  fi
  printf 'Local verification report: %s\n' "$report"
  rm -rf -- "$temp_dir"
  exit "$status"
}
trap finish EXIT
exec > >(tee -a "$report") 2>&1
export CI=true EXPO_NO_TELEMETRY=1
printf 'WOW local verification | UTC: %s | SHA: %s | mode: %s\n' "$(date -u +%FT%TZ)" "$sha" "$mode"

pnpm install --frozen-lockfile
node scripts/test-repository-integrity.cjs
node --check scripts/test-admin-browser-playwright.cjs
node --check scripts/test-customer-web-deeplinks-playwright.cjs
node --check scripts/test-merchant-live-auth-playwright.cjs
node --check scripts/test-stage4-offer-scope-staging.cjs
node scripts/test-design-foundation.cjs
bash scripts/verify-ui-v08.sh

if [[ "$mode" == web || "$mode" == all ]]; then
  # Use only publishable development credentials through ignored .env.local files.
  pnpm exec playwright install chromium

  # AUD-052: Web Customer was missing from the stage-end real SPA test gate.
  # Run both development and production-like exported builds with no test users.
  pnpm --filter customer exec expo export -p web --dev --output-dir "$temp_dir/customer-dev"
  WOW_CUSTOMER_WEB_EXPORT_DIR="$temp_dir/customer-dev" node scripts/test-customer-web-deeplinks-playwright.cjs
  pnpm --filter customer exec expo export -p web --output-dir "$temp_dir/customer-prod"
  WOW_CUSTOMER_WEB_EXPORT_DIR="$temp_dir/customer-prod" node scripts/test-customer-web-deeplinks-playwright.cjs

  pnpm --filter merchant exec expo export -p web --dev --output-dir "$temp_dir/merchant-dev"
  WOW_MERCHANT_WEB_EXPORT_DIR="$temp_dir/merchant-dev" node scripts/test-merchant-guest-playwright.cjs
  WOW_MERCHANT_WEB_EXPORT_DIR="$temp_dir/merchant-dev" node scripts/test-merchant-batch-02-playwright.cjs
  WOW_MERCHANT_WEB_EXPORT_DIR="$temp_dir/merchant-dev" node scripts/test-merchant-final-8-playwright.cjs

  pnpm --filter admin exec expo export -p web --dev --output-dir "$temp_dir/admin-dev"
  WOW_ADMIN_WEB_EXPORT_DIR="$temp_dir/admin-dev" node scripts/test-admin-browser-playwright.cjs
  WOW_ADMIN_CAPTURE_SKIP_EXPORT=1 WOW_ADMIN_CAPTURE_SKIP_ZIP=1 \
    WOW_ADMIN_CAPTURE_EXPORT_DIR="$temp_dir/admin-dev" \
    node scripts/capture-admin-batch01-screenshots.cjs

  pnpm --filter merchant exec expo export -p web --output-dir "$temp_dir/merchant-prod"
  WOW_MERCHANT_WEB_EXPORT_DIR="$temp_dir/merchant-prod" WOW_EXPECT_PRODUCTION_PREVIEW_DENIED=1 \
    node scripts/test-merchant-guest-playwright.cjs
  pnpm --filter admin exec expo export -p web --output-dir "$temp_dir/admin-prod"
  WOW_ADMIN_WEB_EXPORT_DIR="$temp_dir/admin-prod" WOW_EXPECT_PRODUCTION_PREVIEW_DENIED=1 \
    node scripts/test-admin-browser-playwright.cjs
fi

if [[ "$mode" == native || "$mode" == all ]]; then
  for app in customer merchant admin; do
    for platform in android ios; do
      pnpm --filter "$app" exec expo export --platform "$platform" \
        --output-dir "$temp_dir/$app-$platform"
    done
  done
fi

printf 'This report covers only the selected automated checks. Real authenticated Storage,\n'
printf 'device accessibility and production release acceptance remain separate gates.\n'
