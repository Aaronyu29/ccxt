import { describe, expect, it } from 'vitest';
import { buildSubscriptionPlans } from '../src/market/subscription-planner.js';

describe('subscription planner', () => {
  it('groups symbols by exchange and market type', () => {
    const plans = buildSubscriptionPlans([
      { id: 'a', exchange: 'binance', marketType: 'spot', symbols: ['BTC/USDT'], priceType: 'last', type: 'price_target', targetPrice: 1, direction: 'above', cooldownMs: 0, resetPct: 0, outputs: ['console'] },
      { id: 'b', exchange: 'binance', marketType: 'spot', symbols: ['ETH/USDT', 'BTC/USDT'], priceType: 'markPrice', type: 'price_target', targetPrice: 1, direction: 'below', cooldownMs: 0, resetPct: 0, outputs: ['console'] },
      { id: 'c', exchange: 'binance', marketType: 'swap', symbols: ['BTC/USDT:USDT'], priceType: 'markPrice', type: 'price_target', targetPrice: 1, direction: 'above', cooldownMs: 0, resetPct: 0, outputs: ['console'] },
    ]);
    expect(plans).toHaveLength(2);
    expect(plans.find((plan) => plan.marketType === 'spot')).toEqual({
      exchange: 'binance', marketType: 'spot', symbols: ['BTC/USDT', 'ETH/USDT'], priceTypes: ['last', 'markPrice'],
    });
  });
});
