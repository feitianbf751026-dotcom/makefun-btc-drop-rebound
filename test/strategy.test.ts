import assert from 'node:assert/strict';
import test from 'node:test';

import { createStrategy, type StrategyConfig } from '../strategy.ts';

const CONFIG: StrategyConfig = {
  lookbackBars: 3,
  dropBps: 500,
  reboundBps: 100,
  setupExpiryBars: 6,
  positionBps: 5_000,
  takeProfitBps: 300,
  stopLossBps: 400,
  trailingArmedBps: 200,
  trailingStopBps: 150,
  maxHoldBars: 4,
  maxSlippageBps: 100,
};

type Position = { qty: bigint; cost: bigint };

function state(options: {
  warmingUp?: boolean;
  position?: Position;
  cash?: bigint;
  equity?: bigint;
  markedValue?: bigint;
} = {}) {
  const positions = new Map<string, Position>();
  if (options.position) positions.set('CBBTC', options.position);
  return {
    warmingUp: options.warmingUp ?? false,
    cash: options.cash ?? 1_000_000_000n,
    equity: options.equity ?? 1_000_000_000n,
    positions,
    hello: {
      symbols: [{ symbol: 'CBBTC', mint: 'mint', price_scale: 8, qty_scale: 8 }],
      caps: { max_open_positions: 1, max_orders_per_bar: 16, max_weight_bps: 10_000 },
      fees: { min_notional_quote_units: '1000000' },
    },
    weightRoom: () => options.equity ?? 1_000_000_000n,
    value: () => options.markedValue ?? 0n,
  };
}

function batch(seq: number, close?: number, open = close) {
  return {
    type: 'batch' as const,
    seq,
    t: 1_700_000_000_000 + seq * 60_000,
    bars: close === undefined ? [] : [{
      symbol: 'CBBTC',
      t: 1_700_000_000_000 + seq * 60_000,
      o: String(open),
      h: String(Math.max(open ?? close, close)),
      l: String(Math.min(open ?? close, close)),
      c: String(close),
      v: null,
      o_depth: ['1000000000000'],
      c_depth: ['1000000000000'],
    }],
    fills: [],
    account: { cash_quote_units: '1000000000', positions: [], equity_quote_units: '1000000000' },
  };
}

async function decide(bot: ReturnType<typeof createStrategy>, seq: number, close?: number, options = {}) {
  return await bot.onBatch(state(options) as never, batch(seq, close) as never) ?? [];
}

test('a drop arms the setup but only a later rebound close buys', async () => {
  const bot = createStrategy(CONFIG);

  assert.deepEqual(await decide(bot, 0, 10_000), []);
  assert.deepEqual(await decide(bot, 1, 9_900), []);
  assert.deepEqual(await decide(bot, 2, 9_400), []);
  assert.deepEqual(await decide(bot, 3, 9_450), []);
  assert.deepEqual(await decide(bot, 4, 9_500), [{
    side: 'buy',
    symbol: 'CBBTC',
    notional_quote_units: 500_000_000n,
    max_slippage_bps: 100,
  }]);
});

test('warm-up history is learned without emitting an order', async () => {
  const bot = createStrategy({ ...CONFIG, lookbackBars: 2, reboundBps: 50 });

  assert.deepEqual(await decide(bot, 0, 10_000, { warmingUp: true }), []);
  assert.deepEqual(await decide(bot, 1, 9_000, { warmingUp: true }), []);
  assert.deepEqual(await decide(bot, 2, 9_100, { warmingUp: true }), []);
});

test('a batch with no CBBTC bar emits no order', async () => {
  const bot = createStrategy(CONFIG);
  assert.deepEqual(await decide(bot, 0), []);
});

test('a take-profit exits the entire official position', async () => {
  const bot = createStrategy(CONFIG);
  const position = { qty: 123_456_789n, cost: 500_000_000n };

  assert.deepEqual(await decide(bot, 0, 10_100, {
    position,
    markedValue: 515_000_000n,
  }), [{
    side: 'sell',
    symbol: 'CBBTC',
    qty: 123_456_789n,
    max_slippage_bps: 100,
  }]);
});

test('different future suffixes cannot change prefix decisions', async () => {
  async function prefix(suffix: number[]) {
    const bot = createStrategy(CONFIG);
    const closes = [10_000, 9_900, 9_400, 9_450, 9_500, ...suffix];
    const orders = [];
    for (let seq = 0; seq < closes.length; seq++) orders.push(await decide(bot, seq, closes[seq]));
    return orders.slice(0, 5);
  }

  assert.deepEqual(await prefix([12_000, 13_000]), await prefix([7_000, 6_000]));
});

test('the decision ignores the current bar open when closed history is unchanged', async () => {
  const left = createStrategy(CONFIG);
  const right = createStrategy(CONFIG);
  const closes = [10_000, 9_900, 9_400, 9_450, 9_500];
  const leftOrders = [];
  const rightOrders = [];

  for (let seq = 0; seq < closes.length; seq++) {
    leftOrders.push(await left.onBatch(state() as never, batch(seq, closes[seq], closes[seq]) as never) ?? []);
    rightOrders.push(await right.onBatch(state() as never, batch(seq, closes[seq], closes[seq] * 2) as never) ?? []);
  }

  assert.deepEqual(leftOrders, rightOrders);
});
