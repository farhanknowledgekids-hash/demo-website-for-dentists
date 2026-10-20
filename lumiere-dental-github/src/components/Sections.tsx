import { useId, useState, type CSSProperties } from 'react';
import { LuArrowLeft, LuArrowRight, LuPlus } from 'react-icons/lu';
import { comforts, faqs, journey, principles, team, testimonials } from '../data/content';
import { BookButton, Eyebrow, Img, Reveal } from './primitives';
import { useInView } from '../hooks/useMotion';

/* ── C. Approach ──────────────────────────────────────── */
export function Approach() {
  return (
    <section id="approach" className="section approach" aria-labelledby="approach-title">
      <div className="wrap approach__grid">
        <Reveal className="approach__statement">
          <Eyebrow>Our approach</Eyebrow>
          <h2 id="approach-title" className="display-2">
            Good dentistry starts with being <em>listened to.</em>
          </h2>
          <p className="lede">
            Lumière is imagined as a small practice in Bandra built around one idea: you should understand your own mouth. Every visit is planned with enough time to explain, to answer questions, and to go at your pace.
          </p>
        </Reveal>
        <Reveal className="approach__media" variant="mask">
          <Img photo="consultation" ratio={4 / 5} sizes="(min-width: 1024px) 34vw, 100vw" />
        </Reveal>
        <ul className="approach__principles">
          {principles.map((p) => (
            <li key={p.title} className="principle">
              <h3 className="principle__title">{p.title}</h3>
              <p>{p.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ── E. Patient journey ───────────────────────────────── */
export function Journey() {
  const { ref, inView } = useInView<HTMLOListElement>({ rootMargin: '0px 0px -20% 0px' });
  return (
    <section id="journey" className="section journey" aria-labelledby="journey-title">
      <div className="wrap">
        <div className="journey__head">
          <Eyebrow light>Your first visit, step by step</Eyebrow>
          <h2 id="journey-title" className="display-2">
            From first hello to a plan you understand.
          </h2>
        </div>
        <ol className="journey__steps" ref={ref} data-inview={inView || undefined}>
          {journey.map((s, i) => (
            <li key={s.title} className="jstep" style={{ '--i': i } as CSSProperties}>
              <span className="jstep__num" aria-hidden>
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="jstep__title">{s.title}</h3>
              <p>{s.body}</p>
            </li>
          ))}
        </ol>
        <div className="journey__cta">
          <BookButton variant="light">Start with a first visit</BookButton>
          <p>About 45 minutes · no treatment unless you want it</p>
        </div>
      </div>
    </section>
  );
}

/* ── F. Team ──────────────────────────────────────────── */
export function Team() {
  return (
    <section id="team" className="section team" aria-labelledby="team-title">
      <div className="wrap">
        <div className="section-head">
          <Eyebrow>The team</Eyebrow>
          <h2 id="team-title" className="display-2">
            Three clinicians, one way of working.
          </h2>
          <p className="section-head__aside">
            Sample profiles for this demo: the names, photos and roles are placeholders. A real clinic would show its own team with verified qualifications and registration numbers.
          </p>
        </div>
        <ul className="team__grid">
          {team.map((m, i) => (
            <li key={m.id} className="member">
              <Reveal className="member__photo" variant="mask" delay={i * 120}>
                <Img photo={m.photo} ratio={4 / 5} sizes="(min-width: 900px) 30vw, (min-width: 600px) 45vw, 90vw" maxWidth={1280} />
                <span className="member__tag">Sample profile</span>
              </Reveal>
              <div className="member__body">
                <h3 className="member__name">{m.name}</h3>
                <p className="member__focus">{m.focus}</p>
                <p className="member__note">{m.note}</p>
                <BookButton variant="ghost" size="sm" dentist={m.id} className="member__book">
                  Book with {m.name.split(' ').slice(0, 2).join(' ')}
                </BookButton>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ── G. Experience ────────────────────────────────────── */
export function Experience() {
  return (
    <section id="experience" className="section experience" aria-labelledby="experience-title">
      <div className="wrap experience__grid">
        <Reveal className="experience__tall" variant="mask">
          <Img photo="hallway" ratio={3 / 4.4} sizes="(min-width: 1024px) 40vw, 100vw" />
        </Reveal>
        <div className="experience__copy">
          <Eyebrow>Patient experience</Eyebrow>
          <h2 id="experience-title" className="display-2">
            Designed to feel less like a clinic.
          </h2>
          <p className="lede">
            Soft light, quiet rooms and a pace that never feels rushed. The details below describe how a practice like this would look after you, especially if the dentist is not your favourite place.
          </p>
          <ul className="comforts">
            {comforts.map((c) => (
              <li key={c.title} className="comfort">
                <h3 className="comfort__title">{c.title}</h3>
                <p>{c.body}</p>
              </li>
            ))}
          </ul>
        </div>
        <Reveal className="experience__wide" variant="mask" delay={120}>
          <Img photo="operatory" ratio={3 / 2} sizes="(min-width: 1024px) 40vw, 100vw" />
        </Reveal>
      </div>
    </section>
  );
}

/* ── H. Testimonials ──────────────────────────────────── */
export function Testimonials() {
  const [i, setI] = useState(0);
  const t = testimonials[i];
  const go = (d: number) => setI((n) => (n + d + testimonials.length) % testimonials.length);
  return (
    <section className="section voices" aria-labelledby="voices-title" aria-roledescription="carousel">
      <div className="wrap voices__grid">
        <div className="voices__head">
          <Eyebrow>In their words</Eyebrow>
          <h2 id="voices-title" className="voices__title">
            What patients might say
          </h2>
          <p className="voices__label">Illustrative testimonials written for this demo. They are not real patient reviews.</p>
        </div>
        <figure className="voices__quote" aria-live="polite">
          <blockquote key={i} className="quote">
            <p>{t.quote}</p>
          </blockquote>
          <figcaption className="quote__by">
            <span>{t.who}</span>
            <span className="quote__ctx">{t.context}</span>
          </figcaption>
          <div className="voices__controls">
            <button type="button" className="icon-btn icon-btn--ring" onClick={() => go(-1)} aria-label="Previous testimonial">
              <LuArrowLeft aria-hidden />
            </button>
            <span className="voices__count" aria-hidden>
              {i + 1} / {testimonials.length}
            </span>
            <button type="button" className="icon-btn icon-btn--ring" onClick={() => go(1)} aria-label="Next testimonial">
              <LuArrowRight aria-hidden />
            </button>
          </div>
        </figure>
      </div>
    </section>
  );
}

/* ── I. FAQ ───────────────────────────────────────────── */
export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  const uid = useId();
  return (
    <section id="faq" className="section faq" aria-labelledby="faq-title">
      <div className="wrap faq__grid">
        <div className="faq__head">
          <Eyebrow>Questions</Eyebrow>
          <h2 id="faq-title" className="display-2">
            Before you book
          </h2>
          <p>
            Still unsure about something? <a href="#contact" className="ulink">Get in touch</a> and the team would be happy to talk it through.
          </p>
        </div>
        <div className="accordion">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            const bid = `${uid}-b${i}`;
            const pid = `${uid}-p${i}`;
            return (
              <div className="acc" key={f.q} data-open={isOpen || undefined}>
                <h3 className="acc__h">
                  <button id={bid} type="button" className="acc__btn" aria-expanded={isOpen} aria-controls={pid} onClick={() => setOpen(isOpen ? null : i)}>
                    <span>{f.q}</span>
                    <LuPlus aria-hidden className="acc__icon" />
                  </button>
                </h3>
                <div id={pid} role="region" aria-labelledby={bid} className="acc__panel" inert={!isOpen}>
                  <div className="acc__inner">
                    <p>{f.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
