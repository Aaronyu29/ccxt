import type { AlertEvent } from '../types/alert-event.js';
import { renderFwAlertPayload } from './template-renderer.js';

export interface AlertOutput {
  send(alert: AlertEvent): Promise<void>;
}

export class ConsoleOutput implements AlertOutput {
  async send(alert: AlertEvent): Promise<void> {
    console.log(JSON.stringify(renderFwAlertPayload(alert)));
  }
}
