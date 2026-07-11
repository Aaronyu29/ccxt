import type { RuleConfig } from '../config/schema.js';
import type { AlertEvent } from '../types/alert-event.js';
import type { PriceEvent } from '../types/price-event.js';
import { RuleStateStore } from '../state/rule-state-store.js';
import { PriceChangeRule } from './price-change-rule.js';
import { PriceTargetRule } from './price-target-rule.js';
import type { Rule } from './rule.js';
import { SqliteStateStore } from '../state/sqlite-state-store.js';

export class RuleEngine {
  private readonly state: RuleStateStore;
  private readonly rules: Array<{ config: RuleConfig; rule: Rule }>;

  constructor(configs: RuleConfig[], statePath = ':memory:', retentionDays = 7) {
    const storage = new SqliteStateStore(statePath, retentionDays * 24 * 60 * 60 * 1000);
    this.state = new RuleStateStore(storage);
    this.rules = configs.map((config) => ({
      config,
      rule: config.type === 'price_change' ? new PriceChangeRule(config) : new PriceTargetRule(config),
    }));
  }

  evaluate(event: PriceEvent): AlertEvent[] {
    const alerts: AlertEvent[] = [];
    for (const { config, rule } of this.rules) {
      if (config.exchange !== event.exchange || config.marketType !== event.marketType || config.priceType !== event.priceType || (!config.symbols.includes('*') && !config.symbols.includes(event.symbol))) continue;
      const alert = rule.evaluate(event, this.state);
      if (alert) {
        this.state.recordAlert(alert);
        alerts.push(alert);
      }
    }
    return alerts;
  }

  close(): void {
    this.state.close();
  }
}
