import { afterEach, describe, expect, it, vi } from 'vitest';
import { WebhookOutput } from '../src/outputs/webhook-output.js';
import type { AlertEvent } from '../src/types/alert-event.js';

const alert: AlertEvent = {
  alertId: 'alert-1', ruleId: 'rule-1', triggeredAt: 1,
  message: 'test', metadata: {},
  event: { exchange: 'binance', marketType: 'spot', symbol: 'BTC/USDT', priceType: 'last', price: 100, timestamp: 1, source: 'simulation' },
};

afterEach(() => vi.unstubAllGlobals());

describe('WebhookOutput', () => {
  it('retries transient failures and sends an idempotency key', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('temporary failure', { status: 503 }))
      .mockResolvedValueOnce(new Response('', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const output = new WebhookOutput({ type: 'webhook', url: 'https://example.com/hook', timeoutMs: 100, maxRetries: 1, backoffMs: 1 });

    await output.send(alert);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][1].headers['idempotency-key']).toBe('alert-1');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      symbol: 'BTC/USDT', direction: '触发', currentPrice: '100', threshold: '',
    });
  });

  it('adds an HMAC signature when configured', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const output = new WebhookOutput({ type: 'webhook', url: 'https://example.com/hook', timeoutMs: 100, maxRetries: 0, backoffMs: 1, hmacSecret: 'secret' });

    await output.send(alert);

    expect(fetchMock.mock.calls[0][1].headers['x-alert-signature']).toMatch(/^[a-f0-9]{64}$/);
  });

  it('maps target alerts to the four fwalert template variables', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const output = new WebhookOutput({ type: 'webhook', url: 'https://example.com/hook', timeoutMs: 100, maxRetries: 0, backoffMs: 1 });
    await output.send({ ...alert, event: { ...alert.event, symbol: 'BTC/USDT:USDT', price: 65000 }, metadata: { targetPrice: 65000, direction: 'above' } });

    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      symbol: 'BTC/USDT', direction: '上穿', currentPrice: '65000', threshold: '65000',
    });
  });
});
