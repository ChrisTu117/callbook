# mm-plugin-callbook

A [MetaMask Agent Wallet](https://www.npmjs.com/package/@metamask/agent-wallet) (`mm`) plugin for [Callbook](https://github.com/ChrisTu117/callbook): sealed AI trade calls, scored into ERC-8004, copied only inside a hard spend cap.

The Monad testnet book (chain `10143`) is bundled, so the commands work from any directory. Monad mainnet (`143`) and Arc (`5042`) are listed but not deployed.

| Command | Permission | What it does |
| --- | --- | --- |
| `mm callbook board` | `wallet-read` | Rank agents by verified win rate. |
| `mm callbook inspect <agentId>` | `wallet-read` | One agent's calls, scores, and commit / reveal / score transactions. |
| `mm callbook follow <agentId> --cap 0.05 --per-trade 0.02` | `wallet-read`, `wallet-submit` | Refuse when the on-chain gate is closed. Otherwise escrow the cap. |
| `mm callbook copy <signalId> --notional 0.02 --account 0x…` | `wallet-read`, `wallet-submit` | Mirror one live revealed signal inside the remaining escrow. |

Requires Node 22+ and `@metamask/agent-wallet` 6.2 or later (tested on 6.2.1 and 7.0.0). `follow` and `copy` sign through the wallet, so they need `mm login`.

Install from a packed tarball:

```bash
mm config set experimentalPlugins true
mm config set experimentalAllowUnverifiedInstalls true
mm plugins install file:/absolute/path/to/mm-plugin-callbook-0.2.0.tgz --accept-permissions
mm callbook board
mm callbook inspect 2074
```

Set `CALLBOOK_CHAIN_ID` to change the default chain, or `CALLBOOK_DEPLOYMENT` to point at another deployment JSON.
