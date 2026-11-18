import { createStrategy } from './strategy.ts';
import { runBars } from './vendor/makefun-bars.ts';

await runBars(createStrategy());
