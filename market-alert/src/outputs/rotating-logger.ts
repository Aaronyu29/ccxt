import { appendFileSync, existsSync, mkdirSync, readdirSync, renameSync, statSync, unlinkSync } from 'node:fs';
import { dirname, basename, join } from 'node:path';

export class RotatingLogger {
  private activeDate = this.dateKey(new Date());

  constructor(private readonly path: string, private readonly retentionDays: number, private readonly maxBytes: number) {
    mkdirSync(dirname(path), { recursive: true });
    this.prune();
  }

  log(message: string): void {
    const today = this.dateKey(new Date());
    if (today !== this.activeDate) {
      if (existsSync(this.path)) renameSync(this.path, `${this.path}.${this.activeDate}`);
      this.activeDate = today;
      this.prune();
    }
    if (existsSync(this.path) && statSync(this.path).size >= this.maxBytes) {
      renameSync(this.path, `${this.path}.${today}.${Date.now()}`);
      this.prune();
    }
    console.log(message);
    appendFileSync(this.path, `${message}\n`, 'utf8');
  }

  private prune(): void {
    const directory = dirname(this.path);
    const prefix = `${basename(this.path)}.`;
    const cutoff = Date.now() - this.retentionDays * 24 * 60 * 60 * 1000;
    const files = readdirSync(directory)
      .filter((file) => file.startsWith(prefix))
      .map((file) => ({ file, time: statSync(join(directory, file)).mtimeMs }))
      .filter((item) => item.time < cutoff);
    for (const item of files) unlinkSync(join(directory, item.file));
  }

  private dateKey(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}
