import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';
import { addDays, addMonths, BOOKING_WINDOW_DAYS, fromISO, isBookable, isClosedDay, sameDay, startOfDay, toISO } from './dates';
import type { ISODate } from './types';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface Props {
  value?: ISODate;
  onChange: (d: ISODate) => void;
  labelledBy: string;
}

/** Accessible month calendar: arrow keys move by day/week, PageUp/PageDown by month, Home/End to week edges. */
export function Calendar({ value, onChange, labelledBy }: Props) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const last = useMemo(() => addDays(today, BOOKING_WINDOW_DAYS), [today]);
  const firstBookable = useMemo(() => {
    let d = today;
    while (!isBookable(d, today)) d = addDays(d, 1);
    return d;
  }, [today]);

  const [focusDate, setFocusDate] = useState<Date>(value ? fromISO(value) : firstBookable);
  const [month, setMonth] = useState<Date>(new Date(focusDate.getFullYear(), focusDate.getMonth(), 1));
  const grid = useRef<HTMLDivElement>(null);
  const keyboardMove = useRef(false);

  const canPrev = month > new Date(today.getFullYear(), today.getMonth(), 1);
  const canNext = addMonths(month, 1) <= last;

  const days = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7; // Monday-first
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const cells: (Date | null)[] = Array.from({ length: offset }, () => null);
    for (let i = 1; i <= count; i++) cells.push(new Date(month.getFullYear(), month.getMonth(), i));
    while (cells.length % 7) cells.push(null);
    return cells;
  }, [month]);

  useEffect(() => {
    if (!keyboardMove.current) return;
    keyboardMove.current = false;
    grid.current?.querySelector<HTMLButtonElement>(`[data-date="${toISO(focusDate)}"]`)?.focus();
  }, [focusDate, month]);

  function moveFocus(next: Date) {
    const clamped = next < today ? today : next > last ? last : next;
    keyboardMove.current = true;
    setFocusDate(clamped);
    if (clamped.getMonth() !== month.getMonth() || clamped.getFullYear() !== month.getFullYear()) {
      setMonth(new Date(clamped.getFullYear(), clamped.getMonth(), 1));
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const d = focusDate;
    const map: Record<string, () => Date> = {
      ArrowLeft: () => addDays(d, -1),
      ArrowRight: () => addDays(d, 1),
      ArrowUp: () => addDays(d, -7),
      ArrowDown: () => addDays(d, 7),
      Home: () => addDays(d, -((d.getDay() + 6) % 7)),
      End: () => addDays(d, 6 - ((d.getDay() + 6) % 7)),
      PageUp: () => new Date(d.getFullYear(), d.getMonth() - 1, d.getDate()),
      PageDown: () => new Date(d.getFullYear(), d.getMonth() + 1, d.getDate()),
    };
    const fn = map[e.key];
    if (fn) {
      e.preventDefault();
      moveFocus(fn());
    }
  }

  function changeMonth(delta: number) {
    const m = addMonths(month, delta);
    setMonth(m);
    let d = m < today ? today : m;
    while (d <= last && !isBookable(d, today)) d = addDays(d, 1);
    setFocusDate(d);
  }

  const monthLabel = month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <div className="cal">
      <div className="cal__head">
        <p className="cal__month" aria-live="polite">{monthLabel}</p>
        <div className="cal__nav">
          <button type="button" className="icon-btn" onClick={() => changeMonth(-1)} disabled={!canPrev} aria-label="Previous month">
            <LuChevronLeft aria-hidden />
          </button>
          <button type="button" className="icon-btn" onClick={() => changeMonth(1)} disabled={!canNext} aria-label="Next month">
            <LuChevronRight aria-hidden />
          </button>
        </div>
      </div>
      <div role="grid" aria-labelledby={labelledBy} className="cal__grid" ref={grid} onKeyDown={onKeyDown}>
        <div role="row" className="cal__row cal__row--head">
          {WEEKDAYS.map((w) => (
            <span role="columnheader" key={w} className="cal__wd" aria-label={w}>
              {w.slice(0, 2)}
            </span>
          ))}
        </div>
        {Array.from({ length: days.length / 7 }, (_, r) => (
          <div role="row" className="cal__row" key={r}>
            {days.slice(r * 7, r * 7 + 7).map((d, i) => {
              if (!d) return <span role="gridcell" key={i} className="cal__cell cal__cell--empty" />;
              const iso = toISO(d);
              const enabled = isBookable(d, today);
              const selected = value === iso;
              const isToday = sameDay(d, today);
              const focusable = sameDay(d, focusDate);
              const why = !enabled ? (isClosedDay(d) ? ', closed' : ', unavailable') : '';
              return (
                <span role="gridcell" key={i} className="cal__cell" aria-selected={selected}>
                  <button
                    type="button"
                    data-date={iso}
                    className="cal__day"
                    data-selected={selected || undefined}
                    data-today={isToday || undefined}
                    // aria-disabled (not disabled) keeps closed days reachable by arrow keys
                    aria-disabled={!enabled || undefined}
                    tabIndex={focusable ? 0 : -1}
                    aria-label={`${d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}${isToday ? ', today' : ''}${selected ? ', selected' : ''}${why}`}
                    onClick={() => {
                      setFocusDate(d);
                      if (enabled) onChange(iso);
                    }}
                  >
                    {d.getDate()}
                  </button>
                </span>
              );
            })}
          </div>
        ))}
      </div>
      <p className="cal__legend">
        <span><i className="dot dot--today" aria-hidden /> Today</span>
        <span>Sundays closed · bookable up to {BOOKING_WINDOW_DAYS} days ahead</span>
      </p>
    </div>
  );
}
