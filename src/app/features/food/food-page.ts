import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { OutboxState } from '../../data/outbox-state';
import { validateFood, type FoodField } from '../../domain/validation';
import { FormField } from '../../ui/form-field';
import { StatusMessage } from '../../ui/status-message';

interface Note {
  kind: 'ok' | 'error';
  text: string;
}

const numberControl = () => new FormControl<number | null>(null);

@Component({
  selector: 'app-food-page',
  imports: [ReactiveFormsModule, FormField, StatusMessage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>New food</h1>
    <p class="lead">Add a food that is not in the computer app yet. Values are as printed on the label.</p>
    <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <app-field label="Food name" [error]="errors().name ?? null">
        <input formControlName="name" type="text" autocomplete="off" autocapitalize="sentences" />
      </app-field>
      <fieldset class="choice">
        <legend>The values below are</legend>
        <label><input type="radio" formControlName="basis" value="g" /> per 100 g</label>
        <label><input type="radio" formControlName="basis" value="count" /> per item</label>
      </fieldset>
      @if (errors().basis; as problem) {
        <p class="field-error" role="alert">! {{ problem }}</p>
      }
      <app-field label="Calories (kcal)" [error]="errors().calories ?? null">
        <input formControlName="calories" type="number" inputmode="decimal" step="any" min="0" />
      </app-field>
      <app-field label="Protein (g)" [error]="errors().protein ?? null">
        <input formControlName="protein" type="number" inputmode="decimal" step="any" min="0" />
      </app-field>
      <app-field label="Fat (g)" [error]="errors().fat ?? null">
        <input formControlName="fat" type="number" inputmode="decimal" step="any" min="0" />
      </app-field>
      <app-field label="Carbohydrates (g)" [error]="errors().carbohydrates ?? null">
        <input formControlName="carbohydrates" type="number" inputmode="decimal" step="any" min="0" />
      </app-field>
      <details>
        <summary>More nutrients (optional)</summary>
        <app-field label="Saturated fat (g)" [optional]="true" [error]="errors().saturatedFat ?? null">
          <input formControlName="saturatedFat" type="number" inputmode="decimal" step="any" min="0" />
        </app-field>
        <app-field label="Sugars (g)" [optional]="true" [error]="errors().sugars ?? null">
          <input formControlName="sugars" type="number" inputmode="decimal" step="any" min="0" />
        </app-field>
        <app-field label="Fibre (g)" [optional]="true" [error]="errors().fiber ?? null">
          <input formControlName="fiber" type="number" inputmode="decimal" step="any" min="0" />
        </app-field>
        <app-field label="Omega-3 (g)" [optional]="true" [error]="errors().omega3 ?? null">
          <input formControlName="omega3" type="number" inputmode="decimal" step="any" min="0" />
        </app-field>
        <app-field label="Omega-6 (g)" [optional]="true" [error]="errors().omega6 ?? null">
          <input formControlName="omega6" type="number" inputmode="decimal" step="any" min="0" />
        </app-field>
      </details>
      <button class="btn btn-primary btn-block" type="submit">Add to outbox</button>
    </form>
    @if (note(); as current) {
      <app-status [kind]="current.kind">{{ current.text }}</app-status>
    }
  `,
})
export class FoodPage {
  private readonly state = inject(OutboxState);
  protected readonly errors = signal<Partial<Record<FoodField, string>>>({});
  protected readonly note = signal<Note | null>(null);

  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true }),
    basis: new FormControl('g', { nonNullable: true }),
    calories: numberControl(),
    protein: numberControl(),
    fat: numberControl(),
    carbohydrates: numberControl(),
    saturatedFat: numberControl(),
    sugars: numberControl(),
    fiber: numberControl(),
    omega3: numberControl(),
    omega6: numberControl(),
  });

  protected async submit(): Promise<void> {
    const result = validateFood(this.form.getRawValue());
    if (!result.ok) {
      this.errors.set(result.errors);
      this.note.set({ kind: 'error', text: 'Please fix the fields marked with “!”.' });
      return;
    }
    this.errors.set({});
    await this.state.addFood(result.value);
    this.form.reset({ basis: result.value.basis });
    this.note.set({
      kind: 'ok',
      text: `Added ${result.value.name}. ${this.state.pendingCount()} waiting to send.`,
    });
  }
}
