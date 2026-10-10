import type { Bytes } from './models';

export interface ZipEntry {
  /** Path inside the zip, using `/` (for example `photos/barcode-001.jpg`). */
  name: string;
  data: Bytes;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let value = n;
    for (let bit = 0; bit < 8; bit++) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[n] = value >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = (CRC_TABLE[(crc ^ byte) & 0xff] as number) ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// MS-DOS date for 1980-01-01 and time 00:00: a fixed stamp keeps the output byte-for-byte reproducible.
const DOS_DATE = 0x0021;
const DOS_TIME = 0x0000;
const UTF8_NAMES = 0x0800;
const MAX_32 = 0xffffffff;

/**
 * A zip file that stores its entries without compression (photos and CSVs gain little from it).
 * Small, dependency-free and deterministic. Zip64 is not supported (limits: 65,535 entries, 4 GB).
 */
export function makeZip(entries: readonly ZipEntry[]): Bytes {
  if (entries.length > 0xffff) {
    throw new RangeError('A zip can hold at most 65,535 files.');
  }
  const encoder = new TextEncoder();
  const prepared = entries.map((entry) => ({
    name: encoder.encode(entry.name),
    data: entry.data,
    crc: crc32(entry.data),
    offset: 0,
  }));
  let size = 22;
  for (const entry of prepared) {
    size += 30 + entry.name.length + entry.data.length + 46 + entry.name.length;
  }
  if (size > MAX_32) {
    throw new RangeError('The zip would be larger than 4 GB.');
  }
  const out = new Uint8Array(size);
  const view = new DataView(out.buffer);
  let position = 0;
  for (const entry of prepared) {
    entry.offset = position;
    view.setUint32(position, 0x04034b50, true);
    view.setUint16(position + 4, 20, true); // version needed
    view.setUint16(position + 6, UTF8_NAMES, true);
    view.setUint16(position + 8, 0, true); // method: stored
    view.setUint16(position + 10, DOS_TIME, true);
    view.setUint16(position + 12, DOS_DATE, true);
    view.setUint32(position + 14, entry.crc, true);
    view.setUint32(position + 18, entry.data.length, true);
    view.setUint32(position + 22, entry.data.length, true);
    view.setUint16(position + 26, entry.name.length, true);
    view.setUint16(position + 28, 0, true);
    out.set(entry.name, position + 30);
    out.set(entry.data, position + 30 + entry.name.length);
    position += 30 + entry.name.length + entry.data.length;
  }
  const directoryStart = position;
  for (const entry of prepared) {
    view.setUint32(position, 0x02014b50, true);
    view.setUint16(position + 4, 20, true); // version made by
    view.setUint16(position + 6, 20, true); // version needed
    view.setUint16(position + 8, UTF8_NAMES, true);
    view.setUint16(position + 10, 0, true);
    view.setUint16(position + 12, DOS_TIME, true);
    view.setUint16(position + 14, DOS_DATE, true);
    view.setUint32(position + 16, entry.crc, true);
    view.setUint32(position + 20, entry.data.length, true);
    view.setUint32(position + 24, entry.data.length, true);
    view.setUint16(position + 28, entry.name.length, true);
    view.setUint32(position + 42, entry.offset, true);
    out.set(entry.name, position + 46);
    position += 46 + entry.name.length;
  }
  view.setUint32(position, 0x06054b50, true);
  view.setUint16(position + 8, prepared.length, true);
  view.setUint16(position + 10, prepared.length, true);
  view.setUint32(position + 12, position - directoryStart, true);
  view.setUint32(position + 16, directoryStart, true);
  return out;
}
