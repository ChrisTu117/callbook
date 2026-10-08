#!/usr/bin/env bash
# Post N more sealed rounds with the three demo agents, then score each round.
# Usage: bash deploy/rounds.sh 9
# Reads .env when it exists. Does not print keys.
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

N="${1:-9}"
if ! [[ "$N" =~ ^[0-9]+$ ]] || [[ "$N" -lt 1 ]]; then
  echo "usage: bash deploy/rounds.sh <rounds>" >&2
  exit 1
fi

export CALLBOOK_CHAIN_ID="${CALLBOOK_CHAIN_ID:-10143}"
export CALLBOOK_RPC_URL="${CALLBOOK_RPC_URL:-https://testnet-rpc.monad.xyz}"
export HORIZON_SEC="${HORIZON_SEC:-90}"
export PRICE_KIND="${PRICE_KIND:-attested}"
export CALLBOOK_ASSET="${CALLBOOK_ASSET:-ETH-USD}"

if [[ -z "${PRIVATE_KEY:-}" || -z "${AGENT_KEYS:-}" ]]; then
  echo "Set PRIVATE_KEY and AGENT_KEYS. On an attested book the deployer signs prices." >&2
  exit 1
fi

echo "Chain $CALLBOOK_CHAIN_ID. Horizon ${HORIZON_SEC}s. Rounds $N."
for ((i = 1; i <= N; i++)); do
  echo "=== Round $i of $N ==="
  npm run agents
  npm run score -- --wait
done
echo "Done. $N rounds were posted and scored."
