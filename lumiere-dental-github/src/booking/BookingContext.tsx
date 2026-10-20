import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import type { BookingConfirmation, DentistChoice, DentistId, ISODate, PatientDetails, ServiceId } from './types';

export const STEPS = ['service', 'dentist', 'date', 'time', 'details', 'review'] as const;
export type Step = (typeof STEPS)[number] | 'success';

export const STEP_LABELS: Record<(typeof STEPS)[number], string> = {
  service: 'Treatment',
  dentist: 'Dentist',
  date: 'Date',
  time: 'Time',
  details: 'Your details',
  review: 'Review',
};

export interface Draft {
  service?: ServiceId;
  dentist?: DentistChoice;
  date?: ISODate;
  time?: string;
  /** dentist resolved for the chosen slot (relevant for "no preference") */
  assignedDentist?: DentistId;
  patient: PatientDetails;
  /** honeypot value (should stay empty) */
  website?: string;
}

const emptyDraft = (): Draft => ({ patient: { name: '', email: '', phone: '', note: '' } });

interface BookingState {
  isOpen: boolean;
  step: Step;
  draft: Draft;
  confirmation?: BookingConfirmation;
  open: (opts?: { service?: ServiceId; dentist?: DentistChoice }) => void;
  close: () => void;
  goTo: (s: Step) => void;
  update: (patch: Partial<Draft>) => void;
  complete: (c: BookingConfirmation) => void;
  reset: () => void;
}

const Ctx = createContext<BookingState | null>(null);

export function BookingProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('service');
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [confirmation, setConfirmation] = useState<BookingConfirmation>();
  const opener = useRef<HTMLElement | null>(null);
  const confirmed = useRef(false);

  const open: BookingState['open'] = useCallback((opts) => {
    opener.current = document.activeElement as HTMLElement | null;
    // after a finished booking, a new "Book" click starts fresh
    if (confirmed.current) {
      confirmed.current = false;
      setConfirmation(undefined);
      setDraft(emptyDraft());
      setStep('service');
    }
    if (opts?.service || opts?.dentist) {
      setDraft((d) => ({
        ...d,
        service: opts.service ?? d.service,
        dentist: opts.dentist ?? d.dentist,
        // a different choice invalidates the slot picked for the old one
        time: undefined,
        assignedDentist: undefined,
      }));
      setStep(opts.dentist ? 'date' : 'dentist');
    }
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    // return focus to whatever opened the drawer
    const el = opener.current;
    window.setTimeout(() => el?.focus?.({ preventScroll: true }), 30);
  }, []);

  const update = useCallback((patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch })), []);

  const complete = useCallback((c: BookingConfirmation) => {
    confirmed.current = true;
    setConfirmation(c);
    setStep('success');
  }, []);

  const reset = useCallback(() => {
    confirmed.current = false;
    setDraft(emptyDraft());
    setConfirmation(undefined);
    setStep('service');
  }, []);

  const value = useMemo(
    () => ({ isOpen, step, draft, confirmation, open, close, goTo: setStep, update, complete, reset }),
    [isOpen, step, draft, confirmation, open, close, update, complete, reset],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBooking() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useBooking must be used inside <BookingProvider>');
  return v;
}

/** Whether the user may move past a given step. */
export function stepComplete(step: Step, d: Draft): boolean {
  switch (step) {
    case 'service':
      return !!d.service;
    case 'dentist':
      return !!d.dentist;
    case 'date':
      return !!d.date;
    case 'time':
      return !!d.time && !!d.assignedDentist;
    case 'details':
      return validatePatient(d.patient).ok;
    default:
      return true;
  }
}

export type FieldErrors = Partial<Record<keyof PatientDetails, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const NOTE_MAX = 240;

export function validatePatient(p: PatientDetails): { ok: boolean; errors: FieldErrors } {
  const errors: FieldErrors = {};
  const name = p.name.trim();
  if (!name) errors.name = 'Please enter your full name.';
  else if (name.length < 2) errors.name = 'Your name looks too short.';
  else if (!/^[\p{L}][\p{L}\s.'-]*$/u.test(name)) errors.name = 'Use letters, spaces, apostrophes or hyphens only.';

  const email = p.email.trim();
  if (!email) errors.email = 'Please enter your email address.';
  else if (!EMAIL_RE.test(email)) errors.email = 'Enter an email address like name@example.com.';

  const digits = p.phone.replace(/[\s()-]/g, '');
  if (digits && !/^(\+91)?[6-9]\d{9}$/.test(digits) && !/^\+\d{8,15}$/.test(digits)) {
    errors.phone = 'Enter a 10-digit mobile number, or include your country code.';
  }
  if (p.note.length > NOTE_MAX) errors.note = `Please keep your note under ${NOTE_MAX} characters.`;
  return { ok: Object.keys(errors).length === 0, errors };
}
