import { describe, expect, it } from 'vitest';
import { normalizeTicker } from '../src/market/normalize-ticker.js';

describe('normalizeTicker', () => {
  it('uses exchange markPrice for mark events', () => {
    const event = normalizeTicker('binance', 'swap', 'BTC/USDT:USDT', { last: 100, info: { markPrice: '101.5' } }, 'markPrice', 'simulation', 123);
    expect(event?.price).toBe(101.5);
    expect(event?.timestamp).toBe(123);
  });

  it('drops invalid prices', () => {
    expect(normalizeTicker('binance', 'spot', 'BTC/USDT', { last: '0' }, 'last', 'simulation')).toBeUndefined();
  });
});
