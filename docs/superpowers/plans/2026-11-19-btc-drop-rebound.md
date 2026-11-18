# BTC Drop-Rebound Bot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a deterministic Make.fun CBBTC drop-then-rebound bot whose published dev grade is profitable after official costs and whose code, tests, transcript bundle, and rerun evidence are submission-ready.

**Architecture:** `strategy.ts` owns a causal state machine and returns protocol order inputs; root `main.ts` connects it to the byte-identical official SDK. A standard-library research script records the finite dev parameter screen, while the official harness is the only authority for fills and PnL.

**Tech Stack:** Node 22-compatible TypeScript, Node built-in test runner, Make.fun bars replay SDK/CLI, Git.

**Spec:** `docs/superpowers/specs/2026-11-19-btc-drop-rebound-design.md`

## Global Constraints

- Runtime uses only standard library plus committed source; no install step.
- Runtime reads no network, wall clock, random source, environment-dependent input, or file outside the repository.
- Signals consume only delivered closed bars and fills; the harness fills every order at the next bar's open.
- Full official costs and the dev `net_pnl > 0` gate decide success.
- No signing, submission, wallet operation, bet, or real trade is performed.

## Review Focus

- Missing CBBTC bar: preserve state and emit no new order for that symbol.
- Rejected pending order: derive state from the next official account and permit a later valid setup without pretending a fill.
- Warm-up batch: update indicator history but emit no order.
- Last-batch order: strategy cannot know it is last; official harness rejection must not break protocol or determinism.
- Gap at next open: official rejection must leave local holdings unchanged and must not cause a duplicate based on invented fills.

---

### Task 1: Causal strategy state machine

**Files:**
- Create: `test/strategy.test.ts`
- Create: `strategy.ts`
- Copy exactly: `vendor/makefun-bars.ts`

**Interfaces:**
- Consumes: official `BarsState`, `Batch`, and `OrderInput` types.
- Produces: `StrategyConfig`, `DEFAULT_CONFIG`, and `createStrategy(config): Bot`.

- [x] Write tests showing no entry on the drop alone, entry only on a later rebound close, no warm-up order, no order on a missing bar, full-position exits, and identical prefix orders under different future suffixes.
- [x] Run `node --test test/strategy.test.ts`; expect failure because `strategy.ts` does not exist.
- [x] Implement the minimal state machine in `strategy.ts` and copy the official SDK shim byte-for-byte.
- [x] Run `node --test test/strategy.test.ts`; expect all tests to pass.
- [x] Commit the independently passing strategy task.

### Task 2: Protocol entrypoint and dev screening

**Files:**
- Create: `main.ts`
- Create: `test/protocol.test.ts`
- Create: `scripts/dev-search.mjs`
- Create: `evidence/dev-search.json`

**Interfaces:**
- Consumes: `createStrategy(DEFAULT_CONFIG)` and official `runBars`.
- Produces: valid one-reply-per-batch NDJSON behavior and a recorded finite parameter ranking.

- [x] Write a child-process protocol test with literal hello/batch/done lines; assert valid replies and that the rebound decision is emitted on the expected sequence.
- [x] Run `node --test test/protocol.test.ts`; expect failure because `main.ts` does not exist.
- [x] Implement `main.ts` as the SDK adapter, then add the deterministic search script and record its command/config/data hashes.
- [x] Run `node --test`; expect the full suite to pass with no warning or stderr.
- [x] Commit the independently passing protocol/search task.

### Task 3: Official grading and compliance evidence

**Files:**
- Create: `LICENSE`
- Create: `README.md`
- Create: `STRATEGY.md`
- Create: `evidence/commands.md`
- Create: `evidence/*.log`

**Interfaces:**
- Consumes: final source tree and current native Codex rollout.
- Produces: official local grade/check logs, transcript archive, source hashes, and unsigned submission handoff.

- [x] Run the official local grade with `--driver process --json --save`, capture exact stdout/stderr, and require net PnL above zero after fees.
- [x] Run the complete tests and official pre-submit check against the worktree; record all pass/fail/skip output without editing it.
- [x] Run `bundle --dry-run` against the current native Codex JSONL, then create the real archive and record its SHA-256 and file list.
- [x] Re-read the design requirements and verify each with a concrete file or command result.
- [ ] Commit the evidence and produce the entry-signature command/message for user confirmation without signing or submitting.
