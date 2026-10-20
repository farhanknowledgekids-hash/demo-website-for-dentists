/**
 * Live scheduler: talks to the Google Apps Script web app in apps-script/Code.gs,
 * which stores every booking as a row in a private Google Sheet.
 *
 * - getSlots asks the sheet which times are already taken (it never receives anyone's details).
 * - createBooking posts the booking; the script re-validates everything and refuses double bookings.
 */
import { dentists } from './catalog';
import { fromISO, startOfDay } from './dates';
import { timesFor, tooSoon } from './schedule';
import { BookingError, type DentistId, type ISODate, type SchedulingProvider, type Slot } from './types';

interface TakenSlot {
  time: string;
  dentist: DentistId;
}

const TIMEOUT_MS = 20_000;

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal, redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } catch {
    throw new BookingError('network', 'We could not reach the booking system. Check your internet connection and try again. (If you are viewing this inside a file preview, open the page in Chrome, Edge or Safari instead.)');
  } finally {
    window.clearTimeout(timer);
  }
}

export function createSheetScheduler(endpoint: string): SchedulingProvider {
  return {
    async getSlots(date: ISODate, dentist) {
      const now = new Date();
      if (startOfDay(fromISO(date)) < startOfDay(now)) return [];
      const res = await call<{ ok: boolean; booked?: TakenSlot[]; message?: string }>(
        `${endpoint}?action=slots&date=${encodeURIComponent(date)}`,
      );
      if (!res.ok || !res.booked) throw new BookingError('network', res.message || 'Times could not be loaded.');
      const taken = res.booked;
      const candidates: DentistId[] = dentist === 'any' ? dentists.map((d) => d.id) : [dentist];
      return timesFor(date).map((time): Slot => {
        if (tooSoon(date, time, now)) return { time, available: false };
        const free = candidates.find((id) => !taken.some((t) => t.time === time && t.dentist === id));
        return free ? { time, available: true, dentistId: free } : { time, available: false };
      });
    },

    async createBooking(req) {
      // text/plain keeps this a "simple" request, which Apps Script accepts from any website
      const res = await call<{ ok: boolean; error?: string; message?: string; reference?: string; dentist?: DentistId }>(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(req),
      });
      if (!res.ok || !res.reference) {
        const code = res.error === 'slot_taken' ? 'slot_taken' : res.error === 'invalid' || res.error === 'rate_limited' ? 'invalid' : 'network';
        throw new BookingError(code, res.message || 'Your booking could not be saved. Please try again.');
      }
      return { ...req, dentist: res.dentist ?? req.dentist, reference: res.reference, createdAt: new Date().toISOString() };
    },
  };
}
