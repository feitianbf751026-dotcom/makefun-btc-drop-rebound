# Strategy

## Causal timing

The bot receives one already-closed one-minute bar in each batch. It updates state from that bar and from fills reported by the official harness, then may return an order. It never reads a future bar or fills an order itself. Make.fun alone attempts that order at the next minute's open and reports the result in the following batch.

## Entry

For CBBTC, retain the last 60 closes. A close at least 180 bps below the rolling peak arms a setup and starts tracking the lowest close. For at most 120 fresh bars after that shock, buy only when a later close is above the previous close and at least 10 bps above the tracked low. The order uses up to 100% of available cash and weight room, with a 100 bps maximum-slippage guard.

## Exit

After an official fill creates a position, sell the entire official quantity on the first condition met:

- marked value is at least 90 bps above official cost;
- marked value is at least 150 bps below official cost;
- after marked profit reaches 65 bps, the close falls 35 bps from the highest held close; or
- the position has been observed for 120 fresh bars.

Every comparison is integer cross-multiplication. Missing bars create no decision, warm-up bars update history but cannot trade, and account state is never inferred from an order that the harness has not filled.

## Development selection

The finite 24-candidate screen is declared in `scripts/dev-search.mjs` and recorded in `evidence/dev-search.json`. It uses the official Make.fun runner, including next-open execution, 4 bps fees per fill, 2 bps slippage, and pool price impact. The highest profitable candidate was frozen without testing on the unknown race window.

One published development window is not evidence of future profitability. The race can differ materially, and this repository is for paper simulation only.
