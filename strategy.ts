import {
  BPS,
  type Bar,
  type BarsState,
  type Batch,
  type Bot,
  type BuyInput,
  type OrderInput,
  type SellInput,
} from './vendor/makefun-bars.ts';

export interface StrategyConfig {
  lookbackBars: number;
  dropBps: number;
  reboundBps: number;
  setupExpiryBars: number;
  positionBps: number;
  takeProfitBps: number;
  stopLossBps: number;
  trailingArmedBps: number;
  trailingStopBps: number;
  maxHoldBars: number;
  maxSlippageBps: number;
}

export const DEFAULT_CONFIG: StrategyConfig = {
  lookbackBars: 30,
  dropBps: 60,
  reboundBps: 15,
  setupExpiryBars: 60,
  positionBps: 10_000,
  takeProfitBps: 45,
  stopLossBps: 80,
  trailingArmedBps: 30,
  trailingStopBps: 20,
  maxHoldBars: 120,
  maxSlippageBps: 100,
};

interface Series {
  closes: bigint[];
  armed: boolean;
  armedBars: number;
  low: bigint | null;
  wasHolding: boolean;
  heldBars: number;
  highWhileHeld: bigint | null;
}

const freshSeries = (): Series => ({
  closes: [],
  armed: false,
  armedBars: 0,
  low: null,
  wasHolding: false,
  heldBars: 0,
  highWhileHeld: null,
});

const ratioAtLeast = (left: bigint, right: bigint, bps: number) => left * BPS >= right * (BPS + BigInt(bps));
const ratioAtMost = (left: bigint, right: bigint, bps: number) => left * BPS <= right * (BPS - BigInt(bps));

function latestBar(batch: Batch, symbol: string): Bar | null {
  return batch.bars.find((bar) => bar.symbol === symbol) ?? null;
}

export function createStrategy(config: StrategyConfig = DEFAULT_CONFIG): Bot {
  const bySymbol = new Map<string, Series>();

  return {
    onBatch(state: BarsState, batch: Batch): OrderInput[] {
      const symbol = state.hello.symbols[0]?.symbol;
      if (symbol === undefined) return [];
      const bar = latestBar(batch, symbol);
      if (bar === null) return [];

      const close = BigInt(bar.c);
      const series = bySymbol.get(symbol) ?? freshSeries();
      bySymbol.set(symbol, series);
      const previousClose = series.closes.at(-1) ?? null;
      series.closes.push(close);
      if (series.closes.length > config.lookbackBars) series.closes.shift();

      const held = state.positions.get(symbol);
      if (held !== undefined) {
        series.armed = false;
        series.low = null;
        if (!series.wasHolding) {
          series.heldBars = 0;
          series.highWhileHeld = close;
        }
        series.wasHolding = true;
        series.heldBars++;
        if (series.highWhileHeld === null || close > series.highWhileHeld) series.highWhileHeld = close;

        const marked = state.value(symbol, held.qty);
        const profit = ratioAtLeast(marked, held.cost, config.takeProfitBps);
        const stop = ratioAtMost(marked, held.cost, config.stopLossBps);
        const trailArmed = ratioAtLeast(marked, held.cost, config.trailingArmedBps);
        const trail = trailArmed && ratioAtMost(close, series.highWhileHeld, config.trailingStopBps);
        if (profit || stop || trail || series.heldBars >= config.maxHoldBars) {
          const sell: SellInput = {
            side: 'sell',
            symbol,
            qty: held.qty,
            max_slippage_bps: config.maxSlippageBps,
          };
          return [sell];
        }
        return [];
      }

      if (series.wasHolding) {
        series.wasHolding = false;
        series.heldBars = 0;
        series.highWhileHeld = null;
      }

      let peak = close;
      for (const value of series.closes) if (value > peak) peak = value;
      if (series.closes.length >= config.lookbackBars && ratioAtMost(close, peak, config.dropBps)) {
        if (!series.armed) {
          series.armed = true;
          series.armedBars = 0;
          series.low = close;
        }
      } else if (series.armed) {
        series.armedBars++;
      }
      if (series.armed && (series.low === null || close < series.low)) series.low = close;
      if (series.armed && series.armedBars > config.setupExpiryBars) {
        series.armed = false;
        series.low = null;
      }

      if (state.warmingUp || !series.armed || series.low === null || previousClose === null) return [];
      if (close <= previousClose || !ratioAtLeast(close, series.low, config.reboundBps)) return [];

      let notional = state.weightRoom(symbol);
      if (state.cash < notional) notional = state.cash;
      notional = (notional * BigInt(config.positionBps)) / BPS;
      if (notional < BigInt(state.hello.fees.min_notional_quote_units)) return [];

      series.armed = false;
      series.low = null;
      const buy: BuyInput = {
        side: 'buy',
        symbol,
        notional_quote_units: notional,
        max_slippage_bps: config.maxSlippageBps,
      };
      return [buy];
    },
  };
}
