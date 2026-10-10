import type { OutboxItem } from './models';

export function formatBytes(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

/** One line for the outbox list. */
export function describeItem(item: OutboxItem): string {
  switch (item.kind) {
    case 'photo':
      return `Barcode photo (${formatBytes(item.payload.bytes.length)})`;
    case 'meal':
      return `${item.payload.foodName} · ${item.payload.grams} · ${item.payload.meal} · ${item.payload.date}`;
    case 'food': {
      const per = item.payload.basis === 'g' ? 'per 100 g' : 'per item';
      return `New food: ${item.payload.name} (${item.payload.calories} kcal ${per})`;
    }
  }
}

/** A short word for the item's type, shown as text so colour is never the only cue. */
export function kindLabel(item: OutboxItem): string {
  return item.kind === 'photo' ? 'Photo' : item.kind === 'meal' ? 'Meal' : 'Food';
}
