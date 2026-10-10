import { describe, expect, it } from 'vitest';
import { crc32, makeZip } from './zip';

interface Found {
  name: string;
  data: Uint8Array;
  crc: number;
  method: number;
}

/** A tiny independent zip reader, so the writer is checked against the format and not against itself. */
function readZip(zip: Uint8Array): Found[] {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  const end = zip.length - 22;
  expect(view.getUint32(end, true)).toBe(0x06054b50);
  const count = view.getUint16(end + 10, true);
  let position = view.getUint32(end + 16, true);
  const found: Found[] = [];
  for (let index = 0; index < count; index++) {
    expect(view.getUint32(position, true)).toBe(0x02014b50);
    const method = view.getUint16(position + 10, true);
    const crc = view.getUint32(position + 16, true);
    const size = view.getUint32(position + 20, true);
    const nameLength = view.getUint16(position + 28, true);
    const extraLength = view.getUint16(position + 30, true);
    const commentLength = view.getUint16(position + 32, true);
    const localOffset = view.getUint32(position + 42, true);
    const name = new TextDecoder().decode(zip.subarray(position + 46, position + 46 + nameLength));
    expect(view.getUint32(localOffset, true)).toBe(0x04034b50);
    const localName = view.getUint16(localOffset + 26, true);
    const localExtra = view.getUint16(localOffset + 28, true);
    const start = localOffset + 30 + localName + localExtra;
    found.push({ name, data: zip.subarray(start, start + size), crc, method });
    position += 46 + nameLength + extraLength + commentLength;
  }
  return found;
}

describe('zip', () => {
  it('computes the standard CRC-32 check value', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
    expect(crc32(new Uint8Array(0))).toBe(0);
  });

  it('writes entries that read back with matching names, bytes and checksums', () => {
    const photo = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
    const zip = makeZip([
      { name: 'foods.csv', data: new TextEncoder().encode('a,b\r\n1,2\r\n') },
      { name: 'photos/barcode-001.jpg', data: photo },
      { name: 'diary-2026-10-05-é.csv', data: new Uint8Array(0) },
    ]);
    const found = readZip(zip);
    expect(found.map((entry) => entry.name)).toEqual(['foods.csv', 'photos/barcode-001.jpg', 'diary-2026-10-05-é.csv']);
    expect(Array.from(found[1]!.data)).toEqual(Array.from(photo));
    for (const entry of found) {
      expect(entry.method).toBe(0);
      expect(crc32(entry.data)).toBe(entry.crc);
    }
  });

  it('starts with a local file header and ends with the end-of-central-directory record', () => {
    const zip = makeZip([{ name: 'a.txt', data: new Uint8Array([65]) }]);
    expect(Array.from(zip.subarray(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04]);
    expect(Array.from(zip.subarray(zip.length - 22, zip.length - 18))).toEqual([0x50, 0x4b, 0x05, 0x06]);
  });

  it('is deterministic and can be empty', () => {
    const entries = [{ name: 'a.txt', data: new Uint8Array([1, 2, 3]) }];
    expect(Array.from(makeZip(entries))).toEqual(Array.from(makeZip(entries)));
    expect(makeZip([]).length).toBe(22);
  });
});
