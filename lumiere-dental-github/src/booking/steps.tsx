import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent, type InputHTMLAttributes } from 'react';
import { LuCheck, LuCircleAlert, LuPencil } from 'react-icons/lu';
import { dentistById, serviceById, services } from './catalog';
import { formatLongDate, formatTime } from './dates';
import { Calendar } from './Calendar';
import { LIVE, scheduler } from './scheduler';
import { NOTE_MAX, useBooking, validatePatient, type FieldErrors, type Step } from './BookingContext';
import type { DentistChoice, PatientDetails, Slot } from './types';
import { photos } from '../data/images';
import { team } from '../data/content';

interface StepProps {
  titleId: string;
}

export function StepIntro({ id, title, hint }: { id: string; title: string; hint?: string }) {
  return (
    <header className="step__intro">
      <h3 id={id} className="step__title" tabIndex={-1}>
        {title}
      </h3>
      {hint && <p className="step__hint">{hint}</p>}
    </header>
  );
}

/* ── 1. Service ───────────────────────────────────────── */
export function ServiceStep({ titleId }: StepProps) {
  const { draft, update, goTo } = useBooking();
  return (
    <div className="step">
      <StepIntro id={titleId} title="What would you like to come in for?" hint="Not sure? Choose a check-up. It is the right starting point for most people." />
      <div role="radiogroup" aria-labelledby={titleId} className="choice-list">
        {services.map((s) => {
          const checked = draft.service === s.id;
          return (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={checked}
              className="choice"
              onClick={() => {
                update({ service: s.id, time: undefined, assignedDentist: undefined });
                goTo('dentist');
              }}
            >
              <span className="choice__main">
                <span className="choice__name">{s.name}</span>
                <span className="choice__detail">{s.detail}</span>
              </span>
              <span className="choice__meta">{s.duration}</span>
              <span className="choice__tick" aria-hidden>
                <LuCheck />
              </span>
            </button>
          );
        })}
      </div>
      {draft.service === 'emergency' && <EmergencyNote />}
    </div>
  );
}

function EmergencyNote() {
  return (
    <p className="note note--warn" role="note">
      <LuCircleAlert aria-hidden /> In a real dental emergency, phone the clinic or seek urgent care. This demo cannot arrange treatment.
    </p>
  );
}

/* ── 2. Dentist ───────────────────────────────────────── */
export function DentistStep({ titleId }: StepProps) {
  const { draft, update, goTo } = useBooking();
  const choose = (id: DentistChoice) => {
    update({ dentist: id, time: undefined, assignedDentist: undefined });
    goTo('date');
  };
  return (
    <div className="step">
      <StepIntro id={titleId} title="Who would you like to see?" hint="Sample clinicians for this demo. Their names and photos are placeholders." />
      <div role="radiogroup" aria-labelledby={titleId} className="choice-list">
        <button type="button" role="radio" aria-checked={draft.dentist === 'any'} className="choice choice--any" onClick={() => choose('any')}>
          <span className="choice__avatar choice__avatar--any" aria-hidden>
            Any
          </span>
          <span className="choice__main">
            <span className="choice__name">No preference</span>
            <span className="choice__detail">Shows the most available times</span>
          </span>
          <span className="choice__tick" aria-hidden>
            <LuCheck />
          </span>
        </button>
        {team.map((m) => (
          <button key={m.id} type="button" role="radio" aria-checked={draft.dentist === m.id} className="choice" onClick={() => choose(m.id)}>
            <img className="choice__avatar" src={photos[m.photo].src} alt="" width={48} height={48} loading="lazy" />
            <span className="choice__main">
              <span className="choice__name">
                {m.name} <span className="tag">Sample</span>
              </span>
              <span className="choice__detail">{m.focus}</span>
            </span>
            <span className="choice__tick" aria-hidden>
              <LuCheck />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── 3. Date ──────────────────────────────────────────── */
export function DateStep({ titleId }: StepProps) {
  const { draft, update, goTo } = useBooking();
  return (
    <div className="step">
      <StepIntro id={titleId} title="Choose a day" hint="Use the arrow keys to move between days. Sundays are closed." />
      <Calendar
        labelledBy={titleId}
        value={draft.date}
        onChange={(date) => {
          update({ date, time: draft.date === date ? draft.time : undefined, assignedDentist: draft.date === date ? draft.assignedDentist : undefined });
          goTo('time');
        }}
      />
    </div>
  );
}

/* ── 4. Time ──────────────────────────────────────────── */
export function TimeStep({ titleId }: StepProps) {
  const { draft, update, goTo } = useBooking();
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [error, setError] = useState<string | false>(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    setSlots(null);
    setError(false);
    if (!draft.date || !draft.dentist || !draft.service) return;
    scheduler
      .getSlots(draft.date, draft.dentist, draft.service)
      .then((s) => live && setSlots(s))
      .catch((e: unknown) => live && setError(e instanceof Error && e.message ? e.message : 'We could not load times just now.'));
    return () => {
      live = false;
    };
  }, [draft.date, draft.dentist, draft.service, attempt]);

  const open = slots?.filter((s) => s.available) ?? [];
  const morning = slots?.filter((s) => Number(s.time.slice(0, 2)) < 13) ?? [];
  const afternoon = slots?.filter((s) => Number(s.time.slice(0, 2)) >= 13) ?? [];

  return (
    <div className="step">
      <StepIntro id={titleId} title="Pick a time" hint={draft.date ? formatLongDate(draft.date) : undefined} />
      <p className="note note--quiet">
        {LIVE ? 'Greyed-out times are already booked. Availability updates as people book.' : 'Sample availability generated for this demo. It is not connected to a real diary.'}
      </p>
      {error && (
        <div className="state state--error" role="alert">
          <p>{error}</p>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setAttempt((a) => a + 1)}>
            Try again
          </button>
        </div>
      )}
      {!error && slots === null && (
        <div className="slots slots--loading" aria-busy="true" aria-label="Loading available times">
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i} className="slot-skel" />
          ))}
        </div>
      )}
      {slots && open.length === 0 && (
        <div className="state state--empty">
          <p>No sample times left on this day.</p>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => goTo('date')}>
            Choose another day
          </button>
        </div>
      )}
      {slots && open.length > 0 && (
        <div role="radiogroup" aria-labelledby={titleId} className="slot-groups">
          {[
            ['Morning', morning],
            ['Afternoon & evening', afternoon],
          ].map(([label, list]) =>
            (list as Slot[]).length ? (
              <div key={label as string} className="slot-group">
                <p className="slot-group__label">{label as string}</p>
                <div className="slots">
                  {(list as Slot[]).map((s) => {
                    const checked = draft.time === s.time;
                    return (
                      <button
                        key={s.time}
                        type="button"
                        role="radio"
                        aria-checked={checked}
                        className="slot"
                        disabled={!s.available}
                        aria-label={`${formatTime(s.time)}${s.available ? '' : ', unavailable'}`}
                        onClick={() => {
                          update({ time: s.time, assignedDentist: s.dentistId });
                          goTo('details');
                        }}
                      >
                        {formatTime(s.time)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null,
          )}
        </div>
      )}
    </div>
  );
}

/* ── 5. Details ───────────────────────────────────────── */
export function DetailsStep({ titleId, onValid }: StepProps & { onValid: () => void }) {
  const { draft, update } = useBooking();
  const [touched, setTouched] = useState<Partial<Record<keyof PatientDetails, boolean>>>({});
  const [showAll, setShowAll] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const uid = useId();
  const { errors } = validatePatient(draft.patient);
  const visible: FieldErrors = Object.fromEntries(
    Object.entries(errors).filter(([k]) => showAll || touched[k as keyof PatientDetails]),
  );

  const set = (k: keyof PatientDetails, v: string) => update({ patient: { ...draft.patient, [k]: v } });

  function submit(e: FormEvent) {
    e.preventDefault();
    const res = validatePatient(draft.patient);
    if (!res.ok) {
      setShowAll(true);
      const first = (['name', 'email', 'phone', 'note'] as const).find((k) => res.errors[k]);
      if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    onValid();
  }

  const field = (k: keyof PatientDetails, label: string, props: InputHTMLAttributes<HTMLInputElement>, optional = false) => {
    const id = `${uid}-${k}`;
    const err = visible[k];
    return (
      <div className="field" data-invalid={!!err || undefined}>
        <label htmlFor={id} className="field__label">
          {label} {optional && <span className="field__opt">Optional</span>}
        </label>
        <input
          id={id}
          name={k}
          className="field__input"
          value={draft.patient[k]}
          onChange={(e: ChangeEvent<HTMLInputElement>) => set(k, e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, [k]: true }))}
          aria-invalid={!!err || undefined}
          aria-describedby={err ? `${id}-err` : undefined}
          {...props}
        />
        {err && (
          <p id={`${id}-err`} className="field__error">
            <LuCircleAlert aria-hidden /> {err}
          </p>
        )}
      </div>
    );
  };

  const noteId = `${uid}-note`;
  return (
    <form id="details-form" className="step" onSubmit={submit} noValidate ref={formRef}>
      <StepIntro id={titleId} title="Your contact details" hint="Only what a clinic would need to confirm a visit. Please don't include medical information." />
      {field('name', 'Full name', { autoComplete: 'name', required: true, maxLength: 80 })}
      {field('email', 'Email address', { type: 'email', autoComplete: 'email', inputMode: 'email', required: true, maxLength: 120 })}
      {field('phone', 'Mobile number', { type: 'tel', autoComplete: 'tel', inputMode: 'tel', maxLength: 18, placeholder: '98765 43210' }, true)}
      <div className="field" data-invalid={!!visible.note || undefined}>
        <label htmlFor={noteId} className="field__label">
          Anything we should know? <span className="field__opt">Optional</span>
        </label>
        <textarea
          id={noteId}
          name="note"
          className="field__input field__input--area"
          rows={3}
          value={draft.patient.note}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => set('note', e.target.value)}
          aria-describedby={`${noteId}-count${visible.note ? ` ${noteId}-err` : ''}`}
          aria-invalid={!!visible.note || undefined}
          placeholder="For example: I feel nervous, or I prefer early appointments."
        />
        <p id={`${noteId}-count`} className="field__count" data-over={draft.patient.note.length > NOTE_MAX || undefined}>
          {draft.patient.note.length}/{NOTE_MAX}
        </p>
        {visible.note && (
          <p id={`${noteId}-err`} className="field__error">
            <LuCircleAlert aria-hidden /> {visible.note}
          </p>
        )}
      </div>
      {/* honeypot: hidden from people and screen readers; bots that fill every field get rejected by the server */}
      <div className="hp" aria-hidden="true">
        <label htmlFor={`${uid}-website`}>Website</label>
        <input id={`${uid}-website`} name="website" tabIndex={-1} autoComplete="off" value={draft.website ?? ''} onChange={(e: ChangeEvent<HTMLInputElement>) => update({ website: e.target.value })} />
      </div>
      <p className="note note--quiet">
        {LIVE
          ? 'Your details go only to the clinic’s private booking list and are used to arrange this visit.'
          : 'Demo only: what you type stays in this browser tab and is never sent anywhere.'}
      </p>
    </form>
  );
}

/* ── 6. Review ────────────────────────────────────────── */
export function ReviewStep({ titleId, error, errorCode }: StepProps & { error?: string; errorCode?: string }) {
  const { draft, goTo } = useBooking();
  const service = draft.service ? serviceById(draft.service) : undefined;
  const assigned = draft.assignedDentist ? dentistById(draft.assignedDentist) : undefined;
  const rows: { label: string; value: string; sub?: string; step: Step }[] = [
    { label: 'Treatment', value: service?.name ?? '', sub: service?.duration, step: 'service' },
    {
      label: 'Dentist',
      value: assigned?.name ?? '',
      sub: draft.dentist === 'any' ? 'Assigned for you (no preference)' : 'Sample clinician',
      step: 'dentist',
    },
    { label: 'Date', value: draft.date ? formatLongDate(draft.date) : '', step: 'date' },
    { label: 'Time', value: draft.time ? formatTime(draft.time) : '', step: 'time' },
    {
      label: 'Contact',
      value: draft.patient.name,
      sub: [draft.patient.email, draft.patient.phone].filter(Boolean).join(' · '),
      step: 'details',
    },
  ];
  return (
    <div className="step">
      <StepIntro id={titleId} title="Check your visit" hint="You can change anything before confirming." />
      {error && (
        <div className="state state--error" role="alert">
          <p>{error}</p>
          {errorCode === 'slot_taken' && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => goTo('time')}>
              Choose another time
            </button>
          )}
        </div>
      )}
      <dl className="summary">
        {rows.map((r) => (
          <div className="summary__row" key={r.label}>
            <dt>{r.label}</dt>
            <dd>
              <span className="summary__value">{r.value}</span>
              {r.sub && <span className="summary__sub">{r.sub}</span>}
            </dd>
            <button type="button" className="link-btn" onClick={() => goTo(r.step)} aria-label={`Change ${r.label.toLowerCase()}`}>
              <LuPencil aria-hidden /> Change
            </button>
          </div>
        ))}
        {draft.patient.note && (
          <div className="summary__row">
            <dt>Note</dt>
            <dd>
              <span className="summary__sub summary__note">{draft.patient.note}</span>
            </dd>
            <button type="button" className="link-btn" onClick={() => goTo('details')} aria-label="Change note">
              <LuPencil aria-hidden /> Change
            </button>
          </div>
        )}
      </dl>
      {LIVE ? (
        <p className="note note--quiet">
          By confirming, you agree the clinic may store these details to arrange your visit. The team will contact you to confirm the appointment.
        </p>
      ) : (
        <p className="note note--demo">
          This is a demonstration. Confirming will not contact a clinic, send an email or reserve a real appointment.
        </p>
      )}
    </div>
  );
}

