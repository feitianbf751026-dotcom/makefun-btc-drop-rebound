# BTC Drop-Rebound Bot Design

## Intent

Build a deterministic, long-only CBBTC paper-trading bot for Make.fun competition `btc-race-24h-20261118-1444`. It must pass the published dev gate after all official costs while preserving the causal contract: a decision sees only the bar that has just closed and any prior fills, and the official replay alone fills that decision at the next bar's open.

## Goals

- Detect a material short-term drop, arm a setup, and buy only after a close confirms a rebound from the post-drop low.
- Exit on an exact net-value profit target, stop loss, trailing reversal, or maximum holding time.
- Use the official `agent-fun/bars-replay/v1` protocol, standard library only, and deterministic state.
- Keep TDD evidence, official local-grade output, source/config hashes, and transcript-bundle dry-run/output logs.

## Non-goals and anti-goals

- No real trading, wallet transfer, market bet, live order, network call, wall clock, randomness, or data outside the submitted repository at runtime.
- No future bar, next-open, race-window, or dev-row hard-coding; no order is locally filled.
- Do not sign or submit the entry. Produce the final entry message/signing handoff for the user to confirm.
- Do not claim race performance from the one published dev window.

## Constraints

- Root entrypoint: `main.ts`, Node 22 type-stripping compatible.
- Initial capital: 1,000 USDC; one long position; no leverage or shorts.
- Official fill: next one-minute open; 4 bps fee plus 2 bps slippage per side plus pool impact.
- Dev admission: exact net PnL strictly above 0 after costs. Final guardrail: at least one own filled order and maximum drawdown at most 25%.
- Repository must be public, created after `2026-11-18T14:44:00Z`, OSI licensed, and accompanied by genuine Codex logs/run record.

## Selected approach

Use a small state machine over close prices. Over a rolling peak window, a drawdown of `dropBps` arms the setup; the lowest close after arming is tracked; a buy is emitted only when the current close is at least `reboundBps` above that low and above the prior close. The position uses `positionBps` of available cash. Once a fill appears in the next batch's account, exits compare the current mark and official cost with exact integers, track the highest close, and emit a full sell on the first configured profit, stop, trailing, or age condition.

This is preferred to a plain moving-average cross (not specifically a post-drop rebound) and to an RSI/Bollinger clone (more parameters and weaker causal auditability). Parameters may be screened on the published dev set, but the algorithm, search grid, tie-break, and selected configuration are recorded before the official final replay.

## Components

- `strategy.ts`: pure deterministic state machine and exported configuration.
- `main.ts`: official SDK loop only; no strategy logic or local fills.
- `vendor/makefun-bars.ts`: byte-identical official SDK shim from the verified kit.
- `test/strategy.test.ts`: causal, state-transition, risk-exit, warm-up, and integration tests.
- `scripts/dev-search.mjs`: deterministic development-set screening that emits JSON evidence; official grading remains authoritative.
- `evidence/`: immutable command output, hashes, configuration, and official grade results.

## Validation

TDD tests must be observed failing before implementation. Then run the full Node test suite, official `grade-local --driver process` twice via its own deterministic check, `check --worktree`, and `bundle --dry-run` followed by a real transcript bundle. A result is reported as local dev evidence only unless the authenticated server returns an official grade.
