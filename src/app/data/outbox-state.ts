import { Injectable, computed, inject, signal } from '@angular/core';
import type { FoodDraft, MealEntryDraft, OutboxItem, PhotoDraft } from '../domain/models';
import { Outbox } from '../domain/outbox';
import { SettingsStore } from '../domain/ports';
import type { Retention } from '../domain/retention';

/** The outbox as signals, for the pages to read. All changes go through the domain `Outbox`. */
@Injectable({ providedIn: 'root' })
export class OutboxState {
  private readonly outbox = inject(Outbox);
  private readonly settings = inject(SettingsStore);
  private readonly all = signal<OutboxItem[]>([]);

  readonly loaded = signal(false);
  readonly recentNames = signal<string[]>([]);
  /** How long sent items are kept; the person can change it on the Sent page. */
  readonly retention = signal<Retention>(this.settings.getSentRetention());
  readonly pending = computed(() => this.all().filter((item) => item.status === 'pending'));
  readonly sent = computed(() => this.all().filter((item) => item.status === 'sent'));
  readonly pendingCount = computed(() => this.pending().length);

  /** Called once when the app starts: drop sent items older than the retention, then load everything. */
  async start(): Promise<void> {
    await this.outbox.purgeSent(this.retention());
    await this.refresh();
  }

  async refresh(): Promise<void> {
    this.all.set(await this.outbox.list());
    this.recentNames.set(await this.outbox.recentFoodNames());
    this.loaded.set(true);
  }

  async addPhoto(photo: PhotoDraft): Promise<void> {
    await this.outbox.addPhoto(photo);
    await this.refresh();
  }

  async addMeal(meal: MealEntryDraft): Promise<void> {
    await this.outbox.addMeal(meal);
    await this.refresh();
  }

  async addFood(food: FoodDraft): Promise<void> {
    await this.outbox.addFood(food);
    await this.refresh();
  }

  async remove(id: string): Promise<void> {
    await this.outbox.remove(id);
    await this.refresh();
  }

  async markSent(ids: readonly string[]): Promise<void> {
    await this.outbox.markSent(ids);
    await this.outbox.purgeSent(this.retention()); // matters for a retention of 0 days
    await this.refresh();
  }

  /** Delete every sent item; returns how many were deleted. */
  async removeAllSent(): Promise<number> {
    const removed = await this.outbox.removeAllSent();
    await this.refresh();
    return removed;
  }

  /** Save a new retention and apply it right away; returns how many sent items it deleted. */
  async setRetention(retention: Retention): Promise<number> {
    this.settings.setSentRetention(retention);
    this.retention.set(retention);
    const removed = await this.outbox.purgeSent(retention);
    await this.refresh();
    return removed;
  }
}
