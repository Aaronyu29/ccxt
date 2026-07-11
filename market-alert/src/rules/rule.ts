import type { AlertEvent } from '../types/alert-event.js';
import type { PriceEvent } from '../types/price-event.js';
import type { RuleConfig } from '../config/schema.js';
import { RuleStateStore } from '../state/rule-state-store.js';
import { createHash } from 'node:crypto';

export interface Rule {
  evaluate(event: PriceEvent, state: RuleStateStore): AlertEvent | undefined;
}

export function eventKey(rule: RuleConfig, event: PriceEvent): string {
  return `${rule.id}:${event.exchange}:${event.marketType}:${event.symbol}:${event.priceType}`;
}

export function makeAlert(
  rule: RuleConfig,
  event: PriceEvent,
  metadata: Record<string, unknown>,
): AlertEvent {
  const raw = `${rule.id}:${event.symbol}:${event.priceType}:${event.timestamp}`;
  const alertId = createHash('sha256').update(raw).digest('hex').slice(0, 32);
  return {
    alertId,
    ruleId: rule.id,
    triggeredAt: event.timestamp,
    message: `${rule.id}: ${event.symbol} ${event.priceType}=${event.price}`,
    event,
    metadata,
  };
}
