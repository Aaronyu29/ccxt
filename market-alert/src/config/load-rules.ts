import { readFile } from 'node:fs/promises';
import YAML from 'yaml';
import { configSchema, type Config } from './schema.js';

export async function loadConfig(path: string): Promise<Config> {
  const raw = await readFile(path, 'utf8');
  const parsed = YAML.parse(raw);
  const result = configSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Invalid alert config:\n${result.error.message}`);
  }
  return result.data;
}
