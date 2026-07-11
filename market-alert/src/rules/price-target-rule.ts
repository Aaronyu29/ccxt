import type { RuleConfig } from '../config/schema.js';
import type { AlertEvent } from '../types/alert-event.js';
import type { PriceEvent } from '../types/price-event.js';
import type { Rule } from './rule.js';
import { eventKey, makeAlert } from './rule.js';
import type { RuleStateStore } from '../state/rule-state-store.js';

export class PriceTargetRule implements Rule {
  constructor(private readonly config: Extract<RuleConfig, { type: 'price_target' }>) {}

  evaluate(event: PriceEvent, state: RuleStateStore): AlertEvent | undefined {
    const key = eventKey(this.config, event);
    const matched = this.config.direction === 'above'
      ? event.price >= this.config.targetPrice
      : event.price <= this.config.targetPrice;
    if (!matched) {
      if (this.config.direction === 'above' && event.price < this.config.targetPrice * (1 - this.config.resetPct / 100)) state.setArmed(key, true);
      if (this.config.direction === 'below' && event.price > this.config.targetPrice * (1 + this.config.resetPct / 100)) state.setArmed(key, true);
      return undefined;
    }
    if (!state.isArmed(key) || !state.canAlert(key, event.timestamp, this.config.cooldownMs)) return undefined;
    state.setArmed(key, false);
    state.markAlert(key, event.timestamp);
    return makeAlert(this.config, event, {
      kind: 'price_target',
      targetPrice: this.config.targetPrice,
      direction: this.config.direction,
    });
  }
}
