import { describe, expect, it } from 'vitest';
import { defaultMealForHour, isValidIsoDate, toIsoDate } from './dates';
import { describeItem, formatBytes, kindLabel } from './describe';
import { fitWithin } from './photo';
import type { OutboxItem } from './models';
import { bytes } from './testing';

describe('dates', () => {
  it('formats the local day with zero padding', () => {
    expect(toIsoDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('accepts only real calendar days', () => {
    expect(isValidIsoDate('2026-10-05')).toBe(true);
    expect(isValidIsoDate('2024-02-29')).toBe(true);
    for (const bad of ['2026-02-30', '2026-13-01', '26-10-05', '', '2026-10-5']) {
      expect(isValidIsoDate(bad)).toBe(false);
    }
  });

  it('suggests a meal for the time of day', () => {
    expect([8, 12, 18, 23].map(defaultMealForHour)).toEqual(['Breakfast', 'Lunch', 'Dinner', 'Snacks']);
  });
});

describe('fitWithin', () => {
  it('scales the longer side down and keeps the shape', () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 });
  });

  it('never scales up and never reaches zero', () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(10000, 1, 1600)).toEqual({ width: 1600, height: 1 });
  });
});

describe('describeItem', () => {
  const base = { id: '1', createdAt: '2026-10-05T08:00:00.000Z', status: 'pending' as const };

  it('describes each kind in one line, with a word for its type', () => {
    const photo: OutboxItem = { ...base, kind: 'photo', payload: { name: 'p', mime: 'image/jpeg', bytes: bytes(1, 2) } };
    const meal: OutboxItem = {
      ...base, kind: 'meal', payload: { foodName: 'Oats', grams: 45, meal: 'Breakfast', date: '2026-10-05' },
    };
    expect(describeItem(photo)).toBe('Barcode photo (2 B)');
    expect(describeItem(meal)).toBe('Oats · 45 · Breakfast · 2026-10-05');
    expect([kindLabel(photo), kindLabel(meal)]).toEqual(['Photo', 'Meal']);
  });

  it('formats sizes', () => {
    expect([formatBytes(500), formatBytes(2048), formatBytes(3 * 1024 * 1024)]).toEqual(['500 B', '2 KB', '3.0 MB']);
  });
});
