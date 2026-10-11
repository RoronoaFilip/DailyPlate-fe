import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { OutboxState } from '../../data/outbox-state';
import { describeItem, kindLabel } from '../../domain/describe';
import {
  DEFAULT_RETENTION_DAYS, MAX_RETENTION_DAYS, describeRetention, expiredSent, validateRetention,
} from '../../domain/retention';
import { FormField } from '../../ui/form-field';
import { StatusMessage } from '../../ui/status-message';

interface Note {
  kind: 'ok' | 'error' | 'info';
  text: string;
}

@Component({
  selector: 'app-sent-page',
  imports: [FormField, StatusMessage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Sent</h1>
    <p class="lead">
      Items you marked as sent. They stay here so you can send them again if something went wrong, until they are
      deleted below or by the keep-for setting.
    </p>

    @if (state.sent().length === 0) {
      <app-status>No sent items are being kept.</app-status>
    } @else {
      <ul class="list" aria-label="Already sent">
        @for (item of state.sent(); track item.id) {
          <li>
            <span class="tag">{{ kind(item) }}</span>
            <span class="list-text">{{ describe(item) }}</span>
            <button class="btn btn-small" type="button" (click)="remove(item.id)"
                    [attr.aria-label]="'Delete: ' + describe(item)">Delete</button>
          </li>
        }
      </ul>

      @if (confirmingDeleteAll()) {
        <div class="card" role="group" aria-label="Confirm deleting all sent items">
          <p>Delete all {{ state.sent().length }} sent items? This cannot be undone.</p>
          <div class="actions">
            <button class="btn btn-danger" type="button" (click)="deleteAll()">Yes, delete all</button>
            <button class="btn" type="button" (click)="confirmingDeleteAll.set(false)">Cancel</button>
          </div>
        </div>
      } @else {
        <button class="btn btn-block" type="button" (click)="confirmingDeleteAll.set(true)">
          Delete all {{ state.sent().length }} sent items
        </button>
      }
    }

    @if (note(); as current) {
      <app-status [kind]="current.kind">{{ current.text }}</app-status>
    }

    <h2>How long to keep sent items</h2>
    <p class="lead">{{ currentDescription() }}</p>
    <div class="settings">
      <label class="check">
        <input type="checkbox" [checked]="forever()" (change)="setForever($event)" />
        Keep them until I delete them
      </label>
      @if (!forever()) {
        <app-field label="Delete sent items after (days)"
                   [hint]="'0 deletes them as soon as they are marked as sent. Up to ' + maxDays + ' days.'"
                   [error]="daysError()">
          <input type="number" inputmode="numeric" step="1" min="0" [attr.max]="maxDays" [value]="days() ?? ''"
                 (input)="setDays($event)" />
        </app-field>
      }
      @if (deletesNow() > 0) {
        <app-status kind="info">Saving will delete {{ deletesNow() }} sent item(s) right now.</app-status>
      }
      <button class="btn btn-primary btn-block" type="button" [disabled]="!!daysError()" (click)="save()">
        Save
      </button>
    </div>
  `,
})
export class SentPage {
  protected readonly state = inject(OutboxState);
  protected readonly maxDays = MAX_RETENTION_DAYS;
  protected readonly describe = describeItem;
  protected readonly kind = kindLabel;

  protected readonly note = signal<Note | null>(null);
  protected readonly confirmingDeleteAll = signal(false);

  // The draft of the setting being edited; it only takes effect when Save is pressed.
  protected readonly forever = signal(this.state.retention() === null);
  protected readonly days = signal<number | null>(this.state.retention() ?? DEFAULT_RETENTION_DAYS);

  private readonly draft = computed(() => validateRetention({ forever: this.forever(), days: this.days() }));
  protected readonly currentDescription = computed(() => describeRetention(this.state.retention()));
  protected readonly daysError = computed(() => {
    const result = this.draft();
    return result.ok ? null : (result.errors.days ?? null);
  });
  /** How many sent items the draft setting would delete the moment it is saved. */
  protected readonly deletesNow = computed(() => {
    const result = this.draft();
    return result.ok ? expiredSent(this.state.sent(), result.value, new Date()).length : 0;
  });

  protected setForever(event: Event): void {
    this.forever.set((event.target as HTMLInputElement).checked);
  }

  protected setDays(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.days.set(input.value === '' ? null : input.valueAsNumber);
  }

  protected async remove(id: string): Promise<void> {
    await this.state.remove(id);
    this.confirmingDeleteAll.set(false);
    this.note.set({ kind: 'ok', text: 'Deleted.' });
  }

  protected async deleteAll(): Promise<void> {
    const removed = await this.state.removeAllSent();
    this.confirmingDeleteAll.set(false);
    this.note.set({ kind: 'ok', text: `${removed} sent item(s) deleted.` });
  }

  protected async save(): Promise<void> {
    const result = this.draft();
    if (!result.ok) {
      return;
    }
    const removed = await this.state.setRetention(result.value);
    this.note.set({
      kind: 'ok',
      text: `${describeRetention(result.value)}${removed > 0 ? ` ${removed} sent item(s) deleted.` : ''}`,
    });
  }
}
