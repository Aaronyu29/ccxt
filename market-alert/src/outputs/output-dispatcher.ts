import PQueue from 'p-queue';
import { appendFile } from 'node:fs/promises';
import type { AlertEvent } from '../types/alert-event.js';
import type { Config, OutputConfig } from '../config/schema.js';
import { ConsoleOutput, type AlertOutput } from './console-output.js';
import { WebhookOutput } from './webhook-output.js';

export class OutputDispatcher {
  private readonly queue = new PQueue({ concurrency: 4 });
  private readonly outputs = new Map<string, AlertOutput>();

  constructor(config: Config) {
    for (const [id, output] of Object.entries(config.outputs)) this.outputs.set(id, createOutput(output));
  }

  enqueue(alert: AlertEvent, outputIds: string[]): void {
    for (const outputId of outputIds) {
      const output = this.outputs.get(outputId);
      if (!output) {
        void this.writeDeadLetter(alert, `Unknown output: ${outputId}`);
        continue;
      }
      void this.queue.add(async () => {
        try {
          await output.send(alert);
        } catch (error) {
          await this.writeDeadLetter(alert, error instanceof Error ? error.message : String(error));
        }
      });
    }
  }

  async onIdle(): Promise<void> {
    await this.queue.onIdle();
  }

  private async writeDeadLetter(alert: AlertEvent, error: string): Promise<void> {
    await appendFile('dead-letter.jsonl', `${JSON.stringify({ alert, error, failedAt: Date.now() })}\n`);
  }
}

function createOutput(config: OutputConfig): AlertOutput {
  return config.type === 'console' ? new ConsoleOutput() : new WebhookOutput(config);
}
