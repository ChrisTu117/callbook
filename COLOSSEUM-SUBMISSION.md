# Colosseum Crypto World's Fair — portal draft

Paste the blocks below into the Colosseum portal. Do not paste the "Remaining steps" section.

This file is on the Colosseum branch. `main` stays the Monad Metropolis submission. Do not merge this branch before Monad's submission freeze.

Deadline: 12 Oct 2026, 11:59pm PT.

Rules used here: one project submission per team (rule 7). Track pools are separate: Ethereum L1 $25,000 across 5 products, Base $25,000 across 5, Arbitrum $25,000 across 5. The portal asks which chains the product integrates. List all three. If the form allows only one track, pick one and say the same contracts are wired for the other two.

## Product name

```text
Callbook
```

## Short description

```text
Sealed trade calls for AI agents, scored into ERC-8004, and copied through a MetaMask Agent Wallet plugin only inside a hard on-chain spend cap.
```

## Blockchains and tools integrated

```text
Blockchains: Base Sepolia (84532), Arbitrum Sepolia (421614), and Ethereum Sepolia (11155111). The same Callbook contracts deploy on each testnet. Ethereum L1 is the Sepolia testnet for this hackathon build, not mainnet.

Already on those chains, not redeployed by Callbook: ERC-8004 Identity 0x8004A818BFB912233c491871b3d84c89A494BD9e, Reputation 0x8004B663056A597Dffe9eCcC1965A193B7388713, Validation 0x8004Cb1BF31DAf7788923b405b754f57acEB4272. These are the standard CREATE2 testnet registries.

Callbook deploys, per chain: AttestedPriceSource, SignalBook, ScoreAnchor, and CopyDesk. Foundry script: contracts/script/Deploy.s.sol via deploy/deploy.sh (base-sepolia, arbitrum-sepolia, ethereum-sepolia).

Tools: Solidity 0.8.28 and Foundry, TypeScript and viem, a Next.js static dashboard, the MetaMask Agent Wallet plugin mm-plugin-callbook (board, inspect, follow, copy), and Coinbase Exchange public candles as the decision tape. Prices settle from a Coinbase print signed by the deployer (AttestedPriceSource), because Hermes now requires an API key.

Status on 8 Oct 2026: the three chains are configured and the contracts compile (11 Forge tests, 16 TypeScript tests). The ERC-8004 registries answer on all three RPCs. Callbook's own contracts are not broadcast yet. The throwaway deployer has no testnet ETH. Public faucets asked for a CAPTCHA or a login. Addresses will land in deployments/colosseum.json after funding. The Monad testnet book on main is a separate hackathon and is unchanged.
```

## Team

```text
Solo. GitHub: ChrisTu117. Product: Callbook.
The same person built the Monad Metropolis submission in this repository: sealed agent calls, ERC-8004 scoring, and the MetaMask Agent Wallet plugin. This Colosseum entry is that product pointed at Base, Arbitrum, and Ethereum Sepolia.
```

## Location

```text
Shenzhen, China
```

## GitHub

```text
Repository: https://github.com/ChrisTu117/callbook
Colosseum branch (do not review main for these three chains): https://github.com/ChrisTu117/callbook/tree/cursor/colosseum-port-f4dc
Draft pull request, do not merge: https://github.com/ChrisTu117/callbook/pull/1
```

`main` is the Monad testnet book. Judges who open only `main` will not see the Sepolia port.

## Go-to-market, demand validation, and distribution

```text
Callbook has no outside users yet. The Monad testnet book is the demand check for the same product: three demo agents, ten scored calls each, and one real follow escrow. That book stays on Monad. It is not this portal submission.

WHO FIRST
1. Builders of trading agents on Base, Arbitrum, and Ethereum who want a track record they cannot edit after the fact. Any ERC-8004 agent can post sealed calls. The agent page is a public résumé.
2. MetaMask Agent Wallet users who want to follow an agent without handing it an open-ended spend. The plugin escrows a cap on-chain. A copied loss cannot exceed that cap.

HOW WE REACH THEM
- Publish mm-plugin-callbook so Agent Wallet users can install board, inspect, follow, and copy.
- Invite hackathon and ecosystem agent teams on Base, Arbitrum, and Ethereum to post their first ten calls to the book.
- Talk to signal sellers whose calls are screenshots today. An agent page with commit, reveal, and score transactions is the record they can link.
- Post a weekly leaderboard with explorer links.

MILESTONES
- Broadcast the already-scripted deploy on all three testnets once the throwaway wallet is funded.
- Ten external agents posting calls, then the first followers through the plugin.
- Mainnet only after the testnet books have outside callers. Nothing here is deployed on Base, Arbitrum, or Ethereum mainnet.

BUSINESS MODEL
Nothing is charged now. Later: a small fee on copy settlement or on follow escrow, and paid analytics for agent builders. Posting calls and reading the book stay free.
```

## Logo

Placeholder. The repo has no logo that meets a typical 500 px minimum. Export a PNG, JPEG, or WebP before you submit. Do not block the Monad submission on this file.

## Demo video and pitch video

The product story matches the videos already on the Monad Pages site. Those files stay where they are. This branch does not replace them.

- Pitch, 1:30, product story: https://christu117.github.io/callbook/media/callbook-pitch.mp4
- Demo, 2:53, recorded on Monad testnet: https://christu117.github.io/callbook/media/callbook-demo.mp4

Use the pitch link if the portal accepts a story video that does not name the chain. The demo shows Monad testnet (chain 10143), the leaderboard, and the plugin. It does not show Base, Arbitrum, or Ethereum Sepolia.

Record a new demo after the Sepolia deploy if a judge must see those explorers. Script to adapt: docs/DEMO_SCRIPT.md. Swap the chain id and the explorer host. Do not upload that file over the Monad video on `main`.

## What a judge can run on this branch before the broadcast

```text
git clone https://github.com/ChrisTu117/callbook
git checkout cursor/colosseum-port-f4dc
npm ci
npm run build -w @callbook/core
npm run web
```

Open http://127.0.0.1:43127/ for the Monad testnet book (unchanged default).

Open http://127.0.0.1:43127/?track=colosseum&chain=84532 for Base Sepolia. Arbitrum is chain 421614. Ethereum Sepolia is chain 11155111. Until the broadcast, those three rows say "not deployed".

Tests: `forge test` and `npm run test:ts`.

## Remaining steps (do not paste into the portal)

The parent brief can send this list as-is.

1. Do not merge the Colosseum PR before Monad's submission freeze. The Pages site deploys from `main` only. The default dashboard chain is still Monad testnet 10143. Sepolia rows appear only with `?track=colosseum` or `NEXT_PUBLIC_COLOSSEUM=1`.
2. Fund the throwaway deployer `0xB45f5fc8c5733aC30C281BD21fDbC1E3BAAE344f` with testnet ETH. The private key is only in the agent environment `.env` (gitignored) and in the agent reply. It is not a mainnet key.
3. Faucets that answered without a browser login still required a CAPTCHA (pk910 Sepolia) or an account (Coinbase CDP, Alchemy, Chainlink). A human has to claim. One deploy is about 6.1 million gas. On 8 Oct 2026 that was under 0.0001 ETH on Base and Ethereum Sepolia, and about 0.0005 ETH on Arbitrum Sepolia. Send at least 0.002 ETH on each chain.
4. Base Sepolia drip: https://portal.cdp.coinbase.com/products/faucet or https://www.alchemy.com/faucets/base-sepolia or https://faucets.chain.link/base-sepolia
5. Arbitrum Sepolia drip: https://faucets.chain.link/arbitrum-sepolia or https://www.alchemy.com/faucets/arbitrum-sepolia
6. Ethereum Sepolia drip: https://sepolia-faucet.pk910.de/ or https://faucets.chain.link/sepolia
7. After the balance shows, from the repo root: `set -a && source .env && set +a`, then `bash deploy/deploy.sh base-sepolia`, `bash deploy/deploy.sh arbitrum-sepolia`, `bash deploy/deploy.sh ethereum-sepolia`, then `node deploy/record-colosseum.mjs`. Commit the updated `deployments/*.json`, `deployments/colosseum.json`, and `networks.json`. Paste the explorer links from `deployments/colosseum.json` into the portal.
8. Tracks: one submission per team. Enter Base, Arbitrum, and Ethereum L1 if the form allows more than one track. If it allows one track, choose the pool you want judged and mention the other two deploys in the text.
9. Upload a logo. Decide whether to reuse the Monad pitch video. Record a Sepolia demo if the portal demo must show these chains.
10. Live agent rounds (Ada, Blythe, Clerk) are a later step. They need three more funded keys in `AGENT_KEYS`, different from the deployer. The portal text is honest if you submit before those rounds exist.
