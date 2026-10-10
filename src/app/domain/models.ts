/** Plain data the phone app captures. Everything here is framework-free. */

export const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'] as const;
export type Meal = (typeof MEALS)[number];

/** `g`: nutrient values are per 100 g. `count`: values are per single item. */
export type Basis = 'g' | 'count';

/** Bytes that are safe to hand to Blob/File constructors. */
export type Bytes = Uint8Array<ArrayBuffer>;

export interface FoodDraft {
  name: string;
  basis: Basis;
  calories: number;
  fat: number;
  carbohydrates: number;
  protein: number;
  saturatedFat: number | null;
  sugars: number | null;
  fiber: number | null;
  omega3: number | null;
  omega6: number | null;
}

export interface MealEntryDraft {
  foodName: string;
  /** Grams, or a number of items for foods counted per item. */
  grams: number;
  meal: Meal;
  /** Local calendar day, `YYYY-MM-DD`. */
  date: string;
}

export interface PhotoDraft {
  name: string;
  mime: 'image/jpeg';
  bytes: Bytes;
}

export type OutboxStatus = 'pending' | 'sent';

interface OutboxBase {
  id: string;
  createdAt: string;
  status: OutboxStatus;
  sentAt?: string;
}

export type OutboxItem =
  | (OutboxBase & { kind: 'photo'; payload: PhotoDraft })
  | (OutboxBase & { kind: 'meal'; payload: MealEntryDraft })
  | (OutboxBase & { kind: 'food'; payload: FoodDraft });

export type OutboxKind = OutboxItem['kind'];
