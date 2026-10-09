# Colosseum Crypto World's Fair: portal draft (every field)

Paste each `text` block into the matching portal field. Fields marked **USER** need 辉煌's own answer. Do not paste the "Remaining steps" section.

- Deadline: 12 Oct 2026, 11:59 pm PT, which is 13 Oct 2026, 14:59 Beijing.
- This file is on the Colosseum branch. `main` stays the Monad Metropolis submission. Do not merge this branch before Monad's submission freeze (13 Oct 23:59 ET).
- Rules used here: one product submission per team. Past development must be disclosed (see "Context about your repo"). Track pools are separate: Ethereum L1, Base and Arbitrum, $25,000 each across 5 products.

Assets on the box (not in git):
- Product demo video, 2:43: `/workspace/hackathons/colosseum-demo.mp4` (subtitles: `/workspace/hackathons/colosseum-demo.srt`)
- Logo: `/workspace/hackathons/callbook-logo-1024.png` and `/workspace/hackathons/callbook-logo-512.png`

## Project name

```text
Callbook
```

## Brief description

```text
Sealed trade calls for AI agents, scored into ERC-8004 reputation, and copyable only through an on-chain escrowed spend cap. Live on Base, Arbitrum and Ethereum Sepolia.
```

## Project website

```text
https://github.com/ChrisTu117/callbook/tree/cursor/colosseum-port-f4dc
```

The public Pages site builds from `main`, which is the Monad entry, so it does not show the Sepolia books before the deadline. The branch README and this draft give a three-command local run. After 14 Oct (post-Monad freeze) the branch can be merged, and https://christu117.github.io/callbook/?track=colosseum&chain=84532 will show Base Sepolia.

## Category

`AI`. If AI is not offered, pick `Infrastructure`.

## What are you building, and who is it for?

```text
Callbook is a track-record layer for AI trading agents. Today an agent or signal seller posts calls after the move. Screenshots and backtests can be curated, so nobody can tell a real record from a cherry-picked one. Copy-trading tools then give a bot open-ended spending power on top of that record.

Callbook fixes both halves on-chain:
1. Identity: every agent is an ERC-8004 agent, on the shared Identity Registry that already lives at the same address on Base Sepolia, Arbitrum Sepolia and Ethereum Sepolia.
2. Commit: the agent posts a hash of asset, side, confidence and a salt. The entry price is pinned in the same transaction.
3. Reveal: a later block reveals the call. A commit that is never revealed expires and is scored as a miss, so hiding a bad call still costs the agent.
4. Score: after the horizon, a separate ScoreAnchor pins the exit price and writes the result to the ERC-8004 Reputation Registry (tradingYield feedback, PnL in bps). The agent cannot score itself.
5. Copy: CopyDesk lets a follower escrow ETH behind an agent that clears an on-chain gate (at least one scored call and a 50% win rate). The escrow is the spend cap: a copied loss can never exceed its notional, and gains are paid only from surplus, never minted.

Who it is for: (a) builders of trading agents who want a record that cannot be faked and that any wallet or directory can read, and (b) people who want to follow an agent without handing it unlimited spending power. A MetaMask Agent Wallet plugin (mm callbook board / inspect / follow / copy) puts the book inside a wallet people already run.
```

## Why did you decide to build this, and why build it now?

```text
Two things landed this year. ERC-8004 gave agents a shared, chain-agnostic identity and reputation registry, already deployed at the same addresses on Base, Arbitrum and Ethereum testnets, but almost nothing writes verifiable performance into it. And wallets started to run agents directly (MetaMask's Agent Wallet ships a plugin system), so "let this bot trade for me" is becoming a one-command decision with no trustworthy track record behind it. Callbook is the missing piece between the two: a record an agent cannot edit, and a spend cap the follower controls.
```

## What technologies are you using or integrating with to build your product?

```text
Solidity 0.8.28 and Foundry (SignalBook, ScoreAnchor, CopyDesk, AttestedPriceSource; 11 contract tests). The existing ERC-8004 Identity, Reputation and Validation testnet registries. TypeScript and viem for the three demo agents, the scorer and a shared core (16 TS tests). A Next.js static dashboard that reads each chain directly from the browser, with no Callbook server. A MetaMask Agent Wallet plugin (oclif, esbuild). Coinbase public ETH-USD candles as the decision tape, and a Coinbase print signed by the deployer as the settlement price (AttestedPriceSource).
```

## Which chains does your product use?

`Base`, `Arbitrum`, `Ethereum`. All on their Sepolia testnets.

## How does your product use these chains?

```text
Everything runs on testnets: Base Sepolia (84532), Arbitrum Sepolia (421614) and Ethereum Sepolia (11155111). Nothing is on mainnet.

The same four contracts sit at the same addresses on all three chains, against the ERC-8004 testnet registries that already live there (Identity 0x8004A818BFB912233c491871b3d84c89A494BD9e, Reputation 0x8004B663056A597Dffe9eCcC1965A193B7388713, Validation 0x8004Cb1BF31DAf7788923b405b754f57acEB4272):
- SignalBook 0x2Ea6720834fa9b1DDaE0B9184FeBD70CAab882c6
- ScoreAnchor 0x3EA266107f281f2A576566fCa9caee16942cb4f9
- CopyDesk 0xa9117eFC6A19f1c58895e2f6ec869b90Cb23A324
- AttestedPriceSource 0x9861E4A86b11fF4AfCF644bf8c6AFAf885B8a32d

Three demo agents (Ada Momentum, Blythe Fade, Clerk) are registered as ERC-8004 agents on each chain and have posted sealed ETH-USD calls: 30 scored calls on Base Sepolia, 30 on Ethereum Sepolia and 33 on Arbitrum Sepolia (93 in total, each written as tradingYield feedback to the Reputation Registry). Every commit, reveal and score is a transaction you can open on the chain's explorer, and the dashboard links each one. A scored call costs three transactions per agent (commit, reveal, score), so cheap L2 gas is what makes a public, per-call record practical. Ethereum Sepolia proves the same contracts run on L1.
```

## Tracks

`Base`, `Arbitrum` and `Ethereum L1`, if the portal allows three. If only one is allowed: `Base`.

## Where is your team primarily based?

`China` (Shenzhen).

## Please share a team Telegram contact

**USER**: your Telegram handle. Leave it blank if the field is optional.

## X profile

**USER**: optional.

## Did anyone not listed on the team here do meaningful work on this project? If so, please explain.

```text
No other person worked on it. I am a solo founder. The code, contracts, deployments, documentation and videos were produced with AI coding assistants (Cursor cloud agents and an AI assistant) working under my direction. There were no human contractors.
```

## Please share any important context about your repo

```text
Development history, disclosed in full: the repository was created on 2026-10-08, inside this hackathon's window. There is no earlier codebase.

Callbook was first built for, and on 2026-10-08 submitted to, the Monad Metropolis hackathon (Trust, Identity & AI Infrastructure track), where it runs on Monad testnet. The `main` branch is that entry and is frozen until Monad's deadline.

The work specific to this submission is on the branch cursor/colosseum-port-f4dc, from commit d6b0396 onward: Base Sepolia, Arbitrum Sepolia and Ethereum Sepolia deploy targets, deployments of all four contracts on the three chains, 93 new scored calls, per-chain event snapshots, the dashboard's ?track=colosseum network menu, and fixes found while running on those chains (Sepolia state-gas padding, Arbitrum's L1 block number in reveal timing, exit-price timing across slow blocks).

Layout: contracts/ (Solidity and Foundry tests), packages/core (ABIs, hashing, event index), packages/agents (three demo agents and the scorer), packages/plugin (MetaMask Agent Wallet plugin), apps/web (static dashboard). Tests: forge test (11) and npm run test:ts (16). MIT licensed.
```

## GitHub link

```text
https://github.com/ChrisTu117/callbook/tree/cursor/colosseum-port-f4dc
```

If the field only accepts a repo URL: `https://github.com/ChrisTu117/callbook`, and the branch name is in the context field above.

## Project logo or graphic

Upload `/workspace/hackathons/callbook-logo-1024.png` (or the 512 px file if there is a size limit).

## Please submit a demo video of your product (product demo, at most 3:00)

File: `/workspace/hackathons/colosseum-demo.mp4` (2:43, English narration, burned-in subtitles). **USER**: upload it to YouTube (unlisted) or Loom and paste the link. It shows the Base, Ethereum and Arbitrum Sepolia books, the Blockscout commit and score transactions, and the MetaMask Agent Wallet plugin on Base Sepolia.

## Show demo video on the public project page

`Yes`

## Live product link

```text
https://github.com/ChrisTu117/callbook/tree/cursor/colosseum-port-f4dc
```

The public Pages URL shows the Monad book until the branch is merged after 14 Oct. See "Project website".

## Access instructions

```text
No login, no wallet needed. Everything is on testnets.

git clone https://github.com/ChrisTu117/callbook && cd callbook
git checkout cursor/colosseum-port-f4dc
npm ci && npm run build -w @callbook/core && npm run build -w web
python3 -m http.server 8080 -d apps/web/out    (or any static server)

Open /?track=colosseum&chain=84532 for Base Sepolia, chain=421614 for Arbitrum Sepolia, chain=11155111 for Ethereum Sepolia. The browser reads the chain directly. Each call links its commit, reveal and score transactions on the explorer. /desk shows an account's escrow and per-trade cap.

Plugin (Node 22+, @metamask/agent-wallet 6.2.1 or 7.x): build with npm run build, pack packages/plugin, install with mm plugins install file:<tgz>, then mm callbook board --chain 84532 and mm callbook inspect 9606 --chain 84532.

Tests: forge test and npm run test:ts.
```

## Pitch video (2:00 to 3:00)

**OPEN**: the existing pitch is 1:30 (https://christu117.github.io/callbook/media/callbook-pitch.mp4), which is shorter than the official 2:00 to 3:00. Either re-cut a 2 to 3 minute pitch, or paste the demo link here if the field accepts it.

## Presentation (optional)

Leave blank.

## Technical demo (if shown as a separate field)

Same link as the product demo.

## How do you know people actually need, or will need this product?

```text
Honestly, demand is not yet validated with users; this is our main open question. What we can point to: (1) agents are already being registered on ERC-8004 in large numbers, while feedback that carries verifiable performance is rare. (2) Copy-trading and paid signal groups are a large existing market whose records are screenshots. (3) Wallet vendors are shipping agent plugin systems (MetaMask Agent Wallet), which creates a place where "should I let this agent trade?" gets asked. The next step is to put ten external agents on the book and see whether followers use the gate.
```

## How far along are you? Do you have users? Please be as specific as possible.

```text
Working testnet product, no external users yet. Live on Base Sepolia, Arbitrum Sepolia and Ethereum Sepolia with the same contract addresses on each: three demo agents per chain and 93 scored calls in total (30 + 33 + 30), each written as tradingYield feedback to the ERC-8004 Reputation Registry. A static dashboard with a network menu, and a MetaMask Agent Wallet plugin tested on CLI 6.2.1 and 7.0.0 (board and inspect read Base Sepolia; follow dry-runs against the on-chain gate). Limits, stated plainly: one demo agent (Clerk) uses a deterministic mock decision function, not a live LLM. Prices are a Coinbase print signed by the deployer, not an oracle feed. No mainnet deployment and no token.
```

## Who else is building in this space, and what do you think they're getting wrong?

```text
Copy-trading platforms (exchange copy-trading, social trading apps) and signal marketplaces show records that the platform controls and can edit or delist. On-chain agent projects mostly track identity or payments. They don't prove a trading record call by call. Prediction-market reputations score markets, not an agent's own discretionary calls. What they miss is the commit-before-the-move step and the hard spend cap on the follower side. Callbook does those two things and writes the result into the open ERC-8004 registries, where anyone can read it.
```

## How do you make money, or how do you plan to?

```text
Nothing is charged today. Plan: a small fee on copy settlement or on follow escrow, and paid analytics for agent builders. Posting calls and reading the book stay free, because the book is only worth something if anyone can check it.
```

## How long have you each been working on this? Have you been working on it full time?

```text
Since 2026-10-08, part time. Solo founder working with AI coding assistants.
```

## Where is each member of the team currently based, and do you work in-person together?

```text
Solo founder based in Shenzhen, China.
```

## Legal entity / investment / fundraising / live token

`No` / `No` / `No` / `No`

## Do you intend to continue working on this project after the hackathon?

**USER** decides. Draft: `Yes`.

## Solana-specific fields

Solana mobile dApp: `No`. Bootcamp or workshop: `No`. Solana developer experience: `1`. Canteen SWARM: `No`.

## How did you hear about the hackathon? / Supporting groups

`Other: a hackathon opportunity list`. Supporting groups: `None`.

## Team member profile

**USER**: full name, email, role (`Founder`), age, gender, city (`Shenzhen`), country (`China`), in school, LinkedIn, GitHub (`ChrisTu117`), X, education, work experience, equity (`100%`), full-time status, achievement, why this project, extreme-lengths story, technical founder and background (suggested: "I set the product direction; the code was written by AI coding assistants under my direction"), looking for a cofounder.

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

1. Upload `/workspace/hackathons/colosseum-demo.mp4` to YouTube (unlisted) or Loom and paste the link.
2. Decide on the pitch video: re-cut to 2:00 to 3:00, or reuse the demo.
3. Upload the logo. Fill the USER fields.
4. Do not merge the Colosseum PR before Monad's submission freeze (13 Oct 23:59 ET). GitHub Pages builds from `main` only.
5. More rounds, if wanted: `deploy/rounds.sh` with `CALLBOOK_CHAIN_ID`, `CALLBOOK_RPC_URL` and `HORIZON_SEC=180` (the reveal window on these books is 120 s). Keys stay outside git.
