import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { RuleEngine } from '../src/rules/rule-engine.js';
import type { PriceEvent } from '../src/types/price-event.js';

const event = (price: number, timestamp: number): PriceEvent => ({
  exchange: 'binance', marketType: 'spot', symbol: 'BTC/USDT', priceType: 'last', price, timestamp, source: 'simulation',
});

describe('RuleEngine', () => {
  const engines: RuleEngine[] = [];
  afterEach(() => engines.splice(0).forEach((engine) => engine.close()));

  it('triggers price_change once per cooldown', () => {
    const engine = new RuleEngine([{
      id: 'change', exchange: 'binance', marketType: 'spot', symbols: ['BTC/USDT'], priceType: 'last',
      type: 'price_change', windowMs: 60_000, thresholdPct: 5, direction: 'any', cooldownMs: 60_000, resetPct: 0, outputs: ['console'],
    }]); engines.push(engine);
    expect(engine.evaluate(event(100, 0))).toHaveLength(0);
    expect(engine.evaluate(event(106, 60_000))).toHaveLength(1);
    expect(engine.evaluate(event(107, 61_000))).toHaveLength(0);
  });

  it('resets price_target after crossing the reset band', () => {
    const engine = new RuleEngine([{
      id: 'target', exchange: 'binance', marketType: 'spot', symbols: ['BTC/USDT'], priceType: 'last',
      type: 'price_target', targetPrice: 100, direction: 'above', resetPct: 1, cooldownMs: 0, outputs: ['console'],
    }]); engines.push(engine);
    expect(engine.evaluate(event(100, 0))).toHaveLength(1);
    expect(engine.evaluate(event(101, 1))).toHaveLength(0);
    expect(engine.evaluate(event(98, 2))).toHaveLength(0);
    expect(engine.evaluate(event(100, 3))).toHaveLength(1);
  });

  it('does not evaluate a rule for another symbol or market type', () => {
    const engine = new RuleEngine([{
      id: 'target', exchange: 'binance', marketType: 'spot', symbols: ['BTC/USDT'], priceType: 'last',
      type: 'price_target', targetPrice: 100, direction: 'above', resetPct: 0, cooldownMs: 0, outputs: ['console'],
    }]); engines.push(engine);
    expect(engine.evaluate(event(101, 0))).toHaveLength(1);
    expect(engine.evaluate({ ...event(101, 1), symbol: 'ETH/USDT' })).toHaveLength(0);
    expect(engine.evaluate({ ...event(101, 2), marketType: 'swap' })).toHaveLength(0);
  });

  it('restores the rolling window after the process restarts', () => {
    const directory = mkdtempSync(join(tmpdir(), 'market-alert-'));
    const database = join(directory, 'state.sqlite');
    const config = {
      id: 'persistent-change', exchange: 'binance', marketType: 'spot' as const, symbols: ['BTC/USDT'], priceType: 'last' as const,
      type: 'price_change' as const, windowMs: 60_000, thresholdPct: 5, direction: 'any' as const, cooldownMs: 60_000, resetPct: 0, outputs: ['console'],
    };
    const first = new RuleEngine([config], database);
    first.evaluate(event(100, 0));
    first.close();
    const restarted = new RuleEngine([config], database);
    engines.push(restarted);
    expect(restarted.evaluate(event(106, 60_000))).toHaveLength(1);
    restarted.close();
    engines.splice(engines.indexOf(restarted), 1);
    rmSync(directory, { recursive: true, force: true });
  });
});
