import ccxt from 'ccxt';
import type { MarketType } from '../types/price-event.js';

export function createExchange(exchangeId: string, marketType: MarketType): any {
  if (exchangeId !== 'binance') throw new Error(`Unsupported exchange: ${exchangeId}`);
  const ccxtPro = (ccxt as any).pro ?? ccxt;
  const Exchange = marketType === 'swap' ? ccxtPro.binanceusdm : ccxtPro.binance;
  if (!Exchange) throw new Error(`CCXT exchange class unavailable for ${marketType}`);
  return new Exchange({ enableRateLimit: true });
}

export function seedMarkets(exchange: any, marketType: MarketType, symbols: string[]): void {
  if (symbols.includes('*')) {
    exchange.setMarkets([]);
    return;
  }
  exchange.setMarkets(symbols.map((symbol) => {
    const [pair, settle] = symbol.split(':');
    const [base, quote] = pair.split('/');
    const isSwap = marketType === 'swap';
    return {
      id: `${base}${quote}`,
      lowercaseId: `${base}${quote}`.toLowerCase(),
      symbol,
      base,
      quote,
      settle: isSwap ? settle ?? quote : undefined,
      baseId: base,
      quoteId: quote,
      settleId: isSwap ? settle ?? quote : undefined,
      type: isSwap ? 'swap' : 'spot',
      spot: !isSwap,
      margin: false,
      swap: isSwap,
      future: false,
      option: false,
      contract: isSwap,
      linear: isSwap,
      inverse: false,
      active: true,
      contractSize: 1,
    };
  }));
}
