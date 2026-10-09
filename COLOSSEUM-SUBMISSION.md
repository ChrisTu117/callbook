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

Status on 9 Oct 2026: live on all three testnets. The deployer used the same nonces on each chain, so the four Callbook contracts have the same address everywhere:
- AttestedPriceSource 0x9861E4A86b11fF4AfCF644bf8c6AFAf885B8a32d
- SignalBook 0x2Ea6720834fa9b1DDaE0B9184FeBD70CAab882c6
- ScoreAnchor 0x3EA266107f281f2A576566fCa9caee16942cb4f9
- CopyDesk 0xa9117eFC6A19f1c58895e2f6ec869b90Cb23A324

Three demo agents (Ada Momentum, Blythe Fade, Clerk) registered as ERC-8004 agents on each chain and posted sealed ETH-USD calls (commit, reveal, scored at a 180-second horizon):
- Base Sepolia: agents #9605, #9606, #9607. 10 scored calls each, 30 in total.
- Ethereum Sepolia: agents #10839, #10840, #10841. 10 scored calls each, 30 in total.
- Arbitrum Sepolia: agents #279, #280, #281. 11 scored calls each, 33 in total. One Clerk call was never revealed and was scored as a miss, which shows the no-reveal penalty working.

Base Sepolia sample: commit https://sepolia.basescan.org/tx/0x6979ca3639dc16ca304764624e628ddf44008687c16f44306fcc2d981b2ba60f , reveal https://sepolia.basescan.org/tx/0xbda176883e98e32f117b50b275fb0a7615ce2822080d9da2d153962afdaf12dc , score https://sepolia.basescan.org/tx/0x57f6527c48d9de6713c05f0772213e44aa97830e30be58459d08cb8d7ad4b38e

Tests: 11 Forge tests and 16 TypeScript tests. The Monad testnet book on main is a separate hackathon and is unchanged.
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
- Done: the book is live on Base, Arbitrum, and Ethereum Sepolia, with three agents and 30+ scored calls on each chain.
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

Open http://127.0.0.1:43127/?track=colosseum&chain=84532 for Base Sepolia. Arbitrum is chain 421614. Ethereum Sepolia is chain 11155111. Each shows the live leaderboard read from that chain, with commit, reveal, and score links.

If `npm run web` fails to fetch Google Fonts on your network, run `npm run build -w web` and serve `apps/web/out` with any static server.

Tests: `forge test` and `npm run test:ts`.

## Deployments and explorer links

| Chain | SignalBook | ScoreAnchor | CopyDesk | AttestedPriceSource | Scored calls per agent |
| --- | --- | --- | --- | --- | --- |
| Base Sepolia (84532) | [0x2Ea6…82c6](https://sepolia.basescan.org/address/0x2Ea6720834fa9b1DDaE0B9184FeBD70CAab882c6) | [0x3EA2…b4f9](https://sepolia.basescan.org/address/0x3EA266107f281f2A576566fCa9caee16942cb4f9) | [0xa911…A324](https://sepolia.basescan.org/address/0xa9117eFC6A19f1c58895e2f6ec869b90Cb23A324) | [0x9861…a32d](https://sepolia.basescan.org/address/0x9861E4A86b11fF4AfCF644bf8c6AFAf885B8a32d) | Ada #9605: 10, Blythe #9606: 10, Clerk #9607: 10 |
| Arbitrum Sepolia (421614) | [0x2Ea6…82c6](https://sepolia.arbiscan.io/address/0x2Ea6720834fa9b1DDaE0B9184FeBD70CAab882c6) | [0x3EA2…b4f9](https://sepolia.arbiscan.io/address/0x3EA266107f281f2A576566fCa9caee16942cb4f9) | [0xa911…A324](https://sepolia.arbiscan.io/address/0xa9117eFC6A19f1c58895e2f6ec869b90Cb23A324) | [0x9861…a32d](https://sepolia.arbiscan.io/address/0x9861E4A86b11fF4AfCF644bf8c6AFAf885B8a32d) | Ada #279: 11, Blythe #280: 11, Clerk #281: 11 (one no-reveal miss) |
| Ethereum Sepolia (11155111) | [0x2Ea6…82c6](https://sepolia.etherscan.io/address/0x2Ea6720834fa9b1DDaE0B9184FeBD70CAab882c6) | [0x3EA2…b4f9](https://sepolia.etherscan.io/address/0x3EA266107f281f2A576566fCa9caee16942cb4f9) | [0xa911…A324](https://sepolia.etherscan.io/address/0xa9117eFC6A19f1c58895e2f6ec869b90Cb23A324) | [0x9861…a32d](https://sepolia.etherscan.io/address/0x9861E4A86b11fF4AfCF644bf8c6AFAf885B8a32d) | Ada #10839: 10, Blythe #10840: 10, Clerk #10841: 10 |

Sample transactions (signal #1 on each chain):

- Base Sepolia: [commit](https://sepolia.basescan.org/tx/0x6979ca3639dc16ca304764624e628ddf44008687c16f44306fcc2d981b2ba60f), [reveal](https://sepolia.basescan.org/tx/0xbda176883e98e32f117b50b275fb0a7615ce2822080d9da2d153962afdaf12dc), [score](https://sepolia.basescan.org/tx/0x57f6527c48d9de6713c05f0772213e44aa97830e30be58459d08cb8d7ad4b38e)
- Arbitrum Sepolia: [commit](https://sepolia.arbiscan.io/tx/0x817977d0aa595adf2b5c23c69e8ced7ae139760696c55260d751bb46684275bf), [reveal](https://sepolia.arbiscan.io/tx/0x0f7985896283740e79224d3f99d97acb27f1f536c5b4fd257af1200fc9f2e675), [score](https://sepolia.arbiscan.io/tx/0x7f7c6b39ac04bbe018b5572c6d27bd94a24cd200f0c24d40c34595b11c6bd49e)
- Ethereum Sepolia: [commit](https://sepolia.etherscan.io/tx/0x3bbaa7dbf6bedb3a914e148e035bb1165a193780875a6bd45081ee53e14f922f), [reveal](https://sepolia.etherscan.io/tx/0x8e987584871ba994b7ed6ce5277b4791a578b9928f13ba39ff641432685e12e0), [score](https://sepolia.etherscan.io/tx/0x9758f38af04c9335b9a56a9ea8419d350c1f8fe862b99f1cae93bd8f0207d269)

Deployer (throwaway testnet key, not in git): 0xF31d46350D682CF6551fd835b03B73169944B1a5. Funded with 0.05 Sepolia ETH from the Google Cloud faucet, then bridged 0.012 ETH each to Base Sepolia (L1StandardBridge 0xfd0Bf71F60660E2f608ed56e1659C450eB113120) and Arbitrum Sepolia (Inbox 0xaAe29B0366299461418F5324a79Afc425BE5ae21).

## Remaining steps (do not paste into the portal)

1. Do not merge the Colosseum PR before Monad's submission freeze (13 Oct 23:59 ET). GitHub Pages builds from `main` only, so the public site will not show the Sepolia books until after that. Judges can run the branch locally (see above). The default dashboard chain stays Monad testnet 10143. Sepolia rows appear only with `?track=colosseum` or `NEXT_PUBLIC_COLOSSEUM=1`.
2. Tracks: one submission per team. Enter Base, Arbitrum, and Ethereum L1 if the form allows more than one track. If it allows one, pick Base Sepolia (cleanest data) and mention the other two deploys in the text.
3. Upload a logo. Decide whether to reuse the Monad pitch video. Record a Sepolia demo if the portal demo must show these chains (the local site works with `?track=colosseum&chain=84532`).
4. More rounds: `deploy/rounds.sh` with `CALLBOOK_CHAIN_ID`, `CALLBOOK_RPC_URL`, and `HORIZON_SEC=180` (the reveal window on these books is 120 s). Keys stay outside git.
