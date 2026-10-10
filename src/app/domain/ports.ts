import type { Bytes, OutboxItem } from './models';

/**
 * Ports: what the domain needs from the outside world. The `data` layer provides the real adapters;
 * tests provide in-memory ones. They are abstract classes so Angular can use them as injection tokens.
 */

/** Where the outbox keeps its items (IndexedDB in the app). */
export abstract class OutboxStore {
  abstract getAll(): Promise<OutboxItem[]>;
  abstract put(item: OutboxItem): Promise<void>;
  abstract delete(id: string): Promise<void>;
}

/** Turns a camera picture into a small JPEG. */
export abstract class PhotoShrinker {
  abstract toJpeg(file: Blob, maxSide: number): Promise<Bytes>;
}

export interface SharedFile {
  name: string;
  mime: string;
  bytes: Bytes;
}

export type ShareResult = 'shared' | 'cancelled';

/** The phone's share sheet (and a download fallback). */
export abstract class FileSharer {
  abstract canShare(files: readonly SharedFile[]): boolean;
  abstract share(files: readonly SharedFile[], title: string): Promise<ShareResult>;
  abstract download(files: readonly SharedFile[]): void;
}
