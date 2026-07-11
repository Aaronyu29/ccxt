import { describe, expect, it } from 'vitest';
import { seedMarkets } from '../src/market/ccxt-factory.js';

describe('seedMarkets', () => {
  it('provides the identifiers required by CCXT Pro websocket subscriptions', () => {
    const exchange = { setMarkets: (markets: any[]) => { exchange.markets = markets; } } as any;
    seedMarkets(exchange, 'swap', ['BTC/USDT:USDT']);
    expect(exchange.markets[0]).toMatchObject({
      id: 'BTCUSDT', lowercaseId: 'btcusdt', symbol: 'BTC/USDT:USDT', type: 'swap', linear: true,
    });
  });
});
