import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConsoleOutput } from '../src/outputs/console-output.js';
import type { AlertEvent } from '../src/types/alert-event.js';

const alert: AlertEvent = {
  alertId: 'console-1', ruleId: 'rule-1', triggeredAt: 1, message: 'test',
  metadata: { targetPrice: 65000, direction: 'above' },
  event: { exchange: 'binance', marketType: 'swap', symbol: 'BTC/USDT:USDT', priceType: 'markPrice', price: 65000, timestamp: 1, source: 'simulation' },
};

afterEach(() => vi.restoreAllMocks());

describe('ConsoleOutput', () => {
  it('prints the same four-field JSON contract as the webhook', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    await new ConsoleOutput().send(alert);
    expect(JSON.parse(log.mock.calls[0][0] as string)).toEqual({
      symbol: 'BTC/USDT', direction: '上穿', currentPrice: '65000', threshold: '65000',
    });
  });
});
