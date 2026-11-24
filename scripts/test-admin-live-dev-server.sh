#!/usr/bin/env bash
# Validate __DEV__ Admin previews on a real Expo/Metro web server.
# A static --dev export can omit Metro module IDs used by dynamic routes.
set -Eeuo pipefail
cd "$(dirname "$0")/.."

port="${WOW_ADMIN_DEV_PORT:-19007}"
if [[ ! "$port" =~ ^[0-9]+$ ]] || (( port < 1024 || port > 65535 )); then
  printf 'Invalid WOW_ADMIN_DEV_PORT: %s\n' "$port" >&2
  exit 2
fi
for tool in pnpm node curl; do
  command -v "$tool" >/dev/null 2>&1 || { printf 'Missing tool: %s\n' "$tool" >&2; exit 2; }
done

umask 077
log_file="$(mktemp "${TMPDIR:-/tmp}/wow-admin-metro-XXXXXX.log")"
server_pid=""
cleanup() {
  code=$?
  trap - EXIT
  if [[ -n "$server_pid" ]]; then
    kill "$server_pid" 2>/dev/null || true
    wait "$server_pid" 2>/dev/null || true
  fi
  if (( code != 0 )); then
    printf '\nAdmin Metro log (last 100 lines):\n' >&2
    tail -n 100 "$log_file" >&2 || true
  fi
  rm -f -- "$log_file"
  exit "$code"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

url="http://127.0.0.1:$port"
printf 'Starting Admin Expo/Metro development server on %s\n' "$url"
CI=true EXPO_NO_TELEMETRY=1 pnpm --filter admin exec expo start --web --localhost --port "$port" > "$log_file" 2>&1 &
server_pid=$!

ready=0
for ((attempt=1; attempt<=90; attempt++)); do
  if ! kill -0 "$server_pid" 2>/dev/null; then
    printf 'Admin Metro server exited before readiness.\n' >&2
    break
  fi
  if curl --silent --show-error --fail --max-time 3 --output /dev/null "$url/" 2>/dev/null; then
    ready=1
    break
  fi
  sleep 2
done
if (( ready != 1 )); then
  printf 'Admin Metro server did not become ready.\n' >&2
  exit 1
fi

# Real screens, authorization denial, RTL, theme persistence and screenshots.
WOW_ADMIN_WEB_URL="$url" node scripts/test-admin-browser-playwright.cjs
WOW_ADMIN_CAPTURE_WEB_URL="$url" WOW_ADMIN_CAPTURE_SKIP_EXPORT=1 WOW_ADMIN_CAPTURE_SKIP_ZIP=1 \
  node scripts/capture-admin-batch01-screenshots.cjs
