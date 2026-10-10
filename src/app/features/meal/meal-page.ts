import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { OutboxState } from '../../data/outbox-state';
import { defaultMealForHour, toIsoDate } from '../../domain/dates';
import { MEALS } from '../../domain/models';
import { validateMeal, type MealField } from '../../domain/validation';
import { FormField } from '../../ui/form-field';
import { StatusMessage } from '../../ui/status-message';

interface Note {
  kind: 'ok' | 'error';
  text: string;
}

@Component({
  selector: 'app-meal-page',
  imports: [ReactiveFormsModule, FormField, StatusMessage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Log a meal</h1>
    <p class="lead">Type the food as you would say it. The computer app matches it to your foods and lets you check it.</p>
    <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <app-field label="Food" [error]="errors().foodName ?? null">
        <input formControlName="foodName" type="text" list="recent-foods" autocomplete="off"
               autocapitalize="sentences" enterkeyhint="next" />
      </app-field>
      <datalist id="recent-foods">
        @for (name of state.recentNames(); track name) {
          <option [value]="name"></option>
        }
      </datalist>
      <app-field label="Amount (grams, or number of items)" [error]="errors().grams ?? null">
        <input formControlName="grams" type="number" inputmode="decimal" step="any" min="0" enterkeyhint="done" />
      </app-field>
      <app-field label="Meal" [error]="errors().meal ?? null">
        <select formControlName="meal">
          @for (meal of meals; track meal) {
            <option [value]="meal">{{ meal }}</option>
          }
        </select>
      </app-field>
      <app-field label="Date" [error]="errors().date ?? null">
        <input formControlName="date" type="date" />
      </app-field>
      <button class="btn btn-primary btn-block" type="submit">Add to outbox</button>
    </form>
    @if (note(); as current) {
      <app-status [kind]="current.kind">{{ current.text }}</app-status>
    }
  `,
})
export class MealPage {
  protected readonly state = inject(OutboxState);
  protected readonly meals = MEALS;
  protected readonly errors = signal<Partial<Record<MealField, string>>>({});
  protected readonly note = signal<Note | null>(null);

  protected readonly form = new FormGroup({
    foodName: new FormControl('', { nonNullable: true }),
    grams: new FormControl<number | null>(null),
    meal: new FormControl(defaultMealForHour(new Date().getHours()) as string, { nonNullable: true }),
    date: new FormControl(toIsoDate(new Date()), { nonNullable: true }),
  });

  protected async submit(): Promise<void> {
    const result = validateMeal(this.form.getRawValue());
    if (!result.ok) {
      this.errors.set(result.errors);
      this.note.set({ kind: 'error', text: 'Please fix the fields marked with “!”.' });
      return;
    }
    this.errors.set({});
    await this.state.addMeal(result.value);
    this.form.patchValue({ foodName: '', grams: null });
    const { foodName, meal, date } = result.value;
    this.note.set({
      kind: 'ok',
      text: `Added ${foodName} to ${meal} on ${date}. ${this.state.pendingCount()} waiting to send.`,
    });
  }
}
