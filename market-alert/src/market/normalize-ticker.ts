import type { PriceType, PriceEvent, MarketType } from '../types/price-event.js';

export function normalizeTicker(
  exchange: string,
  marketType: MarketType,
  symbol: string,
  ticker: Record<string, any>,
  priceType: PriceType,
  source: PriceEvent['source'],
  timestamp = Date.now(),
): PriceEvent | undefined {
  const info = ticker.info ?? {};
  const rawPrice = priceType === 'markPrice'
    ? ticker.mark ?? ticker.markPrice ?? info.markPrice
    : ticker.last;
  const price = Number(rawPrice);
  if (!Number.isFinite(price) || price <= 0) return undefined;
  return {
    exchange,
    marketType,
    symbol,
    priceType,
    price,
    timestamp,
    source,
    bid: ticker.bid,
    ask: ticker.ask,
    quoteVolume: Number.isFinite(Number(ticker.quoteVolume)) ? Number(ticker.quoteVolume) : undefined,
  };
}
