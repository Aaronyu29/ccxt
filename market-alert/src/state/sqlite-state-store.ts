import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export interface PriceSample {
  timestamp: number;
  price: number;
}

export class SqliteStateStore {
  readonly db: Database.Database;
  private maintenanceCounter = 0;

  constructor(path: string, private readonly retentionMs = 7 * 24 * 60 * 60 * 1000) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new Database(path);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('journal_size_limit = 4194304');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS price_samples (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        state_key TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        price REAL NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_price_samples_key_time
        ON price_samples (state_key, timestamp);
      CREATE TABLE IF NOT EXISTS rule_state (
        state_key TEXT PRIMARY KEY,
        last_alert_at INTEGER,
        armed INTEGER NOT NULL DEFAULT 1
      );
      CREATE TABLE IF NOT EXISTS alerts (
        alert_id TEXT PRIMARY KEY,
        rule_id TEXT NOT NULL,
        exchange TEXT NOT NULL,
        market_type TEXT NOT NULL,
        symbol TEXT NOT NULL,
        price_type TEXT NOT NULL,
        price REAL NOT NULL,
        triggered_at INTEGER NOT NULL,
        message TEXT NOT NULL,
        metadata_json TEXT NOT NULL,
        event_json TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_alerts_triggered_at ON alerts (triggered_at);
      CREATE INDEX IF NOT EXISTS idx_alerts_symbol ON alerts (symbol, triggered_at);
    `);
  }

  addSample(stateKey: string, sample: PriceSample, retentionMs: number): void {
    const insert = this.db.prepare('INSERT INTO price_samples (state_key, timestamp, price) VALUES (?, ?, ?)');
    const prune = this.db.prepare('DELETE FROM price_samples WHERE state_key = ? AND timestamp < ?');
    const transaction = this.db.transaction(() => {
      insert.run(stateKey, sample.timestamp, sample.price);
      prune.run(stateKey, sample.timestamp - retentionMs * 2);
    });
    transaction();
    this.maintenanceCounter += 1;
    if (this.maintenanceCounter >= 1000) {
      this.maintenanceCounter = 0;
      this.prune(sample.timestamp);
    }
  }

  referenceAt(stateKey: string, timestamp: number): PriceSample | undefined {
    const row = this.db.prepare(
      'SELECT timestamp, price FROM price_samples WHERE state_key = ? AND timestamp <= ? ORDER BY timestamp DESC LIMIT 1',
    ).get(stateKey, timestamp) as PriceSample | undefined;
    return row;
  }

  lastAlertAt(stateKey: string): number | undefined {
    const row = this.db.prepare('SELECT last_alert_at FROM rule_state WHERE state_key = ?').get(stateKey) as { last_alert_at?: number } | undefined;
    return row?.last_alert_at;
  }

  markAlert(stateKey: string, timestamp: number): void {
    this.db.prepare(`
      INSERT INTO rule_state (state_key, last_alert_at, armed) VALUES (?, ?, 1)
      ON CONFLICT(state_key) DO UPDATE SET last_alert_at = excluded.last_alert_at
    `).run(stateKey, timestamp);
  }

  isArmed(stateKey: string): boolean {
    const row = this.db.prepare('SELECT armed FROM rule_state WHERE state_key = ?').get(stateKey) as { armed?: number } | undefined;
    return row?.armed !== 0;
  }

  setArmed(stateKey: string, armed: boolean): void {
    this.db.prepare(`
      INSERT INTO rule_state (state_key, armed) VALUES (?, ?)
      ON CONFLICT(state_key) DO UPDATE SET armed = excluded.armed
    `).run(stateKey, armed ? 1 : 0);
  }

  recordAlert(alert: {
    alertId: string;
    ruleId: string;
    message: string;
    triggeredAt: number;
    metadata: Record<string, unknown>;
    event: { exchange: string; marketType: string; symbol: string; priceType: string; price: number };
  }): void {
    this.db.prepare(`
      INSERT OR IGNORE INTO alerts
        (alert_id, rule_id, exchange, market_type, symbol, price_type, price, triggered_at, message, metadata_json, event_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      alert.alertId,
      alert.ruleId,
      alert.event.exchange,
      alert.event.marketType,
      alert.event.symbol,
      alert.event.priceType,
      alert.event.price,
      alert.triggeredAt,
      alert.message,
      JSON.stringify(alert.metadata),
      JSON.stringify(alert.event),
    );
    this.prune(alert.triggeredAt);
  }

  private prune(now: number): void {
    const cutoff = now - this.retentionMs;
    this.db.prepare('DELETE FROM price_samples WHERE timestamp < ?').run(cutoff);
    this.db.prepare('DELETE FROM alerts WHERE triggered_at < ?').run(cutoff);
  }

  close(): void {
    this.db.pragma('wal_checkpoint(TRUNCATE)');
    this.db.exec('VACUUM');
    this.db.close();
  }
}
