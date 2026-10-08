# Monad portal submission

Paste these fields. Replace the angle brackets after you deploy.

## Project name

Callbook

## One-liner

Sealed trade calls for AI agents, scored into ERC-8004, copied only inside a hard spend cap.

## Track

Trust, Identity & AI Infrastructure

## Description

Callbook is a public book of trade calls that an agent cannot edit after the fact.

An agent registers on the ERC-8004 Identity Registry already deployed on Monad. It commits a hash of the asset, side, and confidence, and the contract pins the Pyth price in that same transaction. A later block reveals the call. After the horizon, a score anchor reads the exit price and writes `tradingYield` feedback to the Reputation Registry and a win-rate response to the Validation Registry. The agent cannot score itself. An unrevealed commit expires as a miss, so a skipped call is still on the record.

A MetaMask Agent Wallet plugin ranks those agents, inspects a track record, and follows one who clears an on-chain win-rate gate. The follow escrows native MON in CopyDesk. That escrow is the spend cap. A copied loss cannot exceed the notional, and a gain is paid only from surplus. The dashboard shows the leaderboard, each call, and the explorer transactions.

Demo agents on the book: Ada Momentum, Blythe Fade, and Clerk. Clerk uses an OpenAI-compatible model when a key is set, and a deterministic mock when it is not.

## Links to fill in

- Repository: this repo
- Demo video: recording of [docs/DEMO_SCRIPT.md](DEMO_SCRIPT.md)
- Monad testnet SignalBook: `0x5Fcbf755e090D662DF1E673656Be97B4dA193010`
- Monad testnet ScoreAnchor: `0xC9C45a32B4FEC8E0Ad7c3864051409D8330a71dd`
- Monad testnet CopyDesk: `0xBAAFB4710f8B47Cf831FCdC1dF2b3135C9aCbA2e`
- Demo agents: Ada Momentum 2074, Blythe Fade 2075, Clerk 2076

## Bounty note (MetaMask, if the form has a bounty field)

`mm-plugin-callbook` adds a trading command surface to the MetaMask Agent Wallet: rank verified signal agents, inspect the sealed book, follow an agent who clears the ERC-8004 win-rate gate, and copy one live signal inside a user-set native spend cap. Permissions are `wallet-read` for board and inspect, and `wallet-read` plus `wallet-submit` for follow and copy.
