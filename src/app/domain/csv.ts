import type { FoodDraft, MealEntryDraft } from './models';

/**
 * The CSV formats the Daily Plate desktop app already imports. The headers must match its importers exactly
 * (see fixtures/ and the desktop app's import help page).
 */
export const FOODS_HEADER = [
  'food_name', 'basis', 'calories', 'fat', 'saturated_fat', 'carbohydrates',
  'sugars', 'protein', 'fiber', 'omega_3', 'omega_6',
] as const;
export const DIARY_HEADER = ['food_name', 'grams_eaten', 'meal'] as const;

const BOM = '\uFEFF';
const NEWLINE = '\r\n';

/** Quote a cell when it holds a delimiter the desktop app might detect, a quote, or a line break. */
export function csvCell(value: string): string {
  return /[",;|\t\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

/** Numbers are written with a dot and without trailing zeros (`1.50` becomes `1.5`). */
export function csvNumber(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return '';
  }
  return String(parseFloat(value.toFixed(3)));
}

function toCsv(header: readonly string[], rows: readonly (readonly string[])[]): string {
  const lines = [header, ...rows].map((row) => row.map(csvCell).join(','));
  return BOM + lines.join(NEWLINE) + NEWLINE;
}

export function foodsCsv(foods: readonly FoodDraft[]): string {
  return toCsv(
    FOODS_HEADER,
    foods.map((food) => [
      food.name.trim(),
      food.basis,
      csvNumber(food.calories),
      csvNumber(food.fat),
      csvNumber(food.saturatedFat),
      csvNumber(food.carbohydrates),
      csvNumber(food.sugars),
      csvNumber(food.protein),
      csvNumber(food.fiber),
      csvNumber(food.omega3),
      csvNumber(food.omega6),
    ]),
  );
}

export function diaryCsv(entries: readonly MealEntryDraft[]): string {
  return toCsv(
    DIARY_HEADER,
    entries.map((entry) => [entry.foodName.trim(), csvNumber(entry.grams), entry.meal]),
  );
}

/** The desktop app reads the date from this name: `diary-YYYY-MM-DD.csv`. */
export function diaryFileName(date: string): string {
  return `diary-${date}.csv`;
}

/** Entries grouped by day, days in order, entries in the order they were added. */
export function groupByDate(entries: readonly MealEntryDraft[]): [string, MealEntryDraft[]][] {
  const days = new Map<string, MealEntryDraft[]>();
  for (const entry of entries) {
    const day = days.get(entry.date);
    if (day) {
      day.push(entry);
    } else {
      days.set(entry.date, [entry]);
    }
  }
  return [...days.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
}
