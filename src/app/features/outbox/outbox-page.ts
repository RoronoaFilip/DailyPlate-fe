import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { OutboxState } from '../../data/outbox-state';
import { buildBundle } from '../../domain/bundle';
import { toIsoDate } from '../../domain/dates';
import { describeItem, kindLabel } from '../../domain/describe';
import { FileSharer } from '../../domain/ports';
import { sendBundle, type SendOutcome } from '../../domain/send';
import { StatusMessage } from '../../ui/status-message';

interface Note {
  kind: 'ok' | 'error' | 'info';
  text: string;
}

const OUTCOME_TEXT: Record<Exclude<SendOutcome, 'cancelled'>, string> = {
  'shared-zip': 'Shared as one zip file.',
  'shared-files':
    'This phone would not share a zip, so the CSV files and photos were shared as separate files instead.',
  downloaded:
    'Sharing was not possible, so the zip was saved to your phone. Open the Files app, find it in Downloads and share it from there.',
};

@Component({
  selector: 'app-outbox-page',
  imports: [StatusMessage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Outbox</h1>
    <p class="lead">
      Everything waiting to go to your computer. Tap Send, choose Messenger, then open the file on your computer and
      drop it anywhere in the Daily Plate app.
    </p>

    @if (state.pending().length === 0) {
      <app-status>Nothing is waiting. Add a photo, a meal or a new food first.</app-status>
    } @else {
      <ul class="list" aria-label="Waiting to send">
        @for (item of state.pending(); track item.id) {
          <li>
            <span class="tag">{{ kind(item) }}</span>
            <span class="list-text">{{ describe(item) }}</span>
            <button class="btn btn-small" type="button" (click)="remove(item.id)"
                    [attr.aria-label]="'Delete: ' + describe(item)">Delete</button>
          </li>
        }
      </ul>
    }

    @if (state.sent().length > 0) {
      <label class="check">
        <input type="checkbox" [checked]="includeSent()" (change)="toggleSent($event)" />
        Send the {{ state.sent().length }} item(s) sent before again too
      </label>
    }

    <button class="btn btn-primary btn-block" type="button" [disabled]="sending() || toSend().length === 0"
            (click)="send()">
      Send {{ toSend().length }} item(s)
    </button>

    @if (note(); as current) {
      <app-status [kind]="current.kind">{{ current.text }}</app-status>
    }

    @if (awaitingConfirm(); as ids) {
      <div class="card" role="group" aria-label="Confirm sending">
        <p>Did it reach your computer's Messenger?</p>
        <div class="actions">
          <button class="btn btn-primary" type="button" (click)="confirm(ids)">Yes, mark as sent</button>
          <button class="btn" type="button" (click)="keep()">No, keep them waiting</button>
        </div>
      </div>
    }

    @if (state.sent().length > 0) {
      <h2>Already sent (kept for 7 days)</h2>
      <ul class="list list-muted" aria-label="Already sent">
        @for (item of state.sent(); track item.id) {
          <li><span class="tag">{{ kind(item) }}</span><span class="list-text">{{ describe(item) }}</span></li>
        }
      </ul>
    }
  `,
})
export class OutboxPage {
  protected readonly state = inject(OutboxState);
  private readonly sharer = inject(FileSharer);

  protected readonly includeSent = signal(false);
  protected readonly sending = signal(false);
  protected readonly note = signal<Note | null>(null);
  protected readonly awaitingConfirm = signal<string[] | null>(null);
  protected readonly toSend = computed(() =>
    this.includeSent() ? [...this.state.pending(), ...this.state.sent()] : this.state.pending(),
  );

  protected readonly describe = describeItem;
  protected readonly kind = kindLabel;

  protected toggleSent(event: Event): void {
    this.includeSent.set((event.target as HTMLInputElement).checked);
  }

  protected remove(id: string): Promise<void> {
    return this.state.remove(id);
  }

  /** Nothing is awaited before `sendBundle` starts: the phone only opens the share sheet right after a tap. */
  protected async send(): Promise<void> {
    const items = this.toSend();
    if (items.length === 0) {
      return;
    }
    this.sending.set(true);
    this.note.set(null);
    this.awaitingConfirm.set(null);
    try {
      const bundle = buildBundle(items, toIsoDate(new Date()));
      const outcome = await sendBundle(bundle, this.sharer);
      if (outcome === 'cancelled') {
        this.note.set({ kind: 'info', text: 'Nothing was sent. Your items are still waiting.' });
      } else {
        this.note.set({ kind: 'ok', text: OUTCOME_TEXT[outcome] });
        const pendingIds = items.filter((item) => item.status === 'pending').map((item) => item.id);
        this.awaitingConfirm.set(pendingIds.length > 0 ? pendingIds : null);
      }
    } catch {
      this.note.set({ kind: 'error', text: 'Something went wrong while preparing the files. Nothing was changed.' });
    } finally {
      this.sending.set(false);
    }
  }

  protected async confirm(ids: readonly string[]): Promise<void> {
    await this.state.markSent(ids);
    this.awaitingConfirm.set(null);
    this.note.set({ kind: 'ok', text: `${ids.length} item(s) marked as sent.` });
  }

  protected keep(): void {
    this.awaitingConfirm.set(null);
    this.note.set({ kind: 'info', text: 'Kept. They are still waiting in the outbox.' });
  }
}
