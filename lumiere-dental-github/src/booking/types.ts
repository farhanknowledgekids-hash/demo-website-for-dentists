export type ServiceId = 'checkup' | 'cleaning' | 'cosmetic' | 'whitening' | 'aligners' | 'restorative' | 'emergency';
export type DentistId = 'aanya' | 'kabir' | 'meera';
export type DentistChoice = DentistId | 'any';

export interface Service {
  id: ServiceId;
  name: string;
  duration: string;
  detail: string;
}

export interface Dentist {
  id: DentistId;
  name: string;
  focus: string;
}

/** ISO calendar date, "YYYY-MM-DD", in the clinic's local time. */
export type ISODate = string;

export interface Slot {
  time: string; // "HH:MM"
  available: boolean;
  /** Which dentist would take this slot (resolved for "no preference"). */
  dentistId?: DentistId;
}

export interface PatientDetails {
  name: string;
  email: string;
  phone: string;
  note: string;
}

export interface BookingRequest {
  service: ServiceId;
  dentist: DentistId;
  requestedDentist: DentistChoice;
  date: ISODate;
  time: string;
  patient: PatientDetails;
  /** honeypot field; always empty for real visitors */
  website?: string;
}

export interface BookingConfirmation extends BookingRequest {
  reference: string;
  createdAt: string;
}

export type BookingErrorCode = 'slot_taken' | 'invalid' | 'network';

export class BookingError extends Error {
  constructor(public code: BookingErrorCode, message: string) {
    super(message);
  }
}

/**
 * The seam for a real backend. Swap `mockScheduler` for an implementation that calls
 * your practice-management system or a scheduling provider (Cal.com, Calendly, a custom API…).
 */
export interface SchedulingProvider {
  getSlots(date: ISODate, dentist: DentistChoice, service: ServiceId): Promise<Slot[]>;
  createBooking(req: BookingRequest): Promise<BookingConfirmation>;
}
