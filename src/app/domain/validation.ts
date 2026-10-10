import { isValidIsoDate } from './dates';
import { MEALS, type Basis, type FoodDraft, type Meal, type MealEntryDraft } from './models';

export type Validation<T, K extends string> =
  | { ok: true; value: T }
  | { ok: false; errors: Partial<Record<K, string>> };

const MAX_NAME = 120;
const MAX_AMOUNT = 100_000;

function cleanName(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export type MealField = 'foodName' | 'grams' | 'meal' | 'date';

export interface MealForm {
  foodName: string;
  grams: number | null;
  meal: string;
  date: string;
}

export function validateMeal(form: MealForm): Validation<MealEntryDraft, MealField> {
  const errors: Partial<Record<MealField, string>> = {};
  const foodName = cleanName(form.foodName ?? '');
  if (!foodName) {
    errors.foodName = 'Enter the food name.';
  } else if (foodName.length > MAX_NAME) {
    errors.foodName = `Keep the name under ${MAX_NAME} characters.`;
  }
  if (!isNumber(form.grams) || form.grams <= 0) {
    errors.grams = 'Enter an amount greater than 0.';
  } else if (form.grams > MAX_AMOUNT) {
    errors.grams = 'That amount is too large.';
  }
  if (!(MEALS as readonly string[]).includes(form.meal)) {
    errors.meal = 'Choose Breakfast, Lunch, Dinner or Snacks.';
  }
  if (!isValidIsoDate(form.date)) {
    errors.date = 'Choose a valid date.';
  }
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    value: { foodName, grams: form.grams as number, meal: form.meal as Meal, date: form.date },
  };
}

export type FoodField =
  | 'name' | 'basis' | 'calories' | 'fat' | 'carbohydrates' | 'protein'
  | 'saturatedFat' | 'sugars' | 'fiber' | 'omega3' | 'omega6';

export interface FoodForm {
  name: string;
  basis: string;
  calories: number | null;
  fat: number | null;
  carbohydrates: number | null;
  protein: number | null;
  saturatedFat: number | null;
  sugars: number | null;
  fiber: number | null;
  omega3: number | null;
  omega6: number | null;
}

const REQUIRED_NUMBERS = [
  ['calories', 'Calories'],
  ['protein', 'Protein'],
  ['fat', 'Fat'],
  ['carbohydrates', 'Carbohydrates'],
] as const;
const OPTIONAL_NUMBERS = ['saturatedFat', 'sugars', 'fiber', 'omega3', 'omega6'] as const;

export function validateFood(form: FoodForm): Validation<FoodDraft, FoodField> {
  const errors: Partial<Record<FoodField, string>> = {};
  const name = cleanName(form.name ?? '');
  if (!name) {
    errors.name = 'Enter the food name.';
  } else if (name.length > MAX_NAME) {
    errors.name = `Keep the name under ${MAX_NAME} characters.`;
  }
  if (form.basis !== 'g' && form.basis !== 'count') {
    errors.basis = 'Choose per 100 g or per item.';
  }
  for (const [field, label] of REQUIRED_NUMBERS) {
    const value = form[field];
    if (!isNumber(value)) {
      errors[field] = `${label} is required.`;
    } else if (value < 0 || value > MAX_AMOUNT) {
      errors[field] = `${label} must be 0 or more.`;
    }
  }
  for (const field of OPTIONAL_NUMBERS) {
    const value = form[field];
    if (value !== null && value !== undefined && (!isNumber(value) || value < 0 || value > MAX_AMOUNT)) {
      errors[field] = 'Leave this empty or enter 0 or more.';
    }
  }
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  const optional = (value: number | null | undefined): number | null => (isNumber(value) ? value : null);
  return {
    ok: true,
    value: {
      name,
      basis: form.basis as Basis,
      calories: form.calories as number,
      fat: form.fat as number,
      carbohydrates: form.carbohydrates as number,
      protein: form.protein as number,
      saturatedFat: optional(form.saturatedFat),
      sugars: optional(form.sugars),
      fiber: optional(form.fiber),
      omega3: optional(form.omega3),
      omega6: optional(form.omega6),
    },
  };
}
