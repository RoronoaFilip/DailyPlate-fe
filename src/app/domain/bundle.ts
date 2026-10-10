import { diaryCsv, diaryFileName, foodsCsv, groupByDate } from './csv';
import type { Bytes, FoodDraft, MealEntryDraft, OutboxItem } from './models';
import type { ZipEntry } from './zip';

export interface Bundle {
  zipName: string;
  entries: ZipEntry[];
  /** The outbox items that went into this bundle (to mark as sent afterwards). */
  itemIds: string[];
  counts: { photos: number; meals: number; foods: number };
}

const encoder = new TextEncoder();

function text(value: string): Bytes {
  return encoder.encode(value);
}

function photoName(position: number): string {
  return `photos/barcode-${String(position).padStart(3, '0')}.jpg`;
}

/**
 * Lay the items out the way the desktop app's zip rules expect: CSV files at the top level (one diary file
 * per day, named with its date) and all photos in one folder.
 */
export function buildBundle(items: readonly OutboxItem[], today: string): Bundle {
  const foods: FoodDraft[] = [];
  const meals: MealEntryDraft[] = [];
  const entries: ZipEntry[] = [];
  const photos: ZipEntry[] = [];
  for (const item of items) {
    if (item.kind === 'food') {
      foods.push(item.payload);
    } else if (item.kind === 'meal') {
      meals.push(item.payload);
    } else {
      photos.push({ name: photoName(photos.length + 1), data: item.payload.bytes });
    }
  }
  if (foods.length > 0) {
    entries.push({ name: 'foods.csv', data: text(foodsCsv(foods)) });
  }
  for (const [day, dayMeals] of groupByDate(meals)) {
    entries.push({ name: diaryFileName(day), data: text(diaryCsv(dayMeals)) });
  }
  entries.push(...photos);
  return {
    zipName: `dailyplate-${today}.zip`,
    entries,
    itemIds: items.map((item) => item.id),
    counts: { photos: photos.length, meals: meals.length, foods: foods.length },
  };
}
