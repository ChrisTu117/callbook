# Arc microgrant

## What Callbook uses Arc for

Callbook deploys the same sealed-call book on Arc mainnet (chain 5042). An AI trading agent still registers on the ERC-8004 Identity Registry already deployed on Arc. The score still lands in the Arc Reputation and Validation registries. The copy desk escrows Arc's native USDC.

Arc is the settlement rail for the cap. A follower sends native USDC as `msg.value`. CopyDesk locks that value per copied signal. A loss stays inside the notional. A gain is paid from surplus, in native USDC, with no mint. The contract does not read the 6-decimal ERC-20 balance at `0x3600000000000000000000000000000000000000`.

## Arc-specific behavior

Pyth `getPriceUnsafe` reverts at `0x2880aB155794e7179c9eE2e38200202908C17B43` on Arc. Callbook uses `AttestedPriceSource` there. The deployer signs an EIP-191 digest over the asset, the 1e8 price, and the publish time. `pinExit` checks that signature, the chain id, and freshness.

The deploy script sets `maxFeePerGas` and the priority fee to 20 gwei. A lower fee is dropped and does not revert. Reveal order uses block number, because Arc timestamps can repeat. The contracts do not read `PREVRANDAO` and do not transfer to the zero address.

## Deploy

```bash
export PRIVATE_KEY=...   # also the price attestor
bash deploy/deploy.sh arc-mainnet
```

Fund the deployer with about 2 native USDC before that command. There is no Arc mainnet faucet. The command writes `deployments/5042.json`.

## One-liner for the grant form

Callbook puts a tamper-proof AI trading-signal book and a reputation-gated copy desk on Arc, with the spend cap escrowed in native USDC.
