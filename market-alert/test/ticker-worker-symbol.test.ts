import { describe, expect, it } from 'vitest';
import { normalizeBinanceSymbol } from '../src/market/ticker-worker.js';

describe('all-market symbol contract', () => {
  it('documents the normalized Binance USDT symbol shape', () => {
    expect(normalizeBinanceSymbol('MORPHOUSDT', 'spot')).toBe('MORPHO/USDT');
    expect(normalizeBinanceSymbol('MORPHOUSDT', 'swap')).toBe('MORPHO/USDT:USDT');
    expect(normalizeBinanceSymbol('SCRTRY', 'spot')).toBe('SCRTRY');
  });
});
