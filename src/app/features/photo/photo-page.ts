import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { OutboxState } from '../../data/outbox-state';
import { PhotoShrinker } from '../../domain/ports';
import { PHOTO_MAX_SIDE } from '../../domain/photo';
import { StatusMessage } from '../../ui/status-message';

interface Note {
  kind: 'ok' | 'error';
  text: string;
}

@Component({
  selector: 'app-photo-page',
  imports: [StatusMessage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Barcode photo</h1>
    <p class="lead">
      Take a clear, well-lit photo of a product's barcode. The Daily Plate app on your computer reads the
      barcode later and looks the product up.
    </p>
    <div class="actions">
      <button class="btn btn-primary" type="button" [disabled]="busy()" (click)="camera.click()">Take a photo</button>
      <button class="btn" type="button" [disabled]="busy()" (click)="library.click()">Choose from photos</button>
    </div>
    <input #camera hidden type="file" accept="image/*" capture="environment" (change)="chosen($event)" />
    <input #library hidden type="file" accept="image/*" multiple (change)="chosen($event)" />
    @if (busy()) {
      <app-status>Preparing the photo…</app-status>
    }
    @if (note(); as current) {
      <app-status [kind]="current.kind">{{ current.text }}</app-status>
    }
  `,
})
export class PhotoPage {
  private readonly state = inject(OutboxState);
  private readonly shrinker = inject(PhotoShrinker);

  protected readonly busy = signal(false);
  protected readonly note = signal<Note | null>(null);

  protected async chosen(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (files.length === 0) {
      return;
    }
    this.busy.set(true);
    this.note.set(null);
    let added = 0;
    for (const file of files) {
      try {
        const bytes = await this.shrinker.toJpeg(file, PHOTO_MAX_SIDE);
        await this.state.addPhoto({ name: file.name || 'barcode', mime: 'image/jpeg', bytes });
        added++;
      } catch {
        // counted below
      }
    }
    this.busy.set(false);
    const failed = files.length - added;
    if (added > 0 && failed === 0) {
      this.note.set({
        kind: 'ok',
        text: `${added === 1 ? 'Photo' : added + ' photos'} added. ${this.state.pendingCount()} waiting to send.`,
      });
    } else {
      this.note.set({
        kind: 'error',
        text: `${failed === 1 ? 'A photo' : failed + ' photos'} could not be prepared${added > 0 ? ` (${added} added)` : ''}. Try again.`,
      });
    }
  }
}
