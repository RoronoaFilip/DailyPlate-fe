/**
 * Writes (or with --check, verifies) the sample files the desktop app's tests use to prove it can import
 * what this app produces. Run: npm run fixtures:export   |   npm run fixtures:check
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildBundle } from '../src/app/domain/bundle';
import type { OutboxItem } from '../src/app/domain/models';
import { makeZip } from '../src/app/domain/zip';

const directory = join(__dirname, '..', 'fixtures');
const created = '2026-10-05T08:00:00.000Z';
const base = { createdAt: created, status: 'pending' as const };

// A tiny valid JPEG header is enough: the desktop zip tests only look at file kinds and names.
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xff, 0xd9]);

const items: OutboxItem[] = [
  {
    ...base, id: 'f1', kind: 'food',
    payload: {
      name: 'Phone Oats', basis: 'g', calories: 380, fat: 7, carbohydrates: 60, protein: 13,
      saturatedFat: 1, sugars: 1, fiber: 10, omega3: null, omega6: null,
    },
  },
  {
    ...base, id: 'f2', kind: 'food',
    payload: {
      name: 'Phone Egg, large', basis: 'count', calories: 78, fat: 5.3, carbohydrates: 0.6, protein: 6.3,
      saturatedFat: 1.6, sugars: 0.2, fiber: 0, omega3: null, omega6: null,
    },
  },
  { ...base, id: 'm1', kind: 'meal', payload: { foodName: 'Phone Oats', grams: 45.5, meal: 'Breakfast', date: '2026-10-05' } },
  { ...base, id: 'm2', kind: 'meal', payload: { foodName: 'phone egg large', grams: 2, meal: 'Breakfast', date: '2026-10-05' } },
  { ...base, id: 'm3', kind: 'meal', payload: { foodName: 'Phone Oats', grams: 60, meal: 'Lunch', date: '2026-10-06' } },
  { ...base, id: 'p1', kind: 'photo', payload: { name: 'barcode', mime: 'image/jpeg', bytes: jpeg as never } },
];

const bundle = buildBundle(items, '2026-10-10');
const files = new Map<string, Uint8Array>(bundle.entries.filter((e) => !e.name.includes('/')).map((e) => [e.name, e.data]));
files.set('phone-export.zip', makeZip(bundle.entries));

/** CSV line endings are ignored when comparing, so Git's end-of-line settings cannot break the check. */
function sameFile(name: string, expected: Uint8Array, actual: Buffer): boolean {
  const lf = (bytes: Uint8Array) => Buffer.from(Buffer.from(bytes).toString('utf8').replace(/\r\n/g, '\n'));
  return name.endsWith('.csv') ? lf(expected).equals(lf(actual)) : Buffer.from(expected).equals(actual);
}

if (process.argv.includes('--check')) {
  const stale = [...files].filter(([name, data]) => {
    try {
      return !sameFile(name, data, readFileSync(join(directory, name)));
    } catch {
      return true;
    }
  });
  if (stale.length > 0) {
    console.error(`Fixtures are out of date: ${stale.map(([name]) => name).join(', ')}. Run npm run fixtures:export.`);
    process.exit(1);
  }
  console.log(`Fixtures OK: ${files.size} files match the current code.`);
} else {
  mkdirSync(directory, { recursive: true });
  for (const [name, data] of files) {
    writeFileSync(join(directory, name), data);
  }
  console.log(`Wrote ${files.size} fixtures to ${directory}`);
}
