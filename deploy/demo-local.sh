#!/usr/bin/env bash
# Start a local book with three scripted agents. Anvil must already be listening.
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="${PATH}:${HOME}/.foundry/bin"
export PRIVATE_KEY="${PRIVATE_KEY:-0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80}"
export REVEAL_WINDOW="${REVEAL_WINDOW:-30}"
export PIN_WINDOW="${PIN_WINDOW:-3600}"
export MAX_STALENESS="${MAX_STALENESS:-3600}"
export MIN_SAMPLES="${MIN_SAMPLES:-1}"
export MIN_WIN_BPS="${MIN_WIN_BPS:-5000}"
export CALLBOOK_CHAIN_ID=31337
export CALLBOOK_RPC_URL="${CALLBOOK_RPC_URL:-http://127.0.0.1:8545}"
export LOCAL_RPC="$CALLBOOK_RPC_URL"

if ! cast chain-id --rpc-url "$CALLBOOK_RPC_URL" >/dev/null 2>&1; then
  echo "No chain at $CALLBOOK_RPC_URL. Start anvil first." >&2
  exit 1
fi

bash deploy/deploy.sh local
npm run demo
