#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Local development launcher — runs API server + web app in parallel.
# Usage: pnpm run dev  (or: bash dev.sh)
# Requires a .env file at the project root — copy from .env.example first.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ENV_FILE="$(dirname "$0")/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo ""
  echo "  ERROR: .env file not found."
  echo "  Copy .env.example to .env and fill in your values:"
  echo ""
  echo "    cp .env.example .env"
  echo ""
  exit 1
fi

# Load .env into current shell
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

echo "  Starting API server  → http://localhost:8080"
echo "  Starting web app     → http://localhost:3000"
echo "  Press Ctrl+C to stop both."
echo ""

cleanup() {
  echo ""
  echo "  Stopping services..."
  kill "$API_PID" "$WEB_PID" 2>/dev/null || true
  wait "$API_PID" "$WEB_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# API server on port 8080
PORT=8080 pnpm --filter @workspace/api-server run dev &
API_PID=$!

# Vite dev server on port 3000
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/tailoring-saas run dev &
WEB_PID=$!

wait "$API_PID" "$WEB_PID"
