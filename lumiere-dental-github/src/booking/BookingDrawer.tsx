import { useEffect, useRef, useState } from 'react';
import { LuArrowLeft, LuArrowRight, LuCheck, LuX } from 'react-icons/lu';
import { STEP_LABELS, STEPS, stepComplete, useBooking, type Step } from './BookingContext';
import { DateStep, DentistStep, DetailsStep, ReviewStep, ServiceStep, TimeStep } from './steps';
import { Success } from './Success';
import { LIVE, scheduler } from './scheduler';
import { BookingError } from './types';
import { useFocusTrap } from '../hooks/useFocusTrap';

const TITLE_ID = 'booking-step-title';

export function BookingDrawer() {
  const { isOpen, close, step, goTo, draft, complete } = useBooking();
  const panel = useRef<HTMLDivElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>();
  const [submitCode, setSubmitCode] = useState<string>();
  const inFlight = useRef(false);
  const [mounted, setMounted] = useState(isOpen);
  const prevStep = useRef<Step>(step);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    if (!mounted || !isOpen) {
      setOpened(false);
      return;
    }
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setOpened(true)));
    return () => cancelAnimationFrame(r);
  }, [mounted, isOpen]);

  // keep the panel mounted through its closing transition
  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      return;
    }
    const t = window.setTimeout(() => setMounted(false), 520);
    return () => window.clearTimeout(t);
  }, [isOpen]);

  useFocusTrap(panel, isOpen);

  // Escape closes; background is made inert and unscrollable while open
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !inFlight.current) close();
    };
    document.addEventListener('keydown', onKey);
    const page = document.getElementById('page');
    page?.setAttribute('inert', '');
    const sbw = window.innerWidth - document.documentElement.clientWidth;
    document.documentElement.style.setProperty('--sbw', `${sbw}px`);
    document.documentElement.classList.add('is-locked');
    return () => {
      document.removeEventListener('keydown', onKey);
      page?.removeAttribute('inert');
      document.documentElement.classList.remove('is-locked');
    };
  }, [isOpen, close]);

  // move focus to the new step's heading so screen readers announce it
  useEffect(() => {
    const order: Step[] = [...STEPS, 'success'];
    setDirection(order.indexOf(step) >= order.indexOf(prevStep.current) ? 1 : -1);
    prevStep.current = step;
    if (step !== 'review') setSubmitError(undefined);
    if (!isOpen) return;
    const t = window.setTimeout(() => panel.current?.querySelector<HTMLElement>(`#${TITLE_ID}`)?.focus({ preventScroll: true }), 40);
    panel.current?.querySelector('.drawer__body')?.scrollTo({ top: 0 });
    return () => window.clearTimeout(t);
  }, [step, isOpen]);

  if (!mounted) return null;

  const idx = STEPS.indexOf(step as (typeof STEPS)[number]);
  const isSuccess = step === 'success';
  const canContinue = stepComplete(step, draft);

  async function confirm() {
    if (inFlight.current) return; // duplicate-submission guard
    if (!draft.service || !draft.assignedDentist || !draft.date || !draft.time || !draft.dentist) return;
    inFlight.current = true;
    setSubmitting(true);
    setSubmitError(undefined);
    try {
      const c = await scheduler.createBooking({
        service: draft.service,
        dentist: draft.assignedDentist,
        requestedDentist: draft.dentist,
        date: draft.date,
        time: draft.time,
        patient: { ...draft.patient, name: draft.patient.name.trim(), email: draft.patient.email.trim() },
        website: draft.website ?? '',
      });
      complete(c);
    } catch (e) {
      setSubmitError(e instanceof BookingError ? e.message : 'Something went wrong. Please try again.');
      setSubmitCode(e instanceof BookingError ? e.code : 'network');
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  function next() {
    if (step === 'review') return void confirm();
    if (step === 'details') {
      // let the form run its own validation and focus handling
      (document.getElementById('details-form') as HTMLFormElement | null)?.requestSubmit();
      return;
    }
    if (canContinue && idx < STEPS.length - 1) goTo(STEPS[idx + 1]);
  }

  const body = (() => {
    switch (step) {
      case 'service':
        return <ServiceStep titleId={TITLE_ID} />;
      case 'dentist':
        return <DentistStep titleId={TITLE_ID} />;
      case 'date':
        return <DateStep titleId={TITLE_ID} />;
      case 'time':
        return <TimeStep titleId={TITLE_ID} />;
      case 'details':
        return <DetailsStep titleId={TITLE_ID} onValid={() => goTo('review')} />;
      case 'review':
        return <ReviewStep titleId={TITLE_ID} error={submitError} errorCode={submitCode} />;
      case 'success':
        return <Success titleId={TITLE_ID} />;
    }
  })();

  // the selection steps advance on tap, so their footer button only appears once something is chosen
  const showContinue = !isSuccess && (['details', 'review'].includes(step) || canContinue);

  return (
    <div className="drawer" data-open={(isOpen && opened) || undefined}>
      <div className="drawer__scrim" onClick={() => !inFlight.current && close()} aria-hidden />
      <div
        className="drawer__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-dialog-title"
        aria-describedby="booking-demo-note"
        ref={panel}
      >
        <header className="drawer__head">
          <div className="drawer__titles">
            <h2 id="booking-dialog-title" className="drawer__title">
              {isSuccess ? 'Visit requested' : 'Book a visit'}
            </h2>
            {!isSuccess && (
              <p className="drawer__stepline" aria-live="polite">
                Step {idx + 1} of {STEPS.length} · {STEP_LABELS[step as (typeof STEPS)[number]]}
              </p>
            )}
          </div>
          <button type="button" className="icon-btn icon-btn--lg" onClick={close} aria-label="Close booking" disabled={submitting}>
            <LuX aria-hidden />
          </button>
        </header>

        {!isSuccess && (
          <ol className="progress" aria-label="Booking steps">
            {STEPS.map((s, i) => {
              const done = i < idx;
              const reachable = i <= idx || STEPS.slice(0, i).every((p) => stepComplete(p, draft));
              return (
                <li key={s} className="progress__item" data-state={i === idx ? 'current' : done ? 'done' : 'todo'}>
                  <button
                    type="button"
                    className="progress__btn"
                    disabled={!reachable || submitting}
                    onClick={() => goTo(s)}
                    aria-current={i === idx ? 'step' : undefined}
                    aria-label={`${STEP_LABELS[s]}${done ? ', completed' : ''}`}
                  >
                    <span className="progress__bar" aria-hidden />
                    <span className="progress__label">{STEP_LABELS[s]}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        )}

        <p id="booking-demo-note" className="drawer__demo">
          {LIVE ? 'Your request goes straight to the clinic’s booking list' : 'Demo booking · nothing is sent to a real clinic'}
        </p>

        <div className="drawer__body">
          <div key={step} className="drawer__step" data-dir={direction}>
            {body}
          </div>
        </div>

        {!isSuccess && (idx > 0 || showContinue) && (
          <footer className="drawer__foot">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => goTo(STEPS[Math.max(0, idx - 1)])}
              disabled={idx === 0 || submitting}
              data-hidden={idx === 0 || undefined}
            >
              <LuArrowLeft aria-hidden /> Back
            </button>
            {showContinue && (
              <button type="button" className="btn btn--primary" onClick={next} disabled={submitting} aria-busy={submitting || undefined}>
                {step === 'review' ? (
                  submitting ? (
                    <>
                      <span className="spinner" aria-hidden /> Confirming…
                    </>
                  ) : (
                    <>
                      <LuCheck aria-hidden /> Confirm booking
                    </>
                  )
                ) : (
                  <>
                    Continue <LuArrowRight aria-hidden />
                  </>
                )}
              </button>
            )}
          </footer>
        )}
      </div>
    </div>
  );
}
