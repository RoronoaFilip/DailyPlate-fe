const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Format a Date as its local calendar day, `YYYY-MM-DD`. */
export function toIsoDate(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** True for a real calendar day written as `YYYY-MM-DD` (so `2026-02-30` is false). */
export function isValidIsoDate(value: string): boolean {
  const found = ISO_DAY.exec(value);
  if (!found) {
    return false;
  }
  const [year, month, day] = [Number(found[1]), Number(found[2]), Number(found[3])];
  const probe = new Date(Date.UTC(year, month - 1, day));
  return probe.getUTCFullYear() === year && probe.getUTCMonth() === month - 1 && probe.getUTCDate() === day;
}

/** The meal people most likely mean at a given hour (0-23). */
export function defaultMealForHour(hour: number): 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks' {
  if (hour < 11) {
    return 'Breakfast';
  }
  if (hour < 16) {
    return 'Lunch';
  }
  if (hour < 21) {
    return 'Dinner';
  }
  return 'Snacks';
}
