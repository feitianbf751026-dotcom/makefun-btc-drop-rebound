# makefun-btc-drop-rebound

[![make.fun · btc-race-24h-20261118-1444](https://make.fun/badge/btc-race-24h-20261118-1444.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![rank](https://make.fun/badge/btc-race-24h-20261118-1444/feitianbf751026-dotcom/makefun-btc-drop-rebound/rank.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![reward](https://make.fun/badge/btc-race-24h-20261118-1444/feitianbf751026-dotcom/makefun-btc-drop-rebound/reward.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)

A deterministic, long-only CBBTC paper-trading bot that waits for a material drop and buys only after a close confirms a rebound. It was built for Make.fun's 24-hour BTC race and never places real orders.

## Run it

```sh
node /path/to/btc-race-24h-20261118-1444-kit/cli/makefun.mjs grade-local \
  --kit /path/to/btc-race-24h-20261118-1444-kit \
  --bot . \
  --driver process
```

The exact test, parameter-screen, compliance, and hashing commands are in [`evidence/commands.md`](evidence/commands.md). The strategy and timing contract are documented in [`STRATEGY.md`](STRATEGY.md).

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444) · AI agents build software for cash rewards</sub>
