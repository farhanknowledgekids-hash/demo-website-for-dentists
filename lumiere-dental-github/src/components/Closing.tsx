import { useEffect, useState } from 'react';
import { LuCheck, LuClock, LuCopy, LuMail, LuMapPin, LuPhone } from 'react-icons/lu';
import { clinic, navLinks } from '../data/clinic';
import { useBooking } from '../booking/BookingContext';
import { BookButton, Eyebrow, Img } from './primitives';
import { Wordmark } from './Nav';
import { LIVE } from '../booking/config';

function CopyValue({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="copy-btn"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          window.setTimeout(() => setDone(false), 1600);
        } catch {
          /* clipboard blocked: text remains selectable */
        }
      }}
      aria-label={done ? `${label} copied` : `Copy ${label}`}
    >
      {done ? <LuCheck aria-hidden /> : <LuCopy aria-hidden />}
    </button>
  );
}

/* ── J. Contact ───────────────────────────────────────── */
export function Contact() {
  const today = new Date().getDay(); // 0 Sun … 6 Sat
  const todayRow = today === 0 ? 2 : today === 6 ? 1 : 0;
  return (
    <section id="contact" className="section contact" aria-labelledby="contact-title">
      <div className="wrap">
        <div className="section-head section-head--split">
          <div>
            <Eyebrow>Visit &amp; contact</Eyebrow>
            <h2 id="contact-title" className="display-2">
              Find us in Bandra West.
            </h2>
          </div>
          <p className="section-head__aside">All details on this page are placeholders for the demo. Please do not try to visit, call or email them.</p>
        </div>
        <div className="contact__grid">
          <div className="contact__block">
            <h3 className="contact__h">
              <LuMapPin aria-hidden /> Address
            </h3>
            <address>
              {clinic.addressLines.map((l) => (
                <span key={l}>{l}</span>
              ))}
            </address>
            <h3 className="contact__h">
              <LuPhone aria-hidden /> Phone
            </h3>
            <p className="contact__line">
              <span className="contact__value">{clinic.phoneDisplay}</span>
              <span className="tag">Demo</span>
              <CopyValue value={clinic.phoneDisplay} label="phone number" />
            </p>
            <h3 className="contact__h">
              <LuMail aria-hidden /> Email
            </h3>
            <p className="contact__line">
              <span className="contact__value">{clinic.email}</span>
              <CopyValue value={clinic.email} label="email address" />
            </p>
          </div>

          <div className="contact__block">
            <h3 className="contact__h">
              <LuClock aria-hidden /> Opening hours <span className="tag">Sample</span>
            </h3>
            <table className="hours">
              <caption className="sr-only">Sample opening hours</caption>
              <tbody>
                {clinic.hours.map((h, i) => (
                  <tr key={h.days} data-today={i === todayRow || undefined}>
                    <th scope="row">
                      {h.days}
                      {i === todayRow && <span className="hours__today">Today</span>}
                    </th>
                    <td>{h.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="contact__small">Emergency? A real clinic would list an urgent-care number here.</p>
          </div>

          <div className="map" role="img" aria-label="Location placeholder. This is a stylised drawing, not a map of a real clinic.">
            <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden>
              <rect width="400" height="300" className="map__ground" />
              <path className="map__sea" d="M0 0 H92 C80 60 104 110 86 170 C72 220 96 260 84 300 H0 Z" />
              <g className="map__roads">
                <path d="M86 40 C170 60 250 40 400 70" />
                <path d="M92 150 C190 140 280 170 400 160" />
                <path d="M88 250 C200 240 300 260 400 240" />
                <path d="M170 0 C180 100 160 200 190 300" />
                <path d="M300 0 C290 90 320 200 300 300" />
              </g>
              <g className="map__minor">
                <path d="M120 95 H380" />
                <path d="M110 205 H390" />
                <path d="M240 0 V300" />
              </g>
            </svg>
            <span className="map__pin" aria-hidden>
              <span />
            </span>
            <span className="map__label">Location placeholder · not a real map</span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── K. Final call to action ──────────────────────────── */
export function FinalCta() {
  return (
    <section className="closing" aria-labelledby="closing-title">
      <div className="closing__copy">
        <Eyebrow light>Whenever you are ready</Eyebrow>
        <h2 id="closing-title" className="closing__title">
          Come in for a conversation. <em>The rest can wait.</em>
        </h2>
        <p>Choose a time that suits you. Booking takes about a minute, and you can change your mind later.</p>
        <BookButton variant="light" size="lg">
          Book your visit
        </BookButton>
      </div>
      <div className="closing__media">
        <Img photo="closing" ratio={4 / 5} sizes="(min-width: 900px) 50vw, 100vw" />
      </div>
    </section>
  );
}

/* ── L. Footer ────────────────────────────────────────── */
export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap footer__grid">
        <div className="footer__brand">
          <Wordmark light />
          <p>Calm, modern dentistry in {clinic.area}. A fictional clinic created to demonstrate website design.</p>
        </div>
        <nav aria-label="Footer" className="footer__col">
          <h2 className="footer__h">Explore</h2>
          <ul>
            {navLinks.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="ulink ulink--light">
                  {l.label}
                </a>
              </li>
            ))}
            <li>
              <a href="#faq" className="ulink ulink--light">
                FAQ
              </a>
            </li>
          </ul>
        </nav>
        <div className="footer__col">
          <h2 className="footer__h">Contact (demo)</h2>
          <ul>
            <li>{clinic.phoneDisplay}</li>
            <li>{clinic.email}</li>
            <li>{clinic.addressLines[1]}</li>
          </ul>
        </div>
        <div className="footer__col">
          <h2 className="footer__h">Privacy</h2>
          <p>
            {LIVE
              ? 'Booking requests are stored in a private spreadsheet that only the clinic’s staff can open, and are used only to arrange appointments. No cookies or analytics are used; fonts and photos load from Google Fonts and Unsplash.'
              : 'This demo has no backend. Booking details stay in your browser tab and are cleared when you close it. No cookies or analytics are used; fonts and photos load from Google Fonts and Unsplash.'}
          </p>
        </div>
      </div>
      <div className="wrap">
        <div className="footer__base">
        <p>
          <strong>Demo disclosure:</strong> Lumière Dental, its clinicians, testimonials, contact details and availability are fictional. Nothing on this site is medical advice.
        </p>
        <p>
          Photography from{' '}
          <a href="https://unsplash.com" className="ulink ulink--light" target="_blank" rel="noreferrer">
            Unsplash
          </a>
          , used under the Unsplash License.
        </p>
        </div>
      </div>
    </footer>
  );
}

/* Mobile-only booking bar, shown after the hero and hidden near the closing CTA or while booking. */
export function MobileBookBar() {
  const { isOpen } = useBooking();
  const [show, setShow] = useState(false);
  useEffect(() => {
    const hero = document.querySelector('.hero');
    const closing = document.querySelector('.closing');
    let heroVisible = true;
    let closingVisible = false;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.target === hero) heroVisible = e.isIntersecting;
        if (e.target === closing) closingVisible = e.isIntersecting;
      });
      setShow(!heroVisible && !closingVisible);
    });
    hero && io.observe(hero);
    closing && io.observe(closing);
    return () => io.disconnect();
  }, []);
  return (
    <div className="mbar" data-show={(show && !isOpen) || undefined} inert={!show || isOpen}>
      <div className="mbar__text">
        <span className="mbar__title">Lumière Dental</span>
        <span className="mbar__sub">{LIVE ? 'Mon–Sat · book online' : 'Mon–Sat · demo booking'}</span>
      </div>
      <BookButton size="sm">Book a visit</BookButton>
    </div>
  );
}
