# Monad portal submission

These are the fields of the Metropolis portal form (https://hackathon.monad.xyz/, Project → Submission). The labels and limits come from the portal's form validation. The live deployment is Monad testnet. Monad mainnet and Arc are deploy-ready and not funded.

Text is counted after NFKC normalization. Links must be `https://` with a path. The deadline is 2026-10-14 03:59 UTC.

## Primary track (required)

Trust, Identity & AI Infrastructure

## Project name (required, 120 max)

Callbook

## One-line description (required, 200 max)

```text
Sealed trade calls for AI agents, scored into ERC-8004 on Monad, and copied through a MetaMask Agent Wallet plugin only inside a hard on-chain spend cap.
```

## Description (required, 8,000 max)

```text
Callbook is a public book of trade calls that an AI agent cannot edit after the fact. A MetaMask Agent Wallet plugin then lets a user follow an agent only when its on-chain record clears a gate, and only inside a hard spend cap.

THE PROBLEM
Trading agents and signal sellers publish their calls after the move. Screenshots and backtests can be curated or rewritten, so nobody can tell a real call from a cherry-picked one. Copy-trading tools then hand a bot open-ended spending power on top of that unverifiable record.

HOW IT WORKS (live on Monad testnet, chain 10143)
1. Identity: each agent registers on the ERC-8004 Identity Registry that is already deployed on Monad testnet.
2. Commit: the agent sends SignalBook a hash of asset, side, confidence and a salt. The entry price is pinned in that same transaction.
3. Reveal: a later block reveals the call. A commit that is never revealed expires and is scored as a miss, so quietly skipping a bad call still counts against the agent.
4. Score: after the horizon, the exit price is pinned and a separate ScoreAnchor writes the result to the ERC-8004 Reputation Registry as tradingYield feedback (PnL in basis points), plus a 0-100 win rate as a Validation response. The agent cannot score itself.
5. Copy: CopyDesk lets a follower escrow native MON behind an agent that clears the on-chain gate (at least 1 scored call and a 50% win rate). The escrow is the spend cap. A copied loss can never exceed its notional, and a gain is paid only from surplus that other losses left behind. The contract never mints profit.

WHAT YOU CAN CHECK TODAY
- Public book: https://christu117.github.io/callbook/ . A static site that reads Monad testnet straight from the browser, with no Callbook server. Leaderboard, one page per agent, and every call links its commit, reveal and score transactions on testnet.monadscan.com.
- Three demo agents with ten scored calls each: Ada Momentum (ERC-8004 agent 2074, 5/10, copy open), Blythe Fade (2075, 4/10, copy closed by the gate), Clerk (2076, 6/10, copy open). That is 30 tradingYield feedback entries on the Reputation Registry.
- A real follow on the desk: 0.05 testnet MON escrowed behind Ada with a 0.02 MON per-trade cap.
- MetaMask Agent Wallet plugin (mm-plugin-callbook): mm callbook board, inspect, follow and copy. Tested on Agent Wallet CLI 6.2.1 and 7.0.0, installed from a packed tarball outside the repo.

HONEST SCOPE
- Monad testnet only. Monad mainnet and Arc use the same deploy script and are deploy-ready, but they are not funded or deployed in this submission.
- Clerk's calls on this book came from a deterministic mock decision function, not a live language model. Clerk calls an OpenAI-compatible model only when an API key is configured, and none was used for the posted rounds.
- Prices: the stored Pyth ETH/USD update on Monad testnet was about 15 hours stale and Hermes now requires an API key, so this testnet book settles on a Coinbase print signed by the deployer (AttestedPriceSource). The contracts also ship a Pyth price source for a fresh-feed deploy.
- ERC-7715 delegations are not wired. The spend cap is enforced by the CopyDesk escrow.
- follow and copy sign through the Agent Wallet and need mm login. The demo video dry-runs the exact follow transaction with eth_call instead of broadcasting.

BUILT WITH
Solidity and Foundry (11 tests), TypeScript and viem (15 tests), a Next.js static export on GitHub Pages, the MetaMask Agent Wallet plugin interface (oclif, bundled with esbuild), the ERC-8004 Identity, Reputation and Validation registries on Monad testnet, and Coinbase public candles as the decision tape.

CONTRACTS (Monad testnet 10143)
SignalBook 0x5Fcbf755e090D662DF1E673656Be97B4dA193010
ScoreAnchor 0xC9C45a32B4FEC8E0Ad7c3864051409D8330a71dd
CopyDesk 0xBAAFB4710f8B47Cf831FCdC1dF2b3135C9aCbA2e
Attested price source 0x3925D866ACeFAFD00987816f1191973EA761627c
ERC-8004 Identity (existing) 0x8004A818BFB912233c491871b3d84c89A494BD9e
ERC-8004 Reputation (existing) 0x8004B663056A597Dffe9eCcC1965A193B7388713
ERC-8004 Validation (existing) 0x8004Cb1BF31DAf7788923b405b754f57acEB4272
```

## Go-to-market strategy (required, 8,000 max)

```text
Callbook has no outside users yet. This is the plan for the first ones.

WHO FIRST
1. Builders of trading agents who want a track record that cannot be faked. Any ERC-8004 agent can post sealed calls to the book without permission, and its agent page becomes a public, verifiable résumé it can link from X, Discord or an agent directory.
2. MetaMask Agent Wallet users who want to follow an agent without handing it open-ended spending power. The plugin puts board, inspect, follow and copy inside the wallet they already run, and the escrow caps the downside.

HOW WE REACH THEM
- MetaMask Agent Wallet plugin ecosystem: publish mm-plugin-callbook to npm so it installs from the registry once plugins leave beta, and submit it to whatever plugin listing MetaMask provides.
- Monad agent teams: the ERC-8004 registries are already live on Monad, so we invite agent projects building there, starting with hackathon teams, to post their first ten calls.
- Signal communities: Telegram and Discord signal sellers whose calls are screenshots today. A Callbook agent page is a credible way to show a record, and the gate is a public bar to clear.
- Content: a weekly leaderboard post on X with links to the sealed calls and their explorer transactions.

MILESTONES
- Mainnet: deploy the same contracts on Monad mainnet with a fresh Pyth feed (about 2 MON of gas) and keep testnet for trials.
- Ten external agents posting calls, and the first followers through the plugin.
- ERC-7715 delegation as an alternative to escrow, and more assets beyond ETH-USD.

BUSINESS MODEL (later, nothing is charged today)
A small fee on copy settlement or on follow escrow, and paid analytics for agent builders. Posting calls and reading the book stay free, because the value of the book is that anyone can check it.
```

## Project logo (required)

PNG, JPEG, or WebP. 2 MB max, at least 500 px on the short edge, 4 MP max, not animated.

## Links

- GitHub repository (required): https://github.com/ChrisTu117/callbook
- Live product (required): https://christu117.github.io/callbook/
- Technical demo video (required): https://christu117.github.io/callbook/media/callbook-demo.mp4 (2:53, recording of [DEMO_SCRIPT.md](DEMO_SCRIPT.md))
- Pitch video (required): https://christu117.github.io/callbook/media/callbook-pitch.mp4 (1:30)
- Product advertisement and X profile: optional

## Bounty: MetaMask, Best Agent Wallet Plugin

```text
mm-plugin-callbook gives the MetaMask Agent Wallet a new trading capability: copy an AI trading agent only when its sealed, on-chain track record clears a win-rate gate, and only inside a hard spend cap that the wallet escrows on-chain.

Commands:
- mm callbook board (wallet-read): rank ERC-8004 agents by verified win rate and cumulative yield, and show whether the gate lets you copy each one.
- mm callbook inspect <agentId> (wallet-read): one agent's sealed calls, scores, feedback count, and commit, reveal and score transaction links.
- mm callbook follow <agentId> --cap 0.05 --per-trade 0.02 (wallet-read, wallet-submit): refuses when the on-chain gate is closed. Otherwise it escrows the cap in CopyDesk and sets a per-trade cap.
- mm callbook copy <signalId> --notional 0.02 --account 0x... (wallet-read, wallet-submit): mirror one live revealed call inside the remaining escrow. A copied loss can never exceed its notional.

The package follows the plugin template: an mm block with schemaVersion 1, minCliVersion >=6.2.0, per-command capabilities and target chains (Monad testnet 10143 live; Monad 143 and Arc 5042 declared, not deployed), @metamask/agent-wallet as a peer dependency, and a shipped oclif manifest. @callbook/core and the Monad testnet deployment are bundled with esbuild, so it installs and runs outside the repo. Tested on Agent Wallet CLI 6.2.1 and 7.0.0.

Install (plugins are beta):
mm config set experimentalPlugins true
mm config set experimentalAllowUnverifiedInstalls true
mm plugins install file:/tmp/mm-plugin-callbook-0.2.0.tgz --accept-permissions
mm callbook board
mm callbook inspect 2074
(Build the tarball with: npm ci, npm run build -w @callbook/core, then npm pack in packages/plugin.)

Code: https://github.com/ChrisTu117/callbook/tree/main/packages/plugin
Scope: Monad testnet only. follow and copy need mm login. In the demo video the follow transaction is dry-run with eth_call, and a real follow (0.05 MON escrow behind Ada) is on the testnet desk.
```

## Access instructions (optional, 8,000 max)

```text
No account or login is needed to check the book.

1. Open https://christu117.github.io/callbook/ . It reads Monad testnet (chain 10143) directly from your browser. Agent pages: /callbook/agent/?id=2074 (Ada Momentum), 2075 (Blythe Fade), 2076 (Clerk). Every call has Commit, Reveal and Score links to testnet.monadscan.com. The copy desk is /callbook/desk/ (try 0x749B414A7A31Ba0484d77e3A8a3A6aF347AA609a, which follows Ada).

2. MetaMask Agent Wallet plugin (Node 22+, @metamask/agent-wallet 6.2.1 or 7.0.0):
git clone https://github.com/ChrisTu117/callbook && cd callbook
npm ci
npm run build -w @callbook/core
cd packages/plugin && npm pack --pack-destination /tmp
cd /tmp
mm config set experimentalPlugins true
mm config set experimentalAllowUnverifiedInstalls true
mm plugins install file:/tmp/mm-plugin-callbook-0.2.0.tgz --accept-permissions
mm callbook board
mm callbook inspect 2074
The Monad testnet deployment and event snapshot are bundled, so these commands run from any folder. Plugins are beta in the Agent Wallet, which is why the two experimental flags are needed. Install the packed tarball rather than mm plugins link, because linked plugins do not receive capability grants.

3. follow and copy sign through the Agent Wallet, so they need mm login and testnet MON (https://faucet.monad.xyz):
mm callbook follow 2074 --cap 0.05 --per-trade 0.02
mm callbook copy <signalId> --notional 0.02 --account 0x...
Following Blythe (2075) reverts with Gate() because her win rate is 40%.

4. Tests: forge test (11) and npm run test:ts (15) from the repo root.

Everything is on Monad testnet. Monad mainnet and Arc are deploy-ready but not deployed.
```

## Monad testnet addresses and agents

| Contract | Address |
| --- | --- |
| SignalBook | `0x5Fcbf755e090D662DF1E673656Be97B4dA193010` |
| ScoreAnchor | `0xC9C45a32B4FEC8E0Ad7c3864051409D8330a71dd` |
| CopyDesk | `0xBAAFB4710f8B47Cf831FCdC1dF2b3135C9aCbA2e` |
| Attested price source | `0x3925D866ACeFAFD00987816f1191973EA761627c` |
| ERC-8004 Identity (existing) | `0x8004A818BFB912233c491871b3d84c89A494BD9e` |
| ERC-8004 Reputation (existing) | `0x8004B663056A597Dffe9eCcC1965A193B7388713` |
| ERC-8004 Validation (existing) | `0x8004Cb1BF31DAf7788923b405b754f57acEB4272` |

Demo agents, ten scored calls each: Ada Momentum 2074 (5 wins, -13 bps, copy open), Blythe Fade 2075 (4 wins, -15 bps, copy closed), Clerk 2076 (6 wins, +15 bps, copy open, mock decision).
