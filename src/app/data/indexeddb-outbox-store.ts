import { Injectable } from '@angular/core';
import type { OutboxItem } from '../domain/models';
import { OutboxStore } from '../domain/ports';

const DATABASE = 'dailyplate-phone';
const STORE = 'items';

/** Keeps the outbox in the browser's IndexedDB. Data stays on this phone until it is shared. */
@Injectable()
export class IndexedDbOutboxStore extends OutboxStore {
  private connection: Promise<IDBDatabase> | null = null;

  override getAll(): Promise<OutboxItem[]> {
    return this.run<OutboxItem[]>('readonly', (store) => store.getAll());
  }

  override async put(item: OutboxItem): Promise<void> {
    await this.run('readwrite', (store) => store.put(item));
  }

  override async delete(id: string): Promise<void> {
    await this.run('readwrite', (store) => store.delete(id));
  }

  private open(): Promise<IDBDatabase> {
    this.connection ??= new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DATABASE, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(STORE, { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return this.connection;
  }

  private async run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const database = await this.open();
    return new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(STORE, mode);
      const request = action(transaction.objectStore(STORE));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  }
}
