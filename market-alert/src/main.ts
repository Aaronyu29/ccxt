import { loadConfig } from './config/load-rules.js';
import { buildSubscriptionPlans } from './market/subscription-planner.js';
import { TickerWorker } from './market/ticker-worker.js';
import { OutputDispatcher } from './outputs/output-dispatcher.js';
import { RuleEngine } from './rules/rule-engine.js';
import { renderPricePayload } from './outputs/template-renderer.js';
import { RotatingLogger } from './outputs/rotating-logger.js';
import type { PriceEvent } from './types/price-event.js';

const configPath = process.argv[2] ?? 'rules.example.yaml';
const config = await loadConfig(configPath);
const logger = new RotatingLogger(config.logPath, config.logRetentionDays, config.logMaxBytes);
const engine = new RuleEngine(config.rules, config.statePath, config.retentionDays);
const outputs = new OutputDispatcher(config, logger);
const latestByMarket = new Map<string, PriceEvent>();
const topLogTimer = setInterval(() => {
  const grouped = new Map<string, PriceEvent[]>();
  for (const event of latestByMarket.values()) {
    if (event.priceType !== 'last' || event.quoteVolume === undefined) continue;
    const key = `${event.exchange}:${event.marketType}`;
    const events = grouped.get(key) ?? [];
    events.push(event);
    grouped.set(key, events);
  }
  for (const [key, events] of grouped) {
    events.sort((a, b) => (b.quoteVolume ?? 0) - (a.quoteVolume ?? 0));
    for (const event of events.slice(0, config.topLogLimit)) {
      logger.log(JSON.stringify({ type: 'top_price', key, symbol: event.symbol, price: event.price, quoteVolume: event.quoteVolume, timestamp: event.timestamp }));
    }
  }
}, config.topLogIntervalMs);
topLogTimer.unref();
const workers = buildSubscriptionPlans(config.rules).map((plan) => new TickerWorker(plan, (event) => {
  latestByMarket.set(`${event.exchange}:${event.marketType}:${event.symbol}`, event);
  if (config.logPrices) logger.log(JSON.stringify(renderPricePayload(event)));
  for (const alert of engine.evaluate(event)) {
    const rule = config.rules.find((candidate) => candidate.id === alert.ruleId);
    if (rule) outputs.enqueue(alert, rule.outputs);
  }
}));

const shutdown = (): void => {
  clearInterval(topLogTimer);
  workers.forEach((worker) => worker.stop());
  engine.close();
};
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
await Promise.all(workers.map((worker) => worker.start()));
await outputs.onIdle();
