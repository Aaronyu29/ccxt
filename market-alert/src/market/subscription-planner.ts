import type { RuleConfig } from '../config/schema.js';
import type { MarketType, PriceType } from '../types/price-event.js';

export interface SubscriptionPlan {
  exchange: string;
  marketType: MarketType;
  symbols: string[];
  priceTypes: PriceType[];
}

export function buildSubscriptionPlans(rules: RuleConfig[]): SubscriptionPlan[] {
  const grouped = new Map<string, SubscriptionPlan>();
  for (const rule of rules) {
    const key = `${rule.exchange}:${rule.marketType}`;
    const plan = grouped.get(key) ?? {
      exchange: rule.exchange,
      marketType: rule.marketType,
      symbols: [],
      priceTypes: [],
    };
    if (rule.symbols.includes('*')) plan.symbols = ['*'];
    for (const symbol of rule.symbols) {
      if (symbol !== '*' && !plan.symbols.includes('*') && !plan.symbols.includes(symbol)) plan.symbols.push(symbol);
    }
    if (!plan.priceTypes.includes(rule.priceType)) plan.priceTypes.push(rule.priceType);
    grouped.set(key, plan);
  }
  return [...grouped.values()];
}
