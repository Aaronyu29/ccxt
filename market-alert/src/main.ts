import { loadConfig } from './config/load-rules.js';
import { buildSubscriptionPlans } from './market/subscription-planner.js';
import { TickerWorker } from './market/ticker-worker.js';
import { OutputDispatcher } from './outputs/output-dispatcher.js';
import { RuleEngine } from './rules/rule-engine.js';
import { renderPricePayload } from './outputs/template-renderer.js';

const configPath = process.argv[2] ?? 'rules.example.yaml';
const config = await loadConfig(configPath);
const engine = new RuleEngine(config.rules, config.statePath);
const outputs = new OutputDispatcher(config);
const workers = buildSubscriptionPlans(config.rules).map((plan) => new TickerWorker(plan, (event) => {
  if (config.logPrices) console.log(JSON.stringify(renderPricePayload(event)));
  for (const alert of engine.evaluate(event)) {
    const rule = config.rules.find((candidate) => candidate.id === alert.ruleId);
    if (rule) outputs.enqueue(alert, rule.outputs);
  }
}));

const shutdown = (): void => {
  workers.forEach((worker) => worker.stop());
  engine.close();
};
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
await Promise.all(workers.map((worker) => worker.start()));
await outputs.onIdle();
