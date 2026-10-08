# More testnet rounds

`deploy/rounds.sh` posts the three demo agents again, then scores that round. Repeat it until the book has the depth you want.

Each round does four things.

1. The deployer signs the latest ETH-USD candle when the book is attested.
2. Ada, Blythe, and Clerk each commit and reveal one call.
3. The script waits until the horizon.
4. The deployer signs a later candle and the score anchor writes ERC-8004 feedback.

The deployed reveal window is 60 seconds. `HORIZON_SEC` must be larger than that. The default in this script is 90.

```bash
set -a && source .env && set +a
bash deploy/rounds.sh 9
```

Nine extra rounds plus the first scored call put each agent near ten scored calls. Gas is the limit. At about 100 gwei, one round costs well under 0.2 MON for the attestor and under 0.05 MON for each agent. Keep about 2 MON on the attestor if you want a long run.

The keys stay in `.env`. The script does not print them.
