import { describe, expect, it } from 'vitest';
import { buildBundle } from './bundle';
import type { OutboxItem } from './models';
import { bytes } from './testing';

const base = { createdAt: '2026-10-05T08:00:00.000Z', status: 'pending' as const };
const items: OutboxItem[] = [
  { ...base, id: '1', kind: 'meal', payload: { foodName: 'Oats', grams: 45, meal: 'Breakfast', date: '2026-10-05' } },
  { ...base, id: '2', kind: 'photo', payload: { name: 'a', mime: 'image/jpeg', bytes: bytes(1, 2) } },
  { ...base, id: '3', kind: 'meal', payload: { foodName: 'Milk', grams: 200, meal: 'Lunch', date: '2026-10-06' } },
  {
    ...base, id: '4', kind: 'food',
    payload: {
      name: 'Rice', basis: 'g', calories: 130, fat: 0.3, carbohydrates: 28, protein: 2.7,
      saturatedFat: 0.1, sugars: 0.1, fiber: 0.4, omega3: null, omega6: null,
    },
  },
  { ...base, id: '5', kind: 'photo', payload: { name: 'b', mime: 'image/jpeg', bytes: bytes(3) } },
];

describe('buildBundle', () => {
  it('puts CSV files at the top level and all photos in one folder', () => {
    const bundle = buildBundle(items, '2026-10-10');
    expect(bundle.zipName).toBe('dailyplate-2026-10-10.zip');
    expect(bundle.entries.map((entry) => entry.name)).toEqual([
      'foods.csv',
      'diary-2026-10-05.csv',
      'diary-2026-10-06.csv',
      'photos/barcode-001.jpg',
      'photos/barcode-002.jpg',
    ]);
  });

  it('follows the desktop zip rules: at most one folder, and it is photos/', () => {
    const folders = new Set(
      buildBundle(items, '2026-10-10').entries.filter((e) => e.name.includes('/')).map((e) => e.name.split('/')[0]),
    );
    expect([...folders]).toEqual(['photos']);
  });

  it('writes one diary file per day with only that day\'s meals', () => {
    const bundle = buildBundle(items, '2026-10-10');
    const day = new TextDecoder().decode(bundle.entries.find((e) => e.name === 'diary-2026-10-06.csv')!.data);
    expect(day).toContain('Milk,200,Lunch');
    expect(day).not.toContain('Oats');
  });

  it('counts what went in and remembers the item ids', () => {
    const bundle = buildBundle(items, '2026-10-10');
    expect(bundle.counts).toEqual({ photos: 2, meals: 2, foods: 1 });
    expect(bundle.itemIds).toEqual(['1', '2', '3', '4', '5']);
  });

  it('leaves out files for kinds that are absent', () => {
    const onlyPhotos = buildBundle(items.filter((item) => item.kind === 'photo'), '2026-10-10');
    expect(onlyPhotos.entries.map((entry) => entry.name)).toEqual(['photos/barcode-001.jpg', 'photos/barcode-002.jpg']);
    expect(buildBundle([], '2026-10-10').entries).toEqual([]);
  });
});
