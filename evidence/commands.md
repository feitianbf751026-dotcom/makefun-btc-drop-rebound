# Reproduction commands

Run from the repository root in PowerShell. Set `$kit` to the extracted official kit directory.

```powershell
$kit = 'D:\Web3 & Crypto Markets\take orders\Make.fun\btc-race-24h-20261118-1444-kit'

node --test
node --check scripts/dev-search.mjs
node scripts/dev-search.mjs --kit $kit --out evidence\dev-search.json
node "$kit\cli\makefun.mjs" grade-local --kit $kit --bot . --driver process --json
node "$kit\cli\makefun.mjs" check --kit $kit --repo . --commit (git rev-parse HEAD) --transcripts transcripts.tar.gz --json
```

Native Codex transcript validation and packaging:

```powershell
$session = 'D:\CodexData\codex-home\sessions\2026\11\19\rollout-2026-11-19T03-39-50-01a1f02c-31a0-74a0-83af-543c2bb1534d.jsonl'
node "$kit\cli\makefun.mjs" bundle --repo . --session $session --no-discover --dry-run --json
node "$kit\cli\makefun.mjs" bundle --repo . --session $session --no-discover --out transcripts.tar.gz --json
Get-FileHash -Algorithm SHA256 transcripts.tar.gz
tar -tzf transcripts.tar.gz
```

The local process driver uses the installed Node runtime and is not a Docker-sandbox result. `evidence/local-grade.json` records the exact local result and its runtime mismatch note. No command in this repository connects to an exchange or submits a real trade.
