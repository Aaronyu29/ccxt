import { z } from 'zod';

const baseRule = z.object({
  id: z.string().min(1),
  exchange: z.string().default('binance'),
  marketType: z.enum(['spot', 'swap']),
  symbols: z.array(z.string().min(1)).min(1),
  priceType: z.enum(['last', 'markPrice']).default('last'),
  cooldownMs: z.number().int().nonnegative().default(300_000),
  resetPct: z.number().nonnegative().default(0),
  outputs: z.array(z.string().min(1)).default(['console']),
});

export const ruleSchema = z.discriminatedUnion('type', [
  baseRule.extend({
    type: z.literal('price_change'),
    windowMs: z.number().int().positive(),
    thresholdPct: z.number().positive(),
    direction: z.enum(['up', 'down', 'any']).default('any'),
  }),
  baseRule.extend({
    type: z.literal('price_target'),
    targetPrice: z.number().positive(),
    direction: z.enum(['above', 'below']),
  }),
]);

export const outputSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('console') }),
  z.object({
    type: z.literal('webhook'),
    url: z.string().url(),
    timeoutMs: z.number().int().positive().default(5_000),
    maxRetries: z.number().int().nonnegative().default(3),
    backoffMs: z.number().int().positive().default(500),
    hmacSecret: z.string().optional(),
  }),
]);

export const configSchema = z.object({
  statePath: z.string().min(1).default('data/market-alert.sqlite'),
  logPrices: z.boolean().default(true),
  logPath: z.string().min(1).default('data/logs/crypto-monitor.out.log'),
  logRetentionDays: z.number().int().positive().default(7),
  logMaxBytes: z.number().int().positive().default(50 * 1024 * 1024),
  retentionDays: z.number().int().positive().default(7),
  rules: z.array(ruleSchema).min(1),
  outputs: z.record(z.string(), outputSchema),
});

export type RuleConfig = z.infer<typeof ruleSchema>;
export type Config = z.infer<typeof configSchema>;
export type OutputConfig = z.infer<typeof outputSchema>;
