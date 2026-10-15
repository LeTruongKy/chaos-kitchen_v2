import { parseBotOptions, runBots } from './bot.js';

async function main(): Promise<void> {
  const base = parseBotOptions(['--create', ...process.argv.slice(2)]);
  const durationSec = process.argv.includes('--duration-sec') ? base.durationSec : 60;
  const rooms = 5;
  const startedAt = Date.now();
  const memoryBefore = process.memoryUsage().rss;
  const results = await Promise.allSettled(Array.from({ length: rooms }, (_, index) => runBots({
    ...base, count: 4, durationSec, namePrefix: `${base.namePrefix}-${index + 1}-`, create: true,
  })));
  const errors = results.filter((result) => result.status === 'rejected').length;
  const memoryDeltaMb = (process.memoryUsage().rss - memoryBefore) / 1024 / 1024;
  console.log(`loadtest rooms=${rooms} clients=${rooms * 4} duration=${((Date.now() - startedAt) / 1000).toFixed(1)}s errors=${errors} rssDelta=${memoryDeltaMb.toFixed(1)}MB`);
  if (errors) process.exitCode = 1;
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
