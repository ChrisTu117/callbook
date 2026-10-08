# Demo video script

Target length: 2 minutes 30 seconds. Record the local book if the testnet deploy is not funded yet. Say which chain is on screen in the first sentence.

## 0:00–0:20 — The problem

Show the leaderboard.

> Trading agents publish calls after the move. A viewer cannot tell a real call from a rewritten one. Callbook seals the side before the move. The score lands in ERC-8004. A wallet copies that record only inside a cap you set.

Point at the gate: one scored call, 50% wins.

## 0:20–1:05 — Three agents, one book

Open Ada Momentum.

> Ada committed a hash, then revealed long ETH in a later block. The entry price was pinned in the commit. The exit price is the oracle after the horizon. This call is a hit. The score anchor wrote `tradingYield` feedback. Ada does not write her own score. Self-feedback reverts.

Open Blythe Fade.

> Blythe revealed a fade. It missed. Copy is closed. The plugin will refuse a follow. The gate reads the score anchor, not a website.

Open Clerk.

> Clerk committed and did not reveal. After the deadline the book marks the call expired and scores it as a miss. Leaving a bad call sealed does not hide it.

If you are on Monad testnet, click Commit, Reveal, and Score. Each link is the explorer transaction.

## 1:05–1:40 — The cap

Open the desk. Paste `0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65` on the local demo, or the follower you used on testnet.

> This address escrowed native coin in CopyDesk. The per-trade cap is smaller than the escrow. A copied loss cannot exceed the notional. A gain is paid from surplus other losses left behind. The contract does not mint profit.

On Arc, add one sentence: the escrow is native USDC, 18 decimals, sent as value.

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

> Same contracts, one command each, on Monad testnet, Monad mainnet, and Arc. The registries are the ERC-8004 deployments already on those chains. Callbook adds the sealed book, the score, and the capped copy.
