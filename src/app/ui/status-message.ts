import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** A message that says what happened in words and a symbol, so colour is never the only cue. */
@Component({
  selector: 'app-status',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="status" [class.status-ok]="kind() === 'ok'" [class.status-error]="kind() === 'error'"
       [attr.role]="kind() === 'error' ? 'alert' : 'status'">
      <span aria-hidden="true">{{ symbol() }}</span>
      <span class="status-text"><ng-content /></span>
    </p>
  `,
})
export class StatusMessage {
  readonly kind = input<'ok' | 'error' | 'info'>('info');
  protected readonly symbol = computed(() => (this.kind() === 'ok' ? '✓' : this.kind() === 'error' ? '!' : 'i'));
}
