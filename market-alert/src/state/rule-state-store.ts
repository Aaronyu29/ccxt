import { SqliteStateStore } from './sqlite-state-store.js';
import type { AlertEvent } from '../types/alert-event.js';

export class RuleStateStore {
  private readonly windows = new Map<string, number>();

  constructor(private readonly storage: SqliteStateStore) {}

  window(key: string, maxAgeMs: number): PersistentRollingWindow {
    this.windows.set(key, maxAgeMs);
    return new PersistentRollingWindow(this.storage, key, maxAgeMs);
  }

  canAlert(key: string, now: number, cooldownMs: number): boolean {
    const last = this.storage.lastAlertAt(key);
    return last === undefined || now - last >= cooldownMs;
  }

  markAlert(key: string, now: number): void {
    this.storage.markAlert(key, now);
  }

  isArmed(key: string): boolean {
    return this.storage.isArmed(key);
  }

  setArmed(key: string, value: boolean): void {
    this.storage.setArmed(key, value);
  }

  recordAlert(alert: AlertEvent): void {
    this.storage.recordAlert(alert);
  }

  close(): void {
    this.storage.close();
  }
}

class PersistentRollingWindow {
  constructor(
    private readonly storage: SqliteStateStore,
    private readonly key: string,
    private readonly maxAgeMs: number,
  ) {}

  add(sample: { timestamp: number; price: number }): void {
    this.storage.addSample(this.key, sample, this.maxAgeMs);
  }

  referenceAt(timestamp: number): { timestamp: number; price: number } | undefined {
    return this.storage.referenceAt(this.key, timestamp);
  }
}
