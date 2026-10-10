import { Injectable, computed, inject, signal } from '@angular/core';
import type { FoodDraft, MealEntryDraft, OutboxItem, PhotoDraft } from '../domain/models';
import { Outbox } from '../domain/outbox';

/** Sent items stay on the phone this many days so a failed hand-over can be repeated. */
export const SENT_KEEP_DAYS = 7;

/** The outbox as signals, for the pages to read. All changes go through the domain `Outbox`. */
@Injectable({ providedIn: 'root' })
export class OutboxState {
  private readonly outbox = inject(Outbox);
  private readonly all = signal<OutboxItem[]>([]);

  readonly loaded = signal(false);
  readonly recentNames = signal<string[]>([]);
  readonly pending = computed(() => this.all().filter((item) => item.status === 'pending'));
  readonly sent = computed(() => this.all().filter((item) => item.status === 'sent'));
  readonly pendingCount = computed(() => this.pending().length);

  /** Called once when the app starts: drop old sent items, then load everything. */
  async start(): Promise<void> {
    await this.outbox.purgeSent(SENT_KEEP_DAYS);
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
    await this.refresh();
  }
}
