import { describe, expect, it } from 'vitest';
import { Outbox } from './outbox';
import { FakeClock, MemoryStore, bytes, counter } from './testing';

function setup() {
  const store = new MemoryStore();
  const clock = new FakeClock('2026-10-05T08:00:00.000Z');
  const outbox = new Outbox(store as never, counter(), clock.now);
  return { store, clock, outbox };
}

const meal = { foodName: 'Oats', grams: 45, meal: 'Breakfast' as const, date: '2026-10-05' };

describe('Outbox', () => {
  it('adds items as pending and lists them oldest first', async () => {
    const { outbox, clock } = setup();
    await outbox.addMeal(meal);
    clock.advanceDays(0.001);
    await outbox.addPhoto({ name: 'p', mime: 'image/jpeg', bytes: bytes(1) });
    const items = await outbox.list('pending');
    expect(items.map((item) => item.kind)).toEqual(['meal', 'photo']);
    expect(items.every((item) => item.status === 'pending')).toBe(true);
  });

  it('keeps sent items but hides them from the pending list', async () => {
    const { outbox } = setup();
    const first = await outbox.addMeal(meal);
    await outbox.addMeal({ ...meal, foodName: 'Milk' });
    await outbox.markSent([first.id]);
    expect((await outbox.list('pending')).map((item) => item.id)).not.toContain(first.id);
    const sent = await outbox.list('sent');
    expect(sent).toHaveLength(1);
    expect(sent[0]!.sentAt).toBe('2026-10-05T08:00:00.000Z');
    expect(await outbox.list()).toHaveLength(2);
  });

  it('removes only sent items older than the given number of days', async () => {
    const { outbox, clock } = setup();
    const old = await outbox.addMeal(meal);
    await outbox.markSent([old.id]);
    clock.advanceDays(8);
    const recent = await outbox.addMeal({ ...meal, foodName: 'Milk' });
    await outbox.markSent([recent.id]);
    const stillPending = await outbox.addMeal({ ...meal, foodName: 'Rice' });
    expect(await outbox.purgeSent(7)).toBe(1);
    const ids = (await outbox.list()).map((item) => item.id);
    expect(ids).toContain(recent.id);
    expect(ids).toContain(stillPending.id);
    expect(ids).not.toContain(old.id);
  });

  it('keeps sent items forever when the retention is null', async () => {
    const { outbox, clock } = setup();
    const item = await outbox.addMeal(meal);
    await outbox.markSent([item.id]);
    clock.advanceDays(10_000);
    expect(await outbox.purgeSent(null)).toBe(0);
    expect(await outbox.list('sent')).toHaveLength(1);
  });

  it('removes sent items straight away with a retention of 0, never pending ones', async () => {
    const { outbox } = setup();
    const sentItem = await outbox.addMeal(meal);
    const pendingItem = await outbox.addMeal({ ...meal, foodName: 'Milk' });
    await outbox.markSent([sentItem.id]);
    expect(await outbox.purgeSent(0)).toBe(1);
    expect((await outbox.list()).map((item) => item.id)).toEqual([pendingItem.id]);
  });

  it('removes all sent items at once and leaves the pending ones', async () => {
    const { outbox } = setup();
    const a = await outbox.addMeal(meal);
    const b = await outbox.addMeal({ ...meal, foodName: 'Milk' });
    const waiting = await outbox.addMeal({ ...meal, foodName: 'Rice' });
    await outbox.markSent([a.id, b.id]);
    expect(await outbox.removeAllSent()).toBe(2);
    expect((await outbox.list()).map((item) => item.id)).toEqual([waiting.id]);
    expect(await outbox.removeAllSent()).toBe(0);
  });

  it('removes a single item', async () => {
    const { outbox } = setup();
    const item = await outbox.addMeal(meal);
    await outbox.remove(item.id);
    expect(await outbox.list()).toEqual([]);
  });

  it('suggests recent food names, newest first, once each ignoring case', async () => {
    const { outbox, clock } = setup();
    await outbox.addMeal({ ...meal, foodName: 'Oats' });
    clock.advanceDays(0.01);
    await outbox.addMeal({ ...meal, foodName: 'Milk' });
    clock.advanceDays(0.01);
    await outbox.addMeal({ ...meal, foodName: 'oats' });
    expect(await outbox.recentFoodNames()).toEqual(['oats', 'Milk']);
    expect(await outbox.recentFoodNames(1)).toEqual(['oats']);
  });
});
