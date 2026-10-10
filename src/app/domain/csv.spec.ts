import { describe, expect, it } from 'vitest';
import { csvCell, csvNumber, diaryCsv, diaryFileName, DIARY_HEADER, foodsCsv, FOODS_HEADER, groupByDate } from './csv';
import type { FoodDraft, MealEntryDraft } from './models';

const oats: FoodDraft = {
  name: 'Oats', basis: 'g', calories: 380, fat: 7, carbohydrates: 60, protein: 13,
  saturatedFat: 1, sugars: 1, fiber: 10, omega3: 0.1, omega6: 1.2,
};

describe('csv', () => {
  it('uses exactly the headers the desktop app imports', () => {
    expect(FOODS_HEADER.join(',')).toBe(
      'food_name,basis,calories,fat,saturated_fat,carbohydrates,sugars,protein,fiber,omega_3,omega_6',
    );
    expect(DIARY_HEADER.join(',')).toBe('food_name,grams_eaten,meal');
  });

  it('writes a foods file with a BOM, CRLF line ends and one row per food', () => {
    const text = foodsCsv([oats]);
    expect(text.startsWith('\uFEFFfood_name,basis,')).toBe(true);
    expect(text.split('\r\n')).toEqual([
      '\uFEFF' + FOODS_HEADER.join(','),
      'Oats,g,380,7,1,60,1,13,10,0.1,1.2',
      '',
    ]);
  });

  it('leaves the optional omega fibres as empty cells, never zeros', () => {
    const food: FoodDraft = { ...oats, omega3: null, omega6: null };
    expect(foodsCsv([food]).split('\r\n')[1]).toBe('Oats,g,380,7,1,60,1,13,10,,');
  });

  it('writes a required nutrient that is zero as 0', () => {
    const food: FoodDraft = { ...oats, saturatedFat: 0, sugars: 0, fiber: 0 };
    expect(foodsCsv([food]).split('\r\n')[1]).toBe('Oats,g,380,7,0,60,0,13,0,0.1,1.2');
  });

  it('writes a diary file', () => {
    const entry: MealEntryDraft = { foodName: ' Oats ', grams: 45.5, meal: 'Breakfast', date: '2026-10-05' };
    expect(diaryCsv([entry]).split('\r\n')).toEqual(['\uFEFFfood_name,grams_eaten,meal', 'Oats,45.5,Breakfast', '']);
  });

  it('quotes cells that hold delimiters, quotes or line breaks', () => {
    expect(csvCell('Oats, rolled')).toBe('"Oats, rolled"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('a;b')).toBe('"a;b"');
    expect(csvCell('line\nbreak')).toBe('"line\nbreak"');
    expect(csvCell('plain')).toBe('plain');
  });

  it('writes numbers with a dot and without trailing zeros', () => {
    expect(csvNumber(1.5)).toBe('1.5');
    expect(csvNumber(380)).toBe('380');
    expect(csvNumber(0.1 + 0.2)).toBe('0.3');
    expect(csvNumber(null)).toBe('');
    expect(csvNumber(Number.NaN)).toBe('');
  });

  it('names diary files with their date', () => {
    expect(diaryFileName('2026-10-05')).toBe('diary-2026-10-05.csv');
  });

  it('groups entries by day in date order, keeping entry order within a day', () => {
    const make = (foodName: string, date: string): MealEntryDraft => ({ foodName, grams: 1, meal: 'Lunch', date });
    const groups = groupByDate([make('b', '2026-10-06'), make('a', '2026-10-05'), make('c', '2026-10-06')]);
    expect(groups.map(([day, entries]) => [day, entries.map((entry) => entry.foodName)])).toEqual([
      ['2026-10-05', ['a']],
      ['2026-10-06', ['b', 'c']],
    ]);
  });
});
