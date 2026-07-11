import { createHmac } from 'node:crypto';
import type { AlertEvent } from '../types/alert-event.js';
import type { OutputConfig } from '../config/schema.js';
import { renderFwAlertPayload } from './template-renderer.js';
import type { AlertOutput } from './console-output.js';

export class WebhookOutput implements AlertOutput {
  constructor(private readonly config: Extract<OutputConfig, { type: 'webhook' }>) {}

  async send(alert: AlertEvent): Promise<void> {
    const body = JSON.stringify(renderFwAlertPayload(alert));
    let lastError: unknown;
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
      try {
        const headers: Record<string, string> = {
          'content-type': 'application/json',
          'idempotency-key': alert.alertId,
          'user-agent': 'ccxt-market-alert/1.0',
        };
        if (this.config.hmacSecret) {
          headers['x-alert-signature'] = createHmac('sha256', this.config.hmacSecret).update(body).digest('hex');
        }
        const response = await fetch(this.config.url, { method: 'POST', headers, body, signal: controller.signal });
        if (response.ok) return;
        lastError = new Error(`Webhook returned HTTP ${response.status}`);
        if (response.status >= 400 && response.status < 500 && response.status !== 429) break;
      } catch (error) {
        lastError = error;
      } finally {
        clearTimeout(timer);
      }
      if (attempt < this.config.maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, this.config.backoffMs * 2 ** attempt));
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }
}
