#!/usr/bin/env bash
# Deploy Callbook. One argument:
#   monad-testnet | monad-mainnet | arc-mainnet |
#   base-sepolia | arbitrum-sepolia | ethereum-sepolia | local
# Requires PRIVATE_KEY in the environment. Never prints the key.
# The three Sepolia targets are the Colosseum port. Use a throwaway key for them.
set -euo pipefail

TARGET="${1:-}"
if [[ -z "$TARGET" ]]; then
  echo "usage: deploy/deploy.sh <monad-testnet|monad-mainnet|arc-mainnet|base-sepolia|arbitrum-sepolia|ethereum-sepolia|local>" >&2
  exit 1
fi

if [[ -z "${PRIVATE_KEY:-}" ]]; then
  echo "Set PRIVATE_KEY. Do not commit it." >&2
  exit 1
fi

export PATH="${PATH}:/home/ubuntu/.foundry/bin:${HOME}/.foundry/bin"

RPC=""
EXTRA=()
case "$TARGET" in
  monad-testnet)
    RPC="https://testnet-rpc.monad.xyz"
    ;;
  monad-mainnet)
    RPC="https://rpc.monad.xyz"
    ;;
  arc-mainnet)
    # Arc drops a transaction whose maxFeePerGas is below 20 gwei. It does not revert.
    RPC="https://rpc.mainnet.arc.io"
    EXTRA+=(--with-gas-price 20000000000 --priority-gas-price 20000000000)
    ;;
  base-sepolia)
    RPC="https://sepolia.base.org"
    ;;
  arbitrum-sepolia)
    RPC="https://sepolia-rollup.arbitrum.io/rpc"
    ;;
  ethereum-sepolia)
    # rpc.sepolia.org returned HTML on 8 Oct 2026. publicnode answered JSON.
    RPC="https://ethereum-sepolia-rpc.publicnode.com"
    ;;
  local)
    RPC="${LOCAL_RPC:-http://127.0.0.1:8545}"
    ;;
  *)
    echo "unknown target: $TARGET" >&2
    exit 1
    ;;
esac

mkdir -p deployments
forge script contracts/script/Deploy.s.sol:Deploy \
  --rpc-url "$RPC" \
  --broadcast \
  --private-key "$PRIVATE_KEY" \
  "${EXTRA[@]}"

echo "Wrote deployments/<chainId>.json"
