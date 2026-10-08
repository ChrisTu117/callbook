# Arc is deploy-ready only

This submission does not fund Arc. The live book is Monad testnet.

`bash deploy/deploy.sh arc-mainnet` is ready if you fund a key later. Chain id `5042`. The script sets the gas price to 20 gwei. The price source on Arc is `AttestedPriceSource`, because Pyth `getPriceUnsafe` reverts there. CopyDesk escrows native USDC as `msg.value` (18 decimals). It does not read the 6-decimal token balance.

After that deploy, paste `signalBook`, `scoreAnchor`, and `copyDesk` into `networks.json` under chain `5042`.
