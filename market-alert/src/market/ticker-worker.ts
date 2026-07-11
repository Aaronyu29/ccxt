import type { PriceType, MarketType, PriceEvent } from '../types/price-event.js';
import type { SubscriptionPlan } from './subscription-planner.js';
import { createExchange, seedMarkets } from './ccxt-factory.js';
import { normalizeTicker } from './normalize-ticker.js';

export type PriceEventHandler = (event: PriceEvent) => void;

export class TickerWorker {
  private stopped = false;
  private exchanges: any[] = [];

  constructor(private readonly plan: SubscriptionPlan, private readonly onEvent: PriceEventHandler) {}

  async start(): Promise<void> {
    this.exchanges = this.plan.priceTypes.map(() => createExchange(this.plan.exchange, this.plan.marketType));
    return Promise.all(this.plan.priceTypes.map((priceType, index) => {
      const exchange = this.exchanges[index];
      // Each channel gets its own connection because Binance maps ticker and markPrice to the same message family.
      seedMarkets(exchange, this.plan.marketType, this.plan.symbols);
      return this.runChannel(exchange, priceType);
    })).then(() => undefined);
  }

  private async runChannel(exchange: any, priceType: PriceType): Promise<void> {
    const symbols = this.plan.symbols.includes('*') ? undefined : this.plan.symbols;
    while (!this.stopped) {
      try {
        const tickers = priceType === 'markPrice'
          ? await exchange.watchMarkPrices(symbols)
          : await exchange.watchTickers(symbols);
        const timestamp = Date.now();
        const entries = symbols
          ? symbols.map((symbol) => [symbol, tickers[symbol]] as const)
          : Object.entries(tickers) as Array<[string, any]>;
        for (const [symbol, ticker] of entries) {
          if (!ticker) continue;
          const normalizedSymbol = normalizeBinanceSymbol(symbol, this.plan.marketType);
          if (this.plan.symbols.includes('*') && !normalizedSymbol.includes('/')) continue;
          const event = normalizeTicker(this.plan.exchange, this.plan.marketType, normalizedSymbol, ticker, priceType, priceType === 'markPrice' ? 'watchMarkPrices' : 'watchTickers', timestamp);
          if (event) this.onEvent(event);
        }
      } catch (error) {
        if (!this.stopped) {
          console.error(`[ticker:${this.plan.exchange}:${this.plan.marketType}]`, error);
          await new Promise((resolve) => setTimeout(resolve, 1_000));
        }
      }
    }
    await exchange.close();
  }

  stop(): void {
    this.stopped = true;
    for (const exchange of this.exchanges) void exchange.close();
  }
}

export function normalizeBinanceSymbol(symbol: string, marketType: MarketType): string {
  if (symbol.includes('/')) return symbol;
  if (symbol.endsWith('USDT')) {
    const base = symbol.slice(0, -4);
    return marketType === 'swap' ? `${base}/USDT:USDT` : `${base}/USDT`;
  }
  return symbol;
}
