import type { OutboxItem } from './models';
import type { Validation } from './validation';

/**
 * How long items that were already sent stay on the phone, in days.
 * `null` means "keep until I delete them myself". `0` means "delete as soon as they are marked as sent".
 */
export type Retention = number | null;

export const DEFAULT_RETENTION_DAYS = 7;
export const MAX_RETENTION_DAYS = 3650;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Read a stored setting back; anything unreadable falls back to the default. */
export function parseStoredRetention(stored: string | null): Retention {
  if (stored === 'forever') {
    return null;
  }
  if (stored !== null && /^\d+$/.test(stored)) {
    const days = Number(stored);
    if (days <= MAX_RETENTION_DAYS) {
      return days;
    }
  }
  return DEFAULT_RETENTION_DAYS;
}

export function serializeRetention(retention: Retention): string {
  return retention === null ? 'forever' : String(retention);
}

export interface RetentionForm {
  forever: boolean;
  days: number | null;
}

export function validateRetention(form: RetentionForm): Validation<Retention, 'days'> {
  if (form.forever) {
    return { ok: true, value: null };
  }
  const days = form.days;
  if (typeof days !== 'number' || !Number.isInteger(days) || days < 0 || days > MAX_RETENTION_DAYS) {
    return { ok: false, errors: { days: `Enter a whole number of days from 0 to ${MAX_RETENTION_DAYS}.` } };
  }
  return { ok: true, value: days };
}

/** The sent items that have been kept longer than `retention` allows (none when it is "keep forever"). */
export function expiredSent(items: readonly OutboxItem[], retention: Retention, now: Date): OutboxItem[] {
  if (retention === null) {
    return [];
  }
  const cutoff = now.getTime() - retention * DAY_MS;
  return items.filter(
    (item) => item.status === 'sent' && item.sentAt !== undefined && new Date(item.sentAt).getTime() <= cutoff,
  );
}

export function describeRetention(retention: Retention): string {
  if (retention === null) {
    return 'Sent items are kept until you delete them.';
  }
  if (retention === 0) {
    return 'Sent items are deleted as soon as they are marked as sent.';
  }
  return `Sent items are kept for ${retention} ${retention === 1 ? 'day' : 'days'}.`;
}
