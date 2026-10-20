import { useState, type CSSProperties, type ElementType, type ReactNode } from 'react';
import { LuArrowRight } from 'react-icons/lu';
import { photos, type PhotoKey } from '../data/images';
import { useInView } from '../hooks/useMotion';
import { useBooking } from '../booking/BookingContext';
import type { DentistChoice, ServiceId } from '../booking/types';

interface ImgProps {
  photo: PhotoKey;
  /** width / height of the frame */
  ratio: number;
  /** kept for call-site compatibility; photos are bundled at one well-compressed size */
  sizes?: string;
  maxWidth?: number;
  priority?: boolean;
  className?: string;
  style?: CSSProperties;
  alt?: string;
}

/** Cropped photo with a tonal placeholder that holds its space while it decodes. */
export function Img({ photo, ratio, priority, className = '', style, alt }: ImgProps) {
  const p = photos[photo];
  const [state, setState] = useState<'loading' | 'loaded' | 'failed'>('loading');
  return (
    <span className={`img ${className}`} data-state={state} style={{ aspectRatio: String(ratio), ...style }}>
      <img
        src={p.src}
        alt={alt ?? p.alt}
        width={1000}
        height={Math.round(1000 / ratio)}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        style={{ objectPosition: `${(p.fx ?? 0.5) * 100}% ${(p.fy ?? 0.5) * 100}%` }}
        ref={(el: HTMLImageElement | null) => {
          // cached images can finish before React attaches onLoad
          if (el?.complete && el.naturalWidth > 0 && state === 'loading') setState('loaded');
        }}
        onLoad={() => setState('loaded')}
        onError={() => setState('failed')}
      />
    </span>
  );
}

/** Wrapper that reveals its children once, when scrolled into view. */
export function Reveal({
  as: Tag = 'div',
  children,
  className = '',
  delay = 0,
  variant = 'rise',
  ...rest
}: {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  delay?: number;
  variant?: 'rise' | 'fade' | 'mask';
  id?: string;
  'aria-labelledby'?: string;
}) {
  const { ref, inView } = useInView<HTMLElement>();
  return (
    <Tag
      ref={ref}
      className={`reveal reveal--${variant} ${className}`}
      data-inview={inView || undefined}
      style={delay ? ({ '--d': `${delay}ms` } as CSSProperties) : undefined}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function Eyebrow({ children, light }: { children: ReactNode; light?: boolean }) {
  return <p className={`eyebrow${light ? ' eyebrow--light' : ''}`}>{children}</p>;
}

/** Primary booking button: every one opens the same drawer, optionally pre-selecting a service or dentist. */
export function BookButton({
  children = 'Book a visit',
  service,
  dentist,
  variant = 'primary',
  size,
  className = '',
}: {
  children?: ReactNode;
  service?: ServiceId;
  dentist?: DentistChoice;
  variant?: 'primary' | 'light' | 'ghost' | 'outline-light';
  size?: 'sm' | 'lg';
  className?: string;
}) {
  const { open } = useBooking();
  return (
    <button
      type="button"
      className={`btn btn--${variant}${size ? ` btn--${size}` : ''} ${className}`}
      onClick={() => open({ service, dentist })}
      aria-haspopup="dialog"
    >
      <span>{children}</span>
      <LuArrowRight aria-hidden className="btn__arrow" />
    </button>
  );
}
