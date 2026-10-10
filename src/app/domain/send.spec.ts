import { describe, expect, it } from 'vitest';
import { buildBundle } from './bundle';
import type { OutboxItem } from './models';
import { bundleAsFiles, bundleAsZip, sendBundle } from './send';
import { FakeSharer, bytes } from './testing';

const items: OutboxItem[] = [
  {
    id: '1', kind: 'meal', status: 'pending', createdAt: '2026-10-05T08:00:00.000Z',
    payload: { foodName: 'Oats', grams: 45, meal: 'Breakfast', date: '2026-10-05' },
  },
  {
    id: '2', kind: 'photo', status: 'pending', createdAt: '2026-10-05T08:01:00.000Z',
    payload: { name: 'a', mime: 'image/jpeg', bytes: bytes(1, 2, 3) },
  },
];
const bundle = buildBundle(items, '2026-10-10');

describe('sendBundle', () => {
  it('shares one zip when the phone accepts it', async () => {
    const sharer = new FakeSharer();
    expect(await sendBundle(bundle, sharer)).toBe('shared-zip');
    expect(sharer.shared).toHaveLength(1);
    expect(sharer.shared[0]!.map((file) => file.name)).toEqual(['dailyplate-2026-10-10.zip']);
    expect(sharer.shared[0]![0]!.mime).toBe('application/zip');
  });

  it('falls back to separate files, with the photo folder flattened, when a zip is refused', async () => {
    const sharer = new FakeSharer();
    sharer.acceptZip = false;
    expect(await sendBundle(bundle, sharer)).toBe('shared-files');
    expect(sharer.shared[0]!.map((file) => [file.name, file.mime])).toEqual([
      ['diary-2026-10-05.csv', 'text/csv'],
      ['barcode-001.jpg', 'image/jpeg'],
    ]);
  });

  it('downloads the zip when nothing can be shared', async () => {
    const sharer = new FakeSharer();
    sharer.acceptZip = false;
    sharer.acceptFiles = false;
    expect(await sendBundle(bundle, sharer)).toBe('downloaded');
    expect(sharer.downloads[0]!.map((file) => file.name)).toEqual(['dailyplate-2026-10-10.zip']);
  });

  it('reports a dismissed share sheet and does not try anything else', async () => {
    const sharer = new FakeSharer();
    sharer.result = 'cancelled';
    expect(await sendBundle(bundle, sharer)).toBe('cancelled');
    expect(sharer.downloads).toHaveLength(0);
  });

  it('moves on to the next way when sharing throws', async () => {
    const sharer = new FakeSharer();
    sharer.result = 'throw';
    expect(await sendBundle(bundle, sharer)).toBe('downloaded');
  });

  it('builds the zip and the flat file list from the same entries', () => {
    expect(bundleAsZip(bundle).bytes.length).toBeGreaterThan(0);
    expect(bundleAsFiles(bundle)).toHaveLength(bundle.entries.length);
  });
});
