import type { PriceEvent } from './price-event.js';

export interface AlertEvent {
  alertId: string;
  ruleId: string;
  triggeredAt: number;
  message: string;
  event: PriceEvent;
  metadata: Record<string, unknown>;
}
