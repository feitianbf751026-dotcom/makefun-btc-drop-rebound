import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..');
const kitFlag = process.argv.indexOf('--kit');
const outFlag = process.argv.indexOf('--out');
if (kitFlag < 0 || outFlag < 0 || !process.argv[kitFlag + 1] || !process.argv[outFlag + 1]) {
  console.error('usage: node scripts/dev-search.mjs --kit <kit-dir> --out <result.json>');
  process.exit(2);
}
const kit = resolve(process.argv[kitFlag + 1]);
const output = resolve(process.argv[outFlag + 1]);
const cli = join(kit, 'cli', 'makefun.mjs');

const common = {
  setupExpiryBars: 120,
  positionBps: 10_000,
  maxSlippageBps: 100,
};

const candidates = [
  { id: 'd120-r15-t80', lookbackBars: 45, dropBps: 120, reboundBps: 15, takeProfitBps: 80, stopLossBps: 120, trailingArmedBps: 60, trailingStopBps: 35, maxHoldBars: 120 },
  { id: 'd120-r25-t100', lookbackBars: 45, dropBps: 120, reboundBps: 25, takeProfitBps: 100, stopLossBps: 140, trailingArmedBps: 70, trailingStopBps: 40, maxHoldBars: 120 },
  { id: 'd150-r10-t80', lookbackBars: 60, dropBps: 150, reboundBps: 10, takeProfitBps: 80, stopLossBps: 120, trailingArmedBps: 60, trailingStopBps: 35, maxHoldBars: 120 },
  { id: 'd150-r20-t100', lookbackBars: 60, dropBps: 150, reboundBps: 20, takeProfitBps: 100, stopLossBps: 150, trailingArmedBps: 70, trailingStopBps: 40, maxHoldBars: 120 },
  { id: 'd150-r30-t120', lookbackBars: 60, dropBps: 150, reboundBps: 30, takeProfitBps: 120, stopLossBps: 150, trailingArmedBps: 80, trailingStopBps: 45, maxHoldBars: 150 },
  { id: 'd180-r10-t80', lookbackBars: 60, dropBps: 180, reboundBps: 10, takeProfitBps: 80, stopLossBps: 150, trailingArmedBps: 60, trailingStopBps: 35, maxHoldBars: 120 },
  { id: 'd180-r20-t100', lookbackBars: 60, dropBps: 180, reboundBps: 20, takeProfitBps: 100, stopLossBps: 160, trailingArmedBps: 70, trailingStopBps: 40, maxHoldBars: 150 },
  { id: 'd180-r30-t120', lookbackBars: 60, dropBps: 180, reboundBps: 30, takeProfitBps: 120, stopLossBps: 180, trailingArmedBps: 80, trailingStopBps: 45, maxHoldBars: 180 },
  { id: 'd200-r15-t100', lookbackBars: 60, dropBps: 200, reboundBps: 15, takeProfitBps: 100, stopLossBps: 160, trailingArmedBps: 70, trailingStopBps: 40, maxHoldBars: 150 },
  { id: 'd200-r25-t120', lookbackBars: 60, dropBps: 200, reboundBps: 25, takeProfitBps: 120, stopLossBps: 180, trailingArmedBps: 80, trailingStopBps: 45, maxHoldBars: 180 },
  { id: 'd220-r20-t100', lookbackBars: 90, dropBps: 220, reboundBps: 20, takeProfitBps: 100, stopLossBps: 180, trailingArmedBps: 70, trailingStopBps: 40, maxHoldBars: 180 },
  { id: 'd250-r25-t120', lookbackBars: 90, dropBps: 250, reboundBps: 25, takeProfitBps: 120, stopLossBps: 200, trailingArmedBps: 80, trailingStopBps: 45, maxHoldBars: 180 },
  { id: 'd180-r5-t60', lookbackBars: 60, dropBps: 180, reboundBps: 5, takeProfitBps: 60, stopLossBps: 150, trailingArmedBps: 50, trailingStopBps: 30, maxHoldBars: 120 },
  { id: 'd180-r5-t80', lookbackBars: 60, dropBps: 180, reboundBps: 5, takeProfitBps: 80, stopLossBps: 150, trailingArmedBps: 60, trailingStopBps: 35, maxHoldBars: 120 },
  { id: 'd180-r5-t100', lookbackBars: 60, dropBps: 180, reboundBps: 5, takeProfitBps: 100, stopLossBps: 150, trailingArmedBps: 70, trailingStopBps: 40, maxHoldBars: 120 },
  { id: 'd180-r10-t60', lookbackBars: 60, dropBps: 180, reboundBps: 10, takeProfitBps: 60, stopLossBps: 150, trailingArmedBps: 50, trailingStopBps: 30, maxHoldBars: 120 },
  { id: 'd180-r10-t70', lookbackBars: 60, dropBps: 180, reboundBps: 10, takeProfitBps: 70, stopLossBps: 150, trailingArmedBps: 55, trailingStopBps: 30, maxHoldBars: 120 },
  { id: 'd180-r10-t90', lookbackBars: 60, dropBps: 180, reboundBps: 10, takeProfitBps: 90, stopLossBps: 150, trailingArmedBps: 65, trailingStopBps: 35, maxHoldBars: 120 },
  { id: 'd180-r10-t100', lookbackBars: 60, dropBps: 180, reboundBps: 10, takeProfitBps: 100, stopLossBps: 150, trailingArmedBps: 70, trailingStopBps: 40, maxHoldBars: 120 },
  { id: 'd180-r10-t120', lookbackBars: 60, dropBps: 180, reboundBps: 10, takeProfitBps: 120, stopLossBps: 150, trailingArmedBps: 80, trailingStopBps: 45, maxHoldBars: 120 },
  { id: 'd180-r10-wide-trail', lookbackBars: 60, dropBps: 180, reboundBps: 10, takeProfitBps: 80, stopLossBps: 150, trailingArmedBps: 100, trailingStopBps: 50, maxHoldBars: 120 },
  { id: 'd180-r10-no-trail', lookbackBars: 60, dropBps: 180, reboundBps: 10, takeProfitBps: 80, stopLossBps: 150, trailingArmedBps: 5000, trailingStopBps: 100, maxHoldBars: 120 },
  { id: 'd180-r10-h60', lookbackBars: 60, dropBps: 180, reboundBps: 10, takeProfitBps: 80, stopLossBps: 150, trailingArmedBps: 60, trailingStopBps: 35, maxHoldBars: 60 },
  { id: 'd180-r15-t80', lookbackBars: 60, dropBps: 180, reboundBps: 15, takeProfitBps: 80, stopLossBps: 150, trailingArmedBps: 60, trailingStopBps: 35, maxHoldBars: 120 },
].map((candidate) => ({ ...common, ...candidate }));

const sha256 = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
const scratch = mkdtempSync(join(tmpdir(), 'makefun-btc-dev-search-'));

function candidateBot(config) {
  const dir = join(scratch, config.id);
  mkdirSync(join(dir, 'vendor'), { recursive: true });
  cpSync(join(repo, 'strategy.ts'), join(dir, 'strategy.ts'));
  cpSync(join(repo, 'vendor', 'makefun-bars.ts'), join(dir, 'vendor', 'makefun-bars.ts'));
  const { id: _id, ...runtimeConfig } = config;
  writeFileSync(join(dir, 'main.ts'), [
    "import { createStrategy } from './strategy.ts';",
    "import { runBars } from './vendor/makefun-bars.ts';",
    `const config = ${JSON.stringify(runtimeConfig)};`,
    'await runBars(createStrategy(config));',
    '',
  ].join('\n'));
  return dir;
}

function grade(config) {
  return new Promise((resolveGrade) => {
    const bot = candidateBot(config);
    const child = spawn(process.execPath, [cli, 'grade-local', '--kit', kit, '--bot', bot, '--driver', 'process', '--json'], {
      cwd: repo,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8').on('data', (chunk) => { stdout += chunk; });
    child.stderr.setEncoding('utf8').on('data', (chunk) => { stderr += chunk; });
    child.on('close', (exitCode) => {
      try {
        const parsed = JSON.parse(stdout);
        const metrics = parsed.result?.performance?.metrics;
        resolveGrade({
          id: config.id,
          config: Object.fromEntries(Object.entries(config).filter(([key]) => key !== 'id')),
          exitCode,
          status: parsed.status,
          netPnlQuoteUnits: metrics?.net_pnl_quote_units ?? null,
          trades: metrics?.trades ?? null,
          maxDrawdown: metrics?.max_drawdown ?? null,
          actionLogSha256: parsed.action_log_sha256 ?? null,
          reproduced: parsed.l1?.reproduced ?? false,
          error: parsed.error ?? (stderr.trim() || null),
        });
      } catch (error) {
        resolveGrade({ id: config.id, config, exitCode, status: 'parse_failed', error: String(error), stdout, stderr });
      }
    });
  });
}

async function mapLimit(items, width, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    for (;;) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await fn(items[index]);
      console.error(`${results[index].id}: ${results[index].netPnlQuoteUnits ?? results[index].status}`);
    }
  }
  await Promise.all(Array.from({ length: width }, worker));
  return results;
}

try {
  const results = await mapLimit(candidates, 4, grade);
  const eligible = results.filter((result) => result.status === 'finished' && result.reproduced && BigInt(result.netPnlQuoteUnits ?? '-1') > 0n);
  eligible.sort((left, right) => BigInt(left.netPnlQuoteUnits) > BigInt(right.netPnlQuoteUnits) ? -1 : 1);
  const evidence = {
    schema: 'makefun-btc-dev-search/v1',
    competition: 'btc-race-24h-20261118-1444',
    driver: 'process',
    concurrency: 4,
    node: process.version,
    kitBundleSha256: JSON.parse(readFileSync(join(kit, 'kit.json'), 'utf8')).bundle_sha256,
    datasetSha256: JSON.parse(readFileSync(join(kit, 'kit.json'), 'utf8')).dataset_sha256,
    strategySha256: sha256(join(repo, 'strategy.ts')),
    vendorSha256: sha256(join(repo, 'vendor', 'makefun-bars.ts')),
    selected: eligible[0] ?? null,
    results,
  };
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify(evidence, null, 2));
  if (eligible.length === 0) process.exitCode = 1;
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
