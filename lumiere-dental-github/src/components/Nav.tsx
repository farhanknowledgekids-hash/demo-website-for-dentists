import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { LuMenu, LuX } from 'react-icons/lu';
import { clinic, navLinks } from '../data/clinic';
import { useScrolledPast } from '../hooks/useMotion';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { BookButton } from './primitives';
import { LIVE } from '../booking/config';

export function Wordmark({ light }: { light?: boolean }) {
  return (
    <span className={`wordmark${light ? ' wordmark--light' : ''}`}>
      <span className="wordmark__name">{clinic.wordmark}</span>
      <span className="wordmark__sub">Dental</span>
    </span>
  );
}

export function Nav() {
  const scrolled = useScrolledPast(24);
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState<string>('');
  const sheet = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);

  useFocusTrap(sheet, menuOpen);

  // highlight the section currently in view
  useEffect(() => {
    const ids = navLinks.map((l) => l.href.slice(1));
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => e.isIntersecting && setActive(`#${e.target.id}`));
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    document.documentElement.classList.add('is-locked');
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeMenu();
    document.addEventListener('keydown', onKey);
    window.setTimeout(() => sheet.current?.querySelector<HTMLElement>('a')?.focus(), 60);
    return () => {
      document.documentElement.classList.remove('is-locked');
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  function closeMenu(returnFocus = true) {
    setMenuOpen(false);
    if (returnFocus) toggle.current?.focus();
  }

  return (
    <header className="nav" data-scrolled={scrolled || undefined} data-menu={menuOpen || undefined}>
      <div className="nav__inner">
        <a href="#top" className="nav__brand" aria-label={`${clinic.name}, back to top`}>
          <Wordmark />
        </a>
        <nav aria-label="Main" className="nav__links">
          <ul>
            {navLinks.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="nav__link" aria-current={active === l.href ? 'true' : undefined}>
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="nav__actions">
          <BookButton size="sm" className="nav__book">
            Book a visit
          </BookButton>
          <button
            ref={toggle}
            type="button"
            className="nav__toggle"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? <LuX aria-hidden /> : <LuMenu aria-hidden />}
            <span className="sr-only">{menuOpen ? 'Close menu' : 'Open menu'}</span>
          </button>
        </div>
      </div>

      <div id="mobile-menu" className="sheet" ref={sheet} data-open={menuOpen || undefined} aria-hidden={!menuOpen} inert={!menuOpen}>
        <nav aria-label="Mobile">
          <ul className="sheet__links">
            {navLinks.map((l, i) => (
              <li key={l.href} style={{ '--i': i } as CSSProperties}>
                <a href={l.href} onClick={() => closeMenu(false)}>
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="sheet__foot" style={{ '--i': navLinks.length } as CSSProperties}>
          <span onClickCapture={() => closeMenu(false)}>
            <BookButton size="lg" className="sheet__book">
              Book a visit
            </BookButton>
          </span>
          <p className="sheet__meta">
            {clinic.area} · <span className="demo-inline">Fictional demo clinic</span>
          </p>
        </div>
      </div>
    </header>
  );
}

export function DemoBanner() {
  return (
    <div className="demo-banner" role="note">
      <p>
        <strong>Design demo.</strong>{' '}
        <span className="demo-banner__long">
          {LIVE
            ? 'Lumière Dental is a fictional clinic. People, reviews and contact details are samples; booking requests go to the site owner’s private sheet.'
            : 'Lumière Dental is a fictional clinic. People, reviews, contact details and bookings on this site are samples.'}
        </span>
        <span className="demo-banner__short">{LIVE ? 'Fictional clinic' : 'Fictional clinic & bookings'}</span>
      </p>
    </div>
  );
}
