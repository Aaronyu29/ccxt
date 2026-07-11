import type { RuleConfig } from '../config/schema.js';
import type { AlertEvent } from '../types/alert-event.js';
import type { PriceEvent } from '../types/price-event.js';
import type { Rule } from './rule.js';
import { eventKey, makeAlert } from './rule.js';
import type { RuleStateStore } from '../state/rule-state-store.js';

export class PriceChangeRule implements Rule {
  constructor(private readonly config: Extract<RuleConfig, { type: 'price_change' }>) {}

  evaluate(event: PriceEvent, state: RuleStateStore): AlertEvent | undefined {
    const key = eventKey(this.config, event);
    const window = state.window(key, this.config.windowMs);
    const previous = window.referenceAt(event.timestamp - this.config.windowMs);
    window.add({ timestamp: event.timestamp, price: event.price });
    if (!previous || previous.price <= 0) return undefined;

    const changePct = ((event.price - previous.price) / previous.price) * 100;
    const matched = this.config.direction === 'up'
      ? changePct >= this.config.thresholdPct
      : this.config.direction === 'down'
        ? changePct <= -this.config.thresholdPct
        : Math.abs(changePct) >= this.config.thresholdPct;
    if (!matched || !state.canAlert(key, event.timestamp, this.config.cooldownMs)) return undefined;

    state.markAlert(key, event.timestamp);
    return makeAlert(this.config, event, {
      kind: 'price_change',
      previousPrice: previous.price,
      changePct,
      windowMs: this.config.windowMs,
    });
  }
}
