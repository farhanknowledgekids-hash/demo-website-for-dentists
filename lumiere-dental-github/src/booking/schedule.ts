/**
 * Opening-hours rules shared by the demo scheduler and the Google Sheet scheduler.
 * Keep these lists in sync with apps-script/Code.gs (WEEKDAY_TIMES / SATURDAY_TIMES).
 */
import { fromISO } from './dates';
import type { ISODate } from './types';

export const WEEKDAY_TIMES = ['09:30', '10:15', '11:00', '11:45', '12:30', '14:30', '15:15', '16:00', '16:45', '17:30', '18:15'];
export const SATURDAY_TIMES = ['10:00', '10:45', '11:30', '12:15', '14:00', '14:45', '15:30', '16:15'];
/** Same-day slots need at least this much notice. */
export const MIN_NOTICE_MINUTES = 120;

export function timesFor(date: ISODate): string[] {
  const d = fromISO(date);
  if (d.getDay() === 0) return [];
  return d.getDay() === 6 ? SATURDAY_TIMES : WEEKDAY_TIMES;
}

export function tooSoon(date: ISODate, time: string, now: Date): boolean {
  const [h, m] = time.split(':').map(Number);
  const slot = fromISO(date);
  slot.setHours(h, m, 0, 0);
  return slot.getTime() - now.getTime() < MIN_NOTICE_MINUTES * 60_000;
}
