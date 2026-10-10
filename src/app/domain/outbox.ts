import type {
  FoodDraft, MealEntryDraft, OutboxItem, OutboxStatus, PhotoDraft,
} from './models';
import type { OutboxStore } from './ports';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The phone's queue of things to send to the computer. Items stay here (as `sent`) for a few days after
 * sending so a failed hand-over can be repeated.
 */
export class Outbox {
  private readonly store: OutboxStore;
  private readonly newId: () => string;
  private readonly now: () => Date;

  constructor(store: OutboxStore, newId: () => string, now: () => Date) {
    this.store = store;
    this.newId = newId;
    this.now = now;
  }

  addPhoto(payload: PhotoDraft): Promise<OutboxItem> {
    return this.add({ ...this.base(), kind: 'photo', payload });
  }

  addMeal(payload: MealEntryDraft): Promise<OutboxItem> {
    return this.add({ ...this.base(), kind: 'meal', payload });
  }

  addFood(payload: FoodDraft): Promise<OutboxItem> {
    return this.add({ ...this.base(), kind: 'food', payload });
  }

  /** Items oldest first, optionally only those with the given status. */
  async list(status?: OutboxStatus): Promise<OutboxItem[]> {
    const items = await this.store.getAll();
    return items
      .filter((item) => status === undefined || item.status === status)
      .sort((a, b) => (a.createdAt === b.createdAt ? a.id.localeCompare(b.id) : a.createdAt < b.createdAt ? -1 : 1));
  }

  remove(id: string): Promise<void> {
    return this.store.delete(id);
  }

  async markSent(ids: readonly string[]): Promise<void> {
    const wanted = new Set(ids);
    const sentAt = this.now().toISOString();
    for (const item of await this.store.getAll()) {
      if (wanted.has(item.id)) {
        await this.store.put({ ...item, status: 'sent', sentAt });
      }
    }
  }

  /** Remove sent items older than `olderThanDays`; returns how many were removed. */
  async purgeSent(olderThanDays: number): Promise<number> {
    const cutoff = this.now().getTime() - olderThanDays * DAY_MS;
    let removed = 0;
    for (const item of await this.store.getAll()) {
      if (item.status === 'sent' && item.sentAt !== undefined && new Date(item.sentAt).getTime() < cutoff) {
        await this.store.delete(item.id);
        removed++;
      }
    }
    return removed;
  }

  /** Food names typed before (newest first, no repeats ignoring case), for suggestions. */
  async recentFoodNames(limit = 30): Promise<string[]> {
    const items = (await this.list()).reverse();
    const seen = new Set<string>();
    const names: string[] = [];
    for (const item of items) {
      const name = item.kind === 'meal' ? item.payload.foodName : item.kind === 'food' ? item.payload.name : null;
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        names.push(name);
        if (names.length >= limit) {
          break;
        }
      }
    }
    return names;
  }

  private base(): { id: string; createdAt: string; status: 'pending' } {
    return { id: this.newId(), createdAt: this.now().toISOString(), status: 'pending' };
  }

  private async add(item: OutboxItem): Promise<OutboxItem> {
    await this.store.put(item);
    return item;
  }
}
