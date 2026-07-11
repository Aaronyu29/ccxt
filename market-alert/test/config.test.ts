import { describe, expect, it } from 'vitest';
import { configSchema } from '../src/config/schema.js';

describe('config schema', () => {
  it('rejects a webhook without a valid URL', () => {
    const result = configSchema.safeParse({
      outputs: { hook: { type: 'webhook', url: 'not-a-url' } },
      rules: [{ id: 'r', marketType: 'spot', symbols: ['BTC/USDT'], type: 'price_target', targetPrice: 1, direction: 'above' }],
    });
    expect(result.success).toBe(false);
  });

  it('applies defaults to a valid rule', () => {
    const result = configSchema.parse({
      outputs: { console: { type: 'console' } },
      rules: [{ id: 'r', marketType: 'spot', symbols: ['BTC/USDT'], type: 'price_target', targetPrice: 1, direction: 'above' }],
    });
    expect(result.rules[0].exchange).toBe('binance');
    expect(result.rules[0].outputs).toEqual(['console']);
  });
});
