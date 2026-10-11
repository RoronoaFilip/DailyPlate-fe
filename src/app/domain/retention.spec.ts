import { describe, expect, it } from 'vitest';
import type { OutboxItem } from './models';
import {
  DEFAULT_RETENTION_DAYS, MAX_RETENTION_DAYS, describeRetention, expiredSent, parseStoredRetention,
  serializeRetention, validateRetention,
} from './retention';

const NOW = new Date('2026-10-20T12:00:00.000Z');

function sent(id: string, daysAgo: number | null): OutboxItem {
  return {
    id, kind: 'meal', createdAt: '2026-10-01T00:00:00.000Z', status: 'sent',
    ...(daysAgo === null ? {} : { sentAt: new Date(NOW.getTime() - daysAgo * 86_400_000).toISOString() }),
    payload: { foodName: id, grams: 1, meal: 'Lunch', date: '2026-10-01' },
  };
}

describe('retention settings', () => {
  it('reads stored values and falls back to 7 days for anything unreadable', () => {
    expect(parseStoredRetention(null)).toBe(DEFAULT_RETENTION_DAYS);
    expect(parseStoredRetention('30')).toBe(30);
    expect(parseStoredRetention('0')).toBe(0);
    expect(parseStoredRetention('forever')).toBeNull();
    for (const bad of ['', 'abc', '-3', '2.5', String(MAX_RETENTION_DAYS + 1)]) {
      expect(parseStoredRetention(bad)).toBe(DEFAULT_RETENTION_DAYS);
    }
  });

  it('round-trips through its stored form', () => {
    for (const value of [0, 1, 7, 365, null]) {
      expect(parseStoredRetention(serializeRetention(value))).toBe(value);
    }
  });

  it('validates whole numbers of days from 0 up, or keep-forever', () => {
    expect(validateRetention({ forever: true, days: null })).toEqual({ ok: true, value: null });
    expect(validateRetention({ forever: false, days: 0 })).toEqual({ ok: true, value: 0 });
    expect(validateRetention({ forever: false, days: 90 })).toEqual({ ok: true, value: 90 });
    for (const days of [null, -1, 2.5, Number.NaN, MAX_RETENTION_DAYS + 1]) {
      expect(validateRetention({ forever: false, days }).ok).toBe(false);
    }
  });

  it('describes each setting in words', () => {
    expect(describeRetention(null)).toBe('Sent items are kept until you delete them.');
    expect(describeRetention(0)).toBe('Sent items are deleted as soon as they are marked as sent.');
    expect(describeRetention(1)).toBe('Sent items are kept for 1 day.');
    expect(describeRetention(30)).toBe('Sent items are kept for 30 days.');
  });
});

describe('expiredSent', () => {
  const items = [sent('new', 1), sent('week', 7), sent('old', 20), sent('undated', null)];

  it('lists the sent items kept longer than the limit (at the limit counts as expired)', () => {
    expect(expiredSent(items, 7, NOW).map((item) => item.id)).toEqual(['week', 'old']);
    expect(expiredSent(items, 30, NOW)).toEqual([]);
  });

  it('keeps everything when the limit is "forever"', () => {
    expect(expiredSent(items, null, NOW)).toEqual([]);
  });

  it('expires every dated sent item at 0 days', () => {
    expect(expiredSent(items, 0, NOW).map((item) => item.id)).toEqual(['new', 'week', 'old']);
  });

  it('never touches pending items', () => {
    const pending: OutboxItem = { ...sent('p', 100), status: 'pending' };
    expect(expiredSent([pending], 0, NOW)).toEqual([]);
  });
});
