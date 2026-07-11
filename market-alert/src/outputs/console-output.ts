import type { AlertEvent } from '../types/alert-event.js';
import { renderFwAlertPayload } from './template-renderer.js';

export interface AlertOutput {
  send(alert: AlertEvent): Promise<void>;
}

export interface AlertLogger {
  log(message: string): void;
}

export class ConsoleOutput implements AlertOutput {
  constructor(private readonly logger: AlertLogger = console) {}

  async send(alert: AlertEvent): Promise<void> {
    this.logger.log(JSON.stringify(renderFwAlertPayload(alert)));
  }
}
