#!/usr/bin/env bash
# Browser-test __DEV__ Merchant screens against the real Expo/Metro development server.
# Exported --dev assets are not a substitute for Metro's module and HMR endpoints.
set -Eeuo pipefail
cd "$(dirname "$0")/.."

port="${WOW_MERCHANT_DEV_PORT:-19006}"
if [[ ! "$port" =~ ^[0-9]+$ ]] || (( port < 1024 || port > 65535 )); then
  printf 'Invalid WOW_MERCHANT_DEV_PORT: %s\n' "$port" >&2
  exit 2
fi
for tool in pnpm node curl; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    printf 'Missing prerequisite: %s\n' "$tool" >&2
    exit 2
  fi
done

umask 077
log_file="$(mktemp "${TMPDIR:-/tmp}/wow-merchant-metro-XXXXXX.log")"
server_pid=""
cleanup() {
  status=$?
  trap - EXIT
  if [[ -n "$server_pid" ]]; then
    kill "$server_pid" 2>/dev/null || true
    wait "$server_pid" 2>/dev/null || true
  fi
  if (( status != 0 )); then
    printf '\nMerchant Metro log (last 100 lines):\n' >&2
    tail -n 100 "$log_file" >&2 || true
  fi
  rm -f -- "$log_file"
  exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

url="http://127.0.0.1:$port"
printf 'Starting Merchant Expo development server on %s\n' "$url"
CI=true EXPO_NO_TELEMETRY=1 pnpm --filter merchant exec expo start --web --localhost --port "$port" > "$log_file" 2>&1 &
server_pid=$!

ready=0
for ((attempt=1; attempt<=90; attempt++)); do
  if ! kill -0 "$server_pid" 2>/dev/null; then
    printf 'Expo development server exited before becoming ready.\n' >&2
    break
  fi
  if curl --silent --show-error --fail --max-time 3 --output /dev/null "$url/" 2>/dev/null; then
    ready=1
    break
  fi
  sleep 2
done
if (( ready != 1 )); then
  printf 'Expo development server did not become ready.\n' >&2
  exit 1
fi

# Fail fast on a blank app rather than waiting through thirteen equivalent timeouts.
printf 'Checking MER-BOOTSTRAP against live Metro and HMR...\n'
WOW_MERCHANT_WEB_URL="$url" WOW_MERCHANT_BOOTSTRAP_TIMEOUT_MS=60000 \
  node --test --test-name-pattern=MER-BOOTSTRAP scripts/test-merchant-guest-playwright.cjs

printf 'Running Merchant real-guest and development-preview tests...\n'
WOW_MERCHANT_WEB_URL="$url" node scripts/test-merchant-guest-playwright.cjs
WOW_MERCHANT_WEB_URL="$url" node scripts/test-merchant-batch-02-playwright.cjs
WOW_MERCHANT_WEB_URL="$url" node scripts/test-merchant-final-8-playwright.cjs
