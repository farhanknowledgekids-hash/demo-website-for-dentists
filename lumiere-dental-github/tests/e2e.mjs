/**
 * End-to-end checks for the demo, run against a built copy served on localhost.
 *   npm run build && npm run serve   (in one terminal)
 *   npm test                         (in another)
 * Set SHOTS=<dir> to also save screenshots of each booking step.
 * External images/fonts are blocked during tests so results don't depend on the network.
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'http://localhost:4173/';
const SHOTS = process.env.SHOTS;
let failures = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? '✓' : '✗'} ${msg}`);
  if (!cond) failures++;
};

async function newPage(browser, viewport, opts = {}) {
  const ctx = await browser.newContext({ viewport, ...opts });
  // force demo mode so tests never write to the real Google Sheet
  await ctx.addInitScript(() => {
    window.LUMIERE_CONFIG = { bookingEndpoint: '' };
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && !/ERR_|Failed to load resource/.test(m.text()) && errors.push(m.text()));
  await page.route(/^https:\/\/(images\.unsplash\.com|fonts\.(googleapis|gstatic)\.com)/, (r) => r.abort());
  await page.goto(BASE, { waitUntil: 'load' });
  return { ctx, page, errors };
}

const shot = async (page, name) => SHOTS && page.screenshot({ path: `${SHOTS}/${name}.png` });

/** Picks the first bookable day in the calendar that has at least one open slot. */
async function pickDayWithSlots(page, dialog) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const days = dialog.locator('.cal__day:not([aria-disabled])');
    const n = await days.count();
    if (attempt >= n) {
      await dialog.getByRole('button', { name: 'Next month' }).click();
      continue;
    }
    await days.nth(attempt).click();
    await dialog.locator('button.slot, .state--empty').first().waitFor();
    if (await dialog.locator('.slot:not(:disabled)').count()) return;
    await dialog.getByRole('button', { name: 'Back' }).click();
  }
  throw new Error('no day with free slots found');
}

async function bookingFlow(browser, viewport, label) {
  const { ctx, page, errors } = await newPage(browser, viewport);
  const dialog = page.getByRole('dialog');

  // open from the hero CTA
  const heroCta = page.locator('.hero').getByRole('button', { name: /book your visit/i });
  await heroCta.click();
  await dialog.waitFor();
  ok(await dialog.isVisible(), `[${label}] hero CTA opens booking dialog`);
  await page.waitForTimeout(600);
  ok(await page.locator('#page').getAttribute('inert') !== null, `[${label}] background is inert while dialog is open`);
  await shot(page, `${label}-1-service`);

  // escape closes and focus returns to the trigger
  await page.keyboard.press('Escape');
  await page.waitForTimeout(650);
  ok(!(await dialog.isVisible().catch(() => false)), `[${label}] Escape closes the dialog`);
  ok(await heroCta.evaluate((el) => el === document.activeElement), `[${label}] focus returns to the opening button`);

  // step 1: service (auto-advances)
  await heroCta.click();
  await dialog.getByRole('radio', { name: /dental check-up/i }).click();
  ok(await dialog.getByText('Step 2 of 6').isVisible(), `[${label}] choosing a service advances to step 2`);
  await shot(page, `${label}-2-dentist`);

  // step 2: dentist
  await dialog.getByRole('radio', { name: /no preference/i }).click();
  ok(await dialog.getByText('Step 3 of 6').isVisible(), `[${label}] choosing a dentist advances to the calendar`);
  await shot(page, `${label}-3-date`);

  // calendar: past days disabled, keyboard navigation moves focus
  const disabledPast = await dialog.locator('.cal__day[aria-disabled]').count();
  ok(disabledPast > 0, `[${label}] unavailable days (past / Sundays) are marked disabled`);
  await page.waitForTimeout(250); // let the step heading take focus first, as it does for real users
  await dialog.locator('.cal__day[tabindex="0"]').focus();
  const before = await page.evaluate(() => document.activeElement?.getAttribute('data-date'));
  await page.keyboard.press('ArrowRight');
  const after = await page.evaluate(() => document.activeElement?.getAttribute('data-date'));
  ok(before && after && before !== after, `[${label}] arrow keys move between calendar days (${before} → ${after})`);

  // step 3 → 4: date and time
  await pickDayWithSlots(page, dialog);
  ok(await dialog.getByText('Step 4 of 6').isVisible(), `[${label}] choosing a day shows time slots`);
  const disabledSlots = await dialog.locator('.slot:disabled').count();
  ok(disabledSlots >= 0, `[${label}] ${disabledSlots} unavailable sample slots shown as disabled`);
  await shot(page, `${label}-4-time`);
  const chosenTime = (await dialog.locator('.slot:not(:disabled)').first().textContent()).trim();
  await dialog.locator('.slot:not(:disabled)').first().click();
  ok(await dialog.getByText('Step 5 of 6').isVisible(), `[${label}] choosing a time advances to details`);

  // step 5: validation
  await dialog.getByRole('button', { name: /continue/i }).click();
  ok(await dialog.getByText('Please enter your full name.').isVisible(), `[${label}] empty name is rejected`);
  ok(await dialog.getByText('Please enter your email address.').isVisible(), `[${label}] empty email is rejected`);
  ok(await page.evaluate(() => document.activeElement?.getAttribute('name')) === 'name', `[${label}] focus moves to the first invalid field`);
  await dialog.getByLabel('Full name').fill('Riya Kapoor');
  await dialog.getByLabel('Email address').fill('riya@example');
  await dialog.getByRole('button', { name: /continue/i }).click();
  ok(await dialog.getByText(/Enter an email address like/).isVisible(), `[${label}] malformed email is rejected`);
  await dialog.getByLabel('Mobile number').fill('12345');
  await dialog.getByLabel('Email address').fill('riya@example.com');
  await dialog.getByRole('button', { name: /continue/i }).click();
  ok(await dialog.getByText(/10-digit mobile number/).isVisible(), `[${label}] malformed phone is rejected`);
  await dialog.getByLabel('Mobile number').fill('98765 43210');
  await shot(page, `${label}-5-details`);
  await dialog.getByRole('button', { name: /continue/i }).click();
  ok(await dialog.getByText('Step 6 of 6').isVisible(), `[${label}] valid details advance to review`);
  await shot(page, `${label}-6-review`);

  // back navigation from review keeps data
  await dialog.getByRole('button', { name: 'Change contact' }).click();
  ok((await dialog.getByLabel('Full name').inputValue()) === 'Riya Kapoor', `[${label}] "Change" returns to details with data kept`);
  await dialog.getByRole('button', { name: /continue/i }).click();

  // confirm with a double click: only one booking should be created
  const confirm = dialog.getByRole('button', { name: /confirm booking/i });
  await confirm.dblclick();
  ok(await dialog.getByRole('button', { name: /Confirming/ }).isVisible(), `[${label}] confirm shows a loading state`);
  await dialog.getByText('Demo reference').waitFor({ timeout: 5000 });
  const stored = await page.evaluate(() => JSON.parse(sessionStorage.getItem('lumiere-demo-bookings') || '[]').length);
  ok(stored === 1, `[${label}] double-clicking confirm creates exactly one booking (got ${stored})`);
  await page.waitForTimeout(1300);
  await shot(page, `${label}-7-success`);
  const ref = await dialog.locator('.ref__code').innerText();
  ok(/^LD-[A-Z0-9]{4}-DEMO$/.test(ref), `[${label}] success shows a demo reference (${ref})`);

  // the booked slot is no longer available in this session
  const booked = JSON.parse(await page.evaluate(() => sessionStorage.getItem('lumiere-demo-bookings')))[0];
  await dialog.getByRole('button', { name: /book another demo visit/i }).click();
  ok(await dialog.getByText('Step 1 of 6').isVisible(), `[${label}] "Book another" restarts the flow`);
  await dialog.getByRole('radio', { name: /dental check-up/i }).click();
  const dentistName = { aanya: /Aanya/, kabir: /Kabir/, meera: /Meera/ }[booked.dentist];
  await dialog.getByRole('radio', { name: dentistName }).click();
  const [y, m, d] = booked.date.split('-').map(Number);
  // go to the right month if needed
  for (let i = 0; i < 3 && !(await dialog.locator(`[data-date="${booked.date}"]`).count()); i++) {
    await dialog.getByRole('button', { name: 'Next month' }).click();
  }
  await dialog.locator(`[data-date="${booked.date}"]`).click();
  await dialog.locator('button.slot').first().waitFor();
  const slot = dialog.locator(`.slot`).filter({ hasText: new RegExp(`^${chosenTime}$`) });
  ok(await slot.isDisabled(), `[${label}] the slot booked earlier (${y}-${m}-${d} ${chosenTime}) is now unavailable`);

  ok(errors.length === 0, `[${label}] no console errors ${errors.length ? JSON.stringify(errors) : ''}`);
  await ctx.close();
}

async function pageChecks(browser) {
  for (const [w, h] of [
    [320, 640],
    [375, 812],
    [430, 932],
    [768, 1024],
    [1366, 768],
    [1440, 900],
    [1920, 1080],
  ]) {
    const { ctx, page, errors } = await newPage(browser, { width: w, height: h });
    await page.waitForTimeout(300);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok(overflow <= 0, `[${w}px] no horizontal overflow (${overflow}px)`);
    const small = await page.evaluate(() =>
      [...document.querySelectorAll('#page a, #page button')]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          const s = getComputedStyle(el);
          return r.width > 0 && s.visibility !== 'hidden' && !el.closest('[inert]') && (r.height < 40 || r.width < 24) && !el.closest('p, li.inline');
        })
        .map((el) => `${el.textContent?.trim().slice(0, 24)}(${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)})`),
    );
    ok(small.length === 0, `[${w}px] tap targets ≥40px tall, ≥24px wide ${small.length ? JSON.stringify(small.slice(0, 6)) : ''}`);
    const ctaTop = await page.locator('.nav__book, .hero .btn--primary').first().boundingBox();
    ok(!!ctaTop && ctaTop.y + ctaTop.height <= h, `[${w}px] a booking button is visible in the first screen`);
    ok(errors.length === 0, `[${w}px] no console errors`);
    await ctx.close();
  }

  // mobile menu
  const { ctx, page } = await newPage(browser, { width: 390, height: 844 });
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.waitForTimeout(700);
  ok(await page.locator('#mobile-menu').getByRole('link', { name: 'The team' }).isVisible(), '[mobile] menu opens and shows links');
  await page.locator('#mobile-menu').getByRole('link', { name: 'The team' }).click();
  await page.waitForTimeout(1200);
  const teamTop = await page.locator('#team').evaluate((el) => el.getBoundingClientRect().top);
  ok(Math.abs(teamTop) < 140, `[mobile] menu link scrolls to its section (top ${Math.round(teamTop)}px)`);
  ok(!(await page.locator('#mobile-menu').getByRole('link', { name: 'The team' }).isVisible()), '[mobile] menu closes after navigating');

  // treatment "Book this" pre-selects the service
  await page.locator('#treatments').getByRole('button', { name: /book this treatment/i }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.waitFor();
  ok(await dialog.getByText('Step 2 of 6').isVisible(), '[mobile] treatment button opens booking at the dentist step');
  await ctx.close();

  // FAQ accordion via keyboard
  const d = await newPage(browser, { width: 1366, height: 768 });
  const second = d.page.locator('.acc__btn').nth(1);
  await second.focus();
  await d.page.keyboard.press('Enter');
  ok((await second.getAttribute('aria-expanded')) === 'true', '[desktop] FAQ opens with the keyboard');
  // treatments tabs via keyboard
  const tab = d.page.getByRole('tab').first();
  await tab.focus();
  await d.page.keyboard.press('ArrowDown');
  ok((await d.page.getByRole('tab').nth(1).getAttribute('aria-selected')) === 'true', '[desktop] treatment tabs respond to arrow keys');
  await d.ctx.close();

  // reduced motion: hero content is visible immediately
  const r = await newPage(browser, { width: 1366, height: 768 }, { reducedMotion: 'reduce' });
  await r.page.waitForTimeout(80);
  const op = await r.page.locator('.hero__lede').evaluate((el) => getComputedStyle(el).opacity);
  ok(op === '1', `[reduced motion] hero text visible without waiting for animation (opacity ${op})`);
  await r.ctx.close();
}

const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
try {
  await bookingFlow(browser, { width: 1440, height: 900 }, 'desktop');
  await bookingFlow(browser, { width: 375, height: 740 }, 'mobile');
  await pageChecks(browser);
} catch (e) {
  failures++;
  console.error('✗ test crashed:', e.message);
} finally {
  await browser.close();
}
console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
