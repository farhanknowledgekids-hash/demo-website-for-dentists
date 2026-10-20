/**
 * Front-end-only demo scheduler, used when no booking endpoint is configured (see public/config.js).
 *
 * - Availability is deterministic: the same date + dentist always produces the same sample slots.
 * - Bookings made in this browser session are remembered (sessionStorage) and block that slot.
 * - Nothing is transmitted anywhere.
 */
import { dentists } from './catalog';
import { fromISO, startOfDay } from './dates';
import { timesFor, tooSoon } from './schedule';
import {
  BookingError,
  type BookingConfirmation,
  type BookingRequest,
  type DentistChoice,
  type DentistId,
  type ISODate,
  type SchedulingProvider,
  type Slot,
} from './types';

const STORAGE_KEY = 'lumiere-demo-bookings';

/** Small, stable string hash (FNV-1a) so sample availability never changes between visits. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

let memoryBookings: BookingConfirmation[] = [];

function readBooked(): BookingConfirmation[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as BookingConfirmation[]) : [];
  } catch {
    return memoryBookings;
  }
}

function writeBooked(list: BookingConfirmation[]) {
  memoryBookings = list;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable (private mode etc.): keep in memory only */
  }
}

function isTakenInSession(date: ISODate, time: string, dentist: DentistId) {
  return readBooked().some((b) => b.date === date && b.time === time && b.dentist === dentist);
}

function baseAvailable(date: ISODate, time: string, dentist: DentistId): boolean {
  // roughly 60% of sample slots are open
  return hash(`${date}|${time}|${dentist}`) % 10 >= 4;
}

function slotFor(date: ISODate, time: string, choice: DentistChoice, now: Date): Slot {
  if (tooSoon(date, time, now)) return { time, available: false };
  const candidates: DentistId[] = choice === 'any' ? dentists.map((d) => d.id) : [choice];
  const free = candidates.find((id) => baseAvailable(date, time, id) && !isTakenInSession(date, time, id));
  return free ? { time, available: true, dentistId: free } : { time, available: false };
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function makeReference(req: BookingRequest): string {
  const n = hash(`${req.date}${req.time}${req.patient.email}${Date.now()}`).toString(36).toUpperCase();
  return `LD-${n.slice(0, 4).padEnd(4, '0')}-DEMO`;
}

export const mockScheduler: SchedulingProvider = {
  async getSlots(date, dentist) {
    await wait(260); // a short, honest loading state
    const now = new Date();
    if (startOfDay(fromISO(date)) < startOfDay(now)) return [];
    return timesFor(date).map((t) => slotFor(date, t, dentist, now));
  },

  async createBooking(req) {
    await wait(900);
    if (!req.patient.name || !req.patient.email) throw new BookingError('invalid', 'Some details are missing.');
    if (tooSoon(req.date, req.time, new Date()) || isTakenInSession(req.date, req.time, req.dentist) || !baseAvailable(req.date, req.time, req.dentist)) {
      throw new BookingError('slot_taken', 'That time was just booked in this demo session. Please choose another time.');
    }
    const confirmation: BookingConfirmation = { ...req, reference: makeReference(req), createdAt: new Date().toISOString() };
    writeBooked([...readBooked(), confirmation]);
    return confirmation;
  },
};
