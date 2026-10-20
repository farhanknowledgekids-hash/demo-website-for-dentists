# Lumière Dental — website design demo

A fictional premium dental clinic in Bandra West, Mumbai, built as a sales demo you can show dentists. It has a full landing page and a working **front-end-only** appointment booking flow.

> Everything about the clinic is fictional: the clinicians, testimonials, address, phone, email and hours. The site says so in its banner, section notes, booking drawer and footer. Bookings are demo-only until you connect your own Google Sheet (see below).

## Use it with a bookings spreadsheet (recommended)

Double-click **`Start Website.bat`**. It runs `server.js` (Node.js, no installs), opens the site at http://localhost:4173, and writes every booking as a row in **`Bookings.csv`** in this folder, which opens in Excel. Each booking is also copied to the Google Sheet configured in `dist/config.js`. See `HOW TO USE.txt`.

## View it

**Quickest:** open `dist/index.html` in Chrome, Edge or Safari. It works straight from the folder, no server needed. Photos and fonts load from Unsplash and Google Fonts, so you need an internet connection.

**With a local server** (needs Node.js 18+):

```bash
npm run serve        # serves ./dist at http://localhost:4173
```

## Develop

```bash
npm install          # React, esbuild, TypeScript, Playwright
npm run dev          # rebuilds on every change (run `npm run serve` alongside)
npm run build        # production build into ./dist
npm run typecheck    # TypeScript, strict mode
```

Stack: React 19 + TypeScript, bundled by esbuild into one script and one stylesheet. Hand-written CSS with design tokens (`src/styles/tokens.css`). Lucide icons via `react-icons/lu`. No CSS framework or animation library. Motion uses CSS transitions plus a small IntersectionObserver hook, and all of it is switched off under `prefers-reduced-motion`.

## Structure

```
src/
  data/          clinic details, treatments, team, FAQs, photos   ← edit these to rebrand
  components/    Nav, Hero, Treatments, Sections, Closing, primitives
  booking/       BookingContext (state), BookingDrawer, steps, Calendar,
                 mockScheduler (fake availability), types (SchedulingProvider interface)
  hooks/         focus trap, media queries, in-view
  styles/        tokens, base, layout, sections, booking
tests/e2e.mjs    booking flow, validation, keyboard, responsive and reduced-motion checks
```

## Bookings: demo mode or your Google Sheet

The booking flow runs in one of two modes, chosen by **`dist/config.js`** (source: `public/config.js`):

| | Demo mode (default) | Google Sheet mode |
|---|---|---|
| Turn on | leave `bookingEndpoint: ''` | paste your Apps Script `/exec` URL |
| Where bookings go | nowhere; kept in the visitor's tab | a new row in **your private Google Sheet** |
| Who can see bookings | nobody | only you, plus anyone you share the sheet with |
| Taken times | blocked in that browser tab only | blocked for every visitor, on every device |
| Availability | generated sample pattern | all opening-hours times, minus booked ones |

**To set up Google Sheet mode, follow [`apps-script/SETUP.md`](apps-script/SETUP.md)** (about 10 minutes, free).

How it works: `apps-script/Code.gs` is a small Google Apps Script web app attached to your sheet. The site calls it twice:
- `GET ?action=slots&date=…` returns the taken times for a day, never names or contacts
- `POST` with the booking: the script re-validates every field, checks the slot under a lock so two people can't take the same time, writes the row, and optionally emails the admin

It also has a honeypot field against bots, per-email and global rate limits, and protection against formula injection in the sheet. Marking a row's Status as **Cancelled** frees that time again.

Works in both modes:
- 6 steps (treatment → dentist or no preference → date → time → details → review), then a confirmation screen
- Calendar with past days and Sundays disabled, a 60-day window and full keyboard support
- Validation with focus moved to the first error; "Change" links on the review step
- Loading, empty, slot-just-taken, offline/retry and success states
- Protection against duplicate submission; focus trap, Escape to close, background made inert

Code: `src/booking/scheduler.ts` picks `sheetScheduler.ts` (live) or `mockScheduler.ts` (demo). Both implement `SchedulingProvider` in `types.ts`, so another backend (Cal.com, a practice-management API) can replace the sheet the same way.

## Tests

```bash
npm run build && npm run serve   # terminal 1
npm test                         # terminal 2
```

- `tests/apps-script.test.mjs`: runs the real `Code.gs` against an in-memory fake Google Sheet (validation, double-booking, cancelling, rate limits, honeypot, admin email)
- `tests/e2e.mjs`: demo-mode booking flow, keyboard, responsive and reduced-motion checks
- `tests/live-booking.test.mjs`: the real site plus the real `Code.gs`, with Google's servers faked; checks two visitors, a booking race, and an offline retry

## Rebranding for a real clinic

- **Name, address, phone, hours:** `src/data/clinic.ts`
- **Treatments, team, comforts, testimonials, FAQs:** `src/data/content.ts`. Use only real, verified credentials and genuine reviews with patient permission.
- **Booking services and durations:** `src/booking/catalog.ts`
- **Photos:** `src/data/images.ts`. Replace the Unsplash ids with the clinic's own photography (set `cdn: false` and use local paths in `public/`).
- **Colours, fonts, spacing:** `src/styles/tokens.css` (the font link is in `public/index.html`)
- **Demo labels:** search the code for "demo", "Sample" and "Illustrative", and remove them once the content is real
- Remove `<meta name="robots" content="noindex">` from `public/index.html` when going live.

## Photography

All photos are from [Unsplash](https://unsplash.com) under the Unsplash License, served from the Unsplash image CDN in responsive sizes. Team photos are illustrative stock portraits used for fictional profiles.

## Known limitations

- The demo needs an internet connection for photos and fonts.
- `types-offline/` and `tsconfig.offline.json` are a stand-in for `@types/react`, used only because the original build environment had no package registry. With `npm install`, use `npm run typecheck`, which checks against the real React types.
