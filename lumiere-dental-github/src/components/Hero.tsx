import { Fragment, useEffect, useRef, type CSSProperties } from 'react';
import { LuArrowDown, LuArrowRight } from 'react-icons/lu';
import { clinic } from '../data/clinic';
import { useBooking } from '../booking/BookingContext';
import { useMediaQuery, useReducedMotion } from '../hooks/useMotion';
import { BookButton, Img } from './primitives';

/** Small card layered over the portrait: restates the booking promise right where the eye lands. */
function HeroCard() {
  const { open } = useBooking();
  return (
    <div className="hero-card intro" style={delay(900)}>
      <p className="hero-card__label">First visit</p>
      <p className="hero-card__title">A conversation, a gentle check, and a clear plan.</p>
      <div className="hero-card__row">
        <span>45 min · Mon–Sat</span>
        <button type="button" className="hero-card__btn" onClick={() => open({ service: 'checkup' })} aria-haspopup="dialog">
          Choose a time <LuArrowRight aria-hidden />
        </button>
      </div>
    </div>
  );
}

/* Line breaks are art-directed: each array is one line of the headline. */
const LINES = [['A', 'more'], ['confident'], ['smile', 'starts', 'here.']];
const delay = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties;

export function Hero() {
  const frame = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const finePointer = useMediaQuery('(hover: hover) and (pointer: fine)');

  // Signature interaction: the portrait drifts a few pixels toward the pointer, like light moving across it.
  useEffect(() => {
    const el = frame.current;
    if (!el || reduce || !finePointer) return;
    const hero = el.closest('.hero') as HTMLElement;
    let raf = 0;
    let tx = 0,
      ty = 0,
      cx = 0,
      cy = 0;
    const tick = () => {
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;
      el.style.setProperty('--px', cx.toFixed(3));
      el.style.setProperty('--py', cy.toFixed(3));
      raf = Math.abs(tx - cx) > 0.002 || Math.abs(ty - cy) > 0.002 ? requestAnimationFrame(tick) : 0;
    };
    const onMove = (e: PointerEvent) => {
      const r = hero.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const onLeave = () => {
      tx = 0;
      ty = 0;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    hero.addEventListener('pointermove', onMove);
    hero.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(raf);
      hero.removeEventListener('pointermove', onMove);
      hero.removeEventListener('pointerleave', onLeave);
    };
  }, [reduce, finePointer]);

  let word = 0;
  return (
    <section className="hero" id="top" aria-labelledby="hero-title">
      <div className="hero__inner">
        <div className="hero__top">
          <p className="eyebrow hero__eyebrow intro" style={delay(0)}>
            Dentistry in {clinic.area}
          </p>
          <h1 id="hero-title" className="hero__title">
            {LINES.map((line, i) => (
              <span className="hero__line" key={i}>
                {line.map((w, j) => (
                  <Fragment key={w}>
                    {j > 0 && ' '}
                    <span className="hero__word">
                      <span className={w === 'confident' ? 'hero__em' : undefined} style={delay(140 + word++ * 70)}>
                        {w}
                      </span>
                    </span>
                  </Fragment>
                ))}
                {i < LINES.length - 1 && ' '}
              </span>
            ))}
          </h1>
        </div>

        <figure className="hero__media">
          <div className="hero__frame" ref={frame}>
            <Img photo="hero" ratio={4 / 5} priority maxWidth={1600} sizes="(min-width: 1024px) 40vw, 100vw" className="hero__img" />
          </div>
          <HeroCard />
          <figcaption className="hero__caption">
            <span>{clinic.name}</span>
            <span>Fictional clinic · demo photography</span>
          </figcaption>
        </figure>

        <div className="hero__bottom">
          <p className="hero__lede intro" style={delay(560)}>
            Calm, unhurried care from a team that explains everything before anything happens. For check-ups, cosmetic work, and people who would rather not be at the dentist at all.
          </p>
          <div className="hero__ctas intro" style={delay(640)}>
            <BookButton size="lg">Book your visit</BookButton>
            <a href="#treatments" className="btn btn--text">
              Explore our care
            </a>
          </div>
          <ul className="hero__facts intro" style={delay(720)} aria-label="At a glance">
            <li>Open six days a week</li>
            <li>Nervous patients welcome</li>
            <li>Costs agreed before treatment</li>
          </ul>
        </div>
      </div>
      <a href="#approach" className="hero__scroll" aria-label="Scroll to our approach">
        <span className="hero__scroll-line" aria-hidden />
        <LuArrowDown aria-hidden />
      </a>
    </section>
  );
}
