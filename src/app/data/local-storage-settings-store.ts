import { Injectable } from '@angular/core';
import { SettingsStore } from '../domain/ports';
import { parseStoredRetention, serializeRetention, type Retention } from '../domain/retention';

const RETENTION_KEY = 'dailyplate-phone:sent-retention';

/** Keeps small preferences in localStorage. Outbox data never goes here (it lives in IndexedDB). */
@Injectable()
export class LocalStorageSettingsStore extends SettingsStore {
  override getSentRetention(): Retention {
    try {
      return parseStoredRetention(localStorage.getItem(RETENTION_KEY));
    } catch {
      return parseStoredRetention(null); // storage blocked (for example private browsing): use the default
    }
  }

  override setSentRetention(retention: Retention): void {
    try {
      localStorage.setItem(RETENTION_KEY, serializeRetention(retention));
    } catch {
      // The setting just will not survive a restart; nothing else depends on it.
    }
  }
}
