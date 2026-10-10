/** Small in-memory fakes shared by the domain specs. */
import type { Bytes, OutboxItem } from './models';
import type { FileSharer, OutboxStore, SharedFile, ShareResult } from './ports';

export class MemoryStore implements Pick<OutboxStore, 'getAll' | 'put' | 'delete'> {
  readonly items = new Map<string, OutboxItem>();

  getAll(): Promise<OutboxItem[]> {
    return Promise.resolve([...this.items.values()].map((item) => ({ ...item })));
  }

  put(item: OutboxItem): Promise<void> {
    this.items.set(item.id, { ...item });
    return Promise.resolve();
  }

  delete(id: string): Promise<void> {
    this.items.delete(id);
    return Promise.resolve();
  }
}

export class FakeSharer implements FileSharer {
  readonly shared: SharedFile[][] = [];
  readonly downloads: SharedFile[][] = [];
  acceptZip = true;
  acceptFiles = true;
  result: ShareResult | 'throw' = 'shared';

  canShare(files: readonly SharedFile[]): boolean {
    const isZip = files.some((file) => file.mime === 'application/zip');
    return isZip ? this.acceptZip : this.acceptFiles;
  }

  share(files: readonly SharedFile[]): Promise<ShareResult> {
    if (this.result === 'throw') {
      return Promise.reject(new Error('not allowed'));
    }
    this.shared.push([...files]);
    return Promise.resolve(this.result);
  }

  download(files: readonly SharedFile[]): void {
    this.downloads.push([...files]);
  }
}

export function bytes(...values: number[]): Bytes {
  return new Uint8Array(values);
}

export function counter(prefix = 'id'): () => string {
  let next = 0;
  return () => `${prefix}-${++next}`;
}

/** A clock that only moves when told to. */
export class FakeClock {
  private current: number;

  constructor(iso: string) {
    this.current = new Date(iso).getTime();
  }

  now = (): Date => new Date(this.current);

  advanceDays(days: number): void {
    this.current += days * 24 * 60 * 60 * 1000;
  }
}
