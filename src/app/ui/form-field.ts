import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** A label around one form control, with an optional hint and an error message in words. */
@Component({
  selector: 'app-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="field">
      <span class="field-label">{{ label() }}@if (optional()) {<span class="field-hint"> (optional)</span>}</span>
      <ng-content />
      @if (hint()) {
        <span class="field-hint">{{ hint() }}</span>
      }
      @if (error()) {
        <span class="field-error" role="alert">! {{ error() }}</span>
      }
    </label>
  `,
})
export class FormField {
  readonly label = input.required<string>();
  readonly hint = input<string | null>(null);
  readonly error = input<string | null>(null);
  readonly optional = input(false);
}
