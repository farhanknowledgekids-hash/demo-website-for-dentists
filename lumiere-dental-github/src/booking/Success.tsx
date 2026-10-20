import { useState } from 'react';
import { LuCopy, LuCheck } from 'react-icons/lu';
import { useBooking } from './BookingContext';
import { dentistById, serviceById } from './catalog';
import { formatLongDate, formatTime } from './dates';
import { LIVE } from './config';

export function Success({ titleId }: { titleId: string }) {
  const { confirmation: c, reset, close } = useBooking();
  const [copied, setCopied] = useState(false);
  if (!c) return null;
  const first = c.patient.name.split(' ')[0];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(c.reference);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked: the reference stays selectable */
    }
  };

  return (
    <div className="step success">
      <div className="success__mark" aria-hidden>
        <svg viewBox="0 0 64 64">
          <circle className="success__ring" cx="32" cy="32" r="29" />
          <path className="success__tick" d="M20 33 l8 8 l16 -18" />
        </svg>
      </div>
      <h3 id={titleId} className="step__title success__title" tabIndex={-1}>
        {LIVE ? `Thank you, ${first}. Your request is in.` : `Your demo visit is held, ${first}.`}
      </h3>
      <p className="step__hint">
        {LIVE
          ? 'The clinic has received your booking request. The team will contact you to confirm it.'
          : 'In this demo nothing has been sent to a clinic or to your inbox. Here is what a patient would see after booking.'}
      </p>

      <div className="ref">
        <span className="ref__label">{LIVE ? 'Booking reference' : 'Demo reference'}</span>
        <span className="ref__code">{c.reference}</span>
        <button type="button" className="link-btn" onClick={copy} aria-live="polite">
          {copied ? (
            <>
              <LuCheck aria-hidden /> Copied
            </>
          ) : (
            <>
              <LuCopy aria-hidden /> Copy
            </>
          )}
        </button>
      </div>

      <dl className="summary summary--compact">
        <div className="summary__row">
          <dt>Treatment</dt>
          <dd>{serviceById(c.service)?.name}</dd>
        </div>
        <div className="summary__row">
          <dt>With</dt>
          <dd>
            {dentistById(c.dentist)?.name} {!LIVE && <span className="tag">Sample</span>}
          </dd>
        </div>
        <div className="summary__row">
          <dt>When</dt>
          <dd>
            {formatLongDate(c.date)}, {formatTime(c.time)}
          </dd>
        </div>
      </dl>

      <div className="next">
        <p className="next__title">{LIVE ? 'What happens next' : 'What would happen next'}</p>
        {LIVE ? (
          <ol className="next__list">
            <li>The clinic team reviews your request and confirms by phone or email ({c.patient.email}).</li>
            <li>Need to change or cancel? Call the clinic and quote your reference.</li>
            <li>On the day, arrive five minutes early. Your first visit starts with a conversation.</li>
          </ol>
        ) : (
          <>
            <ol className="next__list">
              <li>The clinic’s system would send a confirmation to {c.patient.email}.</li>
              <li>A reminder would follow the day before, with directions and parking notes.</li>
              <li>On the day, arrive five minutes early. Your first visit starts with a conversation.</li>
            </ol>
            <p className="note note--quiet">None of these steps happen in the demo. The time you chose is now unavailable for the rest of this browser session.</p>
          </>
        )}
      </div>

      <div className="success__actions">
        <button type="button" className="btn btn--primary" onClick={reset}>
          {LIVE ? 'Book another visit' : 'Book another demo visit'}
        </button>
        <button type="button" className="btn btn--ghost" onClick={close}>
          Back to the site
        </button>
      </div>
    </div>
  );
}
