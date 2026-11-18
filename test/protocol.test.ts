import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const account = {
  cash_quote_units: '1000000000',
  positions: [],
  equity_quote_units: '1000000000',
};

const hello = {
  type: 'hello',
  protocol: 'agent-fun/bars-replay/v1',
  seed: '7',
  symbols: [{ symbol: 'CBBTC', mint: 'mint', price_scale: 8, qty_scale: 8 }],
  capital: { quote: 'USDC', quote_scale: 6, quote_units: '1000000000' },
  bar_interval: '1m',
  first_close_ms: 1_700_000_000_000,
  caps: { max_open_positions: 1, max_orders_per_bar: 16, max_weight_bps: 10_000, shorts: false, leverage: false },
  fees: { fee_bps: 4, slippage_bps: 2, min_notional_quote_units: '1000000' },
  latency_bars: 1,
};

function bar(seq: number, close: number) {
  return {
    symbol: 'CBBTC',
    t: hello.first_close_ms + seq * 60_000,
    o: String(close),
    h: String(close),
    l: String(close),
    c: String(close),
    v: null,
    o_depth: ['1000000000000'],
    c_depth: ['1000000000000'],
  };
}

test('main speaks one reply per batch and buys only on the rebound sequence', () => {
  const closes = [...Array(59).fill(10_000), 9_800, 9_810];
  const input = [
    hello,
    ...closes.map((close, seq) => ({
      type: 'batch',
      seq,
      t: hello.first_close_ms + seq * 60_000,
      bars: [bar(seq, close)],
      fills: [],
      account,
    })),
    { type: 'done', seq: closes.length, reason: 'end_of_data', account },
  ].map((line) => JSON.stringify(line)).join('\n') + '\n';

  const run = spawnSync(process.execPath, ['main.ts'], {
    cwd: process.cwd(),
    input,
    encoding: 'utf8',
    timeout: 10_000,
  });

  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.stderr, '');
  const replies = run.stdout.trim().split('\n').map((line) => JSON.parse(line));
  assert.equal(replies.length, closes.length);
  assert.deepEqual(replies.slice(0, -1).flatMap((reply) => reply.orders), []);
  assert.deepEqual(replies.at(-1), {
    type: 'reply',
    seq: 60,
    orders: [{
      side: 'buy',
      client_id: 'o1',
      symbol: 'CBBTC',
      notional_quote_units: '1000000000',
      max_slippage_bps: 100,
    }],
  });
});
