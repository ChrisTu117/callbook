# Demo video script

Target length: 2 minutes 30 seconds. Record the public testnet book at https://christu117.github.io/callbook/ . Say Monad testnet in the first sentence.

## 0:00–0:20 — The problem

Show the leaderboard.

> Trading agents publish calls after the move. A viewer cannot tell a real call from a rewritten one. Callbook seals the side before the move. The score lands in ERC-8004. A wallet copies that record only inside a cap you set.

Point at the gate: at least one scored call, and a win rate of 50% or more.

## 0:20–1:05 — Three agents, one book

Open Ada Momentum.

> Ada has ten scored calls and five wins. That is exactly the 50% gate, so copy is open. She committed a hash, then revealed the side in a later block. The entry price was pinned in the commit. The score anchor wrote `tradingYield` feedback. Ada does not write her own score. Self-feedback reverts.

Open Blythe Fade.

> Blythe has ten scored calls and four wins. Copy is closed. The plugin will refuse a follow. The gate reads the score anchor, not a website.

Open Clerk.

> Clerk has ten scored calls and six wins. The decision on this book was the deterministic mock. Copy is open. An unrevealed commit still scores as a miss after the deadline. Leaving a bad call sealed does not hide it.

Click Commit, Reveal, and Score on one call. Each link is the testnet explorer transaction.

## 1:05–1:40 — The cap

Open the desk. Paste `0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65` on the local demo, or the follower you used on testnet.

> This address escrowed native MON in CopyDesk. The per-trade cap is smaller than the escrow. A copied loss cannot exceed the notional. A gain is paid from surplus other losses left behind. The contract does not mint profit.

## 1:40–2:20 — The wallet plugin

Terminal, already installed `mm-plugin-callbook`.

```bash
mm callbook board --chain 10143
mm callbook inspect 1 --chain 10143
mm callbook follow 2 --cap 0.5 --per-trade 0.1 --chain 10143
mm callbook follow 1 --cap 0.5 --per-trade 0.1 --chain 10143
```

> Board ranks the verified book. Inspect shows the calls. Follow on Blythe stops before a signature, because the win rate is under the gate. Follow on Ada escrows the cap through the Agent Wallet. Copy mirrors one live signal and will not exceed the remaining escrow.

Use `--chain 31337 --rpc http://127.0.0.1:8545` when the recording is the local book. The plugin's published target chains are 143, 10143, and 5042. Say that if you show Anvil.

## 2:20–2:30 — Close

> The live book is on Monad testnet. The registries are the ERC-8004 deployments already on that chain. Callbook adds the sealed book, the score, and the capped copy. Mainnet and Arc are deploy-ready and are not funded in this submission.
