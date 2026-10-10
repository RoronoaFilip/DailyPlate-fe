import { describe, expect, it } from 'vitest';
import { validateFood, validateMeal, type FoodForm, type MealForm } from './validation';

const goodMeal: MealForm = { foodName: '  Oats  ', grams: 45.5, meal: 'Breakfast', date: '2026-10-05' };
const goodFood: FoodForm = {
  name: 'Oats', basis: 'g', calories: 380, fat: 7, carbohydrates: 60, protein: 13,
  saturatedFat: 1, sugars: 1, fiber: 10, omega3: null, omega6: null,
};

describe('validateMeal', () => {
  it('accepts a good entry and tidies the name', () => {
    const result = validateMeal(goodMeal);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ foodName: 'Oats', grams: 45.5, meal: 'Breakfast', date: '2026-10-05' });
    }
  });

  it('explains every problem at once', () => {
    const result = validateMeal({ foodName: ' ', grams: 0, meal: 'Brunch', date: '2026-02-30' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.errors).sort()).toEqual(['date', 'foodName', 'grams', 'meal']);
    }
  });

  it('rejects missing and absurd amounts', () => {
    for (const grams of [null, -1, Number.NaN, 1_000_000]) {
      expect(validateMeal({ ...goodMeal, grams }).ok).toBe(false);
    }
  });
});

describe('validateFood', () => {
  it('accepts a food and turns the empty optional omega values into null', () => {
    const result = validateFood(goodFood);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.fiber).toBe(10);
      expect(result.value.saturatedFat).toBe(1);
      expect(result.value.omega3).toBeNull();
      expect(result.value.omega6).toBeNull();
    }
  });

  it('requires a name, a basis and all seven main nutrients', () => {
    const result = validateFood({
      ...goodFood, name: '', basis: 'x', calories: null, protein: null, saturatedFat: null, sugars: null, fiber: null,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.errors).sort()).toEqual([
        'basis', 'calories', 'fiber', 'name', 'protein', 'saturatedFat', 'sugars',
      ]);
    }
  });

  it('asks for saturated fat, sugars and fibre by name, and accepts 0 for each', () => {
    for (const field of ['saturatedFat', 'sugars', 'fiber'] as const) {
      const missing = validateFood({ ...goodFood, [field]: null });
      expect(missing.ok).toBe(false);
      expect(validateFood({ ...goodFood, [field]: 0 }).ok).toBe(true);
    }
  });

  it('accepts zero and rejects negative nutrients', () => {
    expect(validateFood({ ...goodFood, fat: 0 }).ok).toBe(true);
    expect(validateFood({ ...goodFood, fat: -1 }).ok).toBe(false);
    expect(validateFood({ ...goodFood, omega3: -0.5 }).ok).toBe(false);
  });
});
