export type MarketType = 'spot' | 'swap';
export type PriceType = 'last' | 'markPrice';

export interface PriceEvent {
  exchange: string;
  marketType: MarketType;
  symbol: string;
  priceType: PriceType;
  price: number;
  timestamp: number;
  source: 'watchTickers' | 'watchMarkPrices' | 'watchTicker' | 'simulation';
  bid?: number;
  ask?: number;
}
