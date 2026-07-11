import type { AlertEvent } from '../types/alert-event.js';

export function renderAlert(alert: AlertEvent): string {
  return `[${new Date(alert.triggeredAt).toISOString()}] ${alert.message} ${JSON.stringify(alert.metadata)}`;
}

export function renderFwAlertPayload(alert: AlertEvent): Record<string, string> {
  const event = alert.event;
  const metadata = alert.metadata;
  const direction = typeof metadata.direction === 'string'
    ? metadata.direction === 'above' ? '上穿' : metadata.direction === 'below' ? '下穿' : metadata.direction
    : typeof metadata.changePct === 'number'
      ? metadata.changePct > 0 ? '上涨' : metadata.changePct < 0 ? '下跌' : '波动'
      : '触发';
  const threshold = typeof metadata.targetPrice === 'number'
    ? String(metadata.targetPrice)
    : typeof metadata.changePct === 'number'
      ? `${Math.abs(metadata.changePct).toFixed(2)}%`
      : '';
  return {
    symbol: event.symbol.split(':')[0],
    direction,
    currentPrice: String(event.price),
    threshold,
  };
}

export function renderPricePayload(event: { symbol: string; price: number }): Record<string, string> {
  return {
    symbol: event.symbol.split(':')[0],
    direction: '价格更新',
    currentPrice: String(event.price),
    threshold: '',
  };
}
