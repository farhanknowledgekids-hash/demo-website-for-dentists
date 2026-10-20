import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { LuArrowUpRight, LuClock, LuPlus } from 'react-icons/lu';
import { treatments, type Treatment } from '../data/content';
import { useMediaQuery } from '../hooks/useMotion';
import { BookButton, Eyebrow, Img } from './primitives';

function Detail({ t }: { t: Treatment }) {
  return (
    <>
      <p className="tx__desc">{t.description}</p>
      <ul className="tx__points">
        {t.points.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      <p className="tx__visit">
        <LuClock aria-hidden /> {t.visit} <span className="tx__sample">· sample timing</span>
      </p>
      <div className="tx__actions">
        <BookButton service={t.service} size="sm">
          {t.service === 'emergency' ? 'Request an emergency visit' : 'Book this treatment'}
        </BookButton>
        <a href="#contact" className="btn btn--text btn--sm">
          Ask a question
        </a>
      </div>
    </>
  );
}

/** Desktop: a vertical tab list with a large image panel. Mobile: an image-led disclosure list. */
export function Treatments() {
  const wide = useMediaQuery('(min-width: 960px)');
  return (
    <section id="treatments" className="section treatments" aria-labelledby="treatments-title">
      <div className="wrap">
        <div className="section-head section-head--split">
          <div>
            <Eyebrow>Treatments</Eyebrow>
            <h2 id="treatments-title" className="display-2">
              Care for every stage of your smile.
            </h2>
          </div>
          <p className="section-head__aside">
            Every treatment begins with an examination and an honest conversation. What follows depends on you: there are no packages, and no plan goes ahead until you are comfortable with it.
          </p>
        </div>
        {wide ? <Explorer /> : <MobileList />}
      </div>
    </section>
  );
}

function Explorer() {
  const [active, setActive] = useState(0);
  const uid = useId();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const hoverTimer = useRef(0);
  const t = treatments[active];

  // hover intent: sweeping the pointer down the list shouldn't flick through every photo
  const hoverTo = (i: number) => {
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => setActive(i), 140);
  };
  const cancelHover = () => window.clearTimeout(hoverTimer.current);

  function onKey(e: KeyboardEvent) {
    const n = treatments.length;
    const map: Record<string, number> = { ArrowDown: active + 1, ArrowUp: active - 1, Home: 0, End: n - 1 };
    if (e.key in map) {
      e.preventDefault();
      const next = (map[e.key] + n) % n;
      setActive(next);
      tabs.current[next]?.focus();
    }
  }

  return (
    <div className="explorer">
      <div role="tablist" aria-orientation="vertical" aria-label="Treatments" className="explorer__list" onKeyDown={onKey}>
        {treatments.map((x, i) => (
          <button
            key={x.id}
            ref={(el: HTMLButtonElement | null) => {
              tabs.current[i] = el;
            }}
            role="tab"
            id={`${uid}-tab-${i}`}
            aria-selected={i === active}
            aria-controls={`${uid}-panel`}
            tabIndex={i === active ? 0 : -1}
            className="explorer__tab"
            onClick={() => {
              cancelHover();
              setActive(i);
            }}
            onMouseEnter={() => hoverTo(i)}
            onMouseLeave={cancelHover}
          >
            <span className="explorer__name">{x.name}</span>
            <span className="explorer__short">{x.short}</span>
            <LuArrowUpRight aria-hidden className="explorer__arrow" />
          </button>
        ))}
      </div>
      <div className="explorer__panel" role="tabpanel" id={`${uid}-panel`} aria-labelledby={`${uid}-tab-${active}`}>
        <div className="explorer__media">
          {treatments.map((x, i) => (
            <div key={x.id} className="explorer__img" data-active={i === active || undefined} aria-hidden={i !== active}>
              <Img photo={x.photo} ratio={4 / 3} sizes="(min-width: 960px) 46vw, 100vw" maxWidth={1600} />
            </div>
          ))}
        </div>
        <div className="explorer__detail" key={t.id}>
          <h3 className="tx__name">{t.name}</h3>
          <Detail t={t} />
        </div>
      </div>
    </div>
  );
}

function MobileList() {
  const [open, setOpen] = useState<string | null>(treatments[0].id);
  const uid = useId();
  return (
    <ul className="txlist">
      {treatments.map((t) => {
        const isOpen = open === t.id;
        return (
          <li key={t.id} className="txitem" data-open={isOpen || undefined}>
            <h3 className="txitem__h">
              <button
                type="button"
                className="txitem__btn"
                aria-expanded={isOpen}
                aria-controls={`${uid}-${t.id}`}
                onClick={() => setOpen(isOpen ? null : t.id)}
              >
                <span>
                  <span className="txitem__name">{t.name}</span>
                  <span className="txitem__short">{t.short}</span>
                </span>
                <LuPlus aria-hidden className="acc__icon" />
              </button>
            </h3>
            <div id={`${uid}-${t.id}`} className="acc__panel" inert={!isOpen}>
              {/* padding lives on an inner element so the collapsed panel shrinks to exactly 0px */}
              <div className="acc__inner">
                <div className="txitem__body">
                  <Img photo={t.photo} ratio={3 / 2} sizes="100vw" maxWidth={1280} />
                  <Detail t={t} />
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
