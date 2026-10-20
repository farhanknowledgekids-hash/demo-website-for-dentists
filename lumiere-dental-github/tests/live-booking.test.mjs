/**
 * Live-mode test: the real website talks to the real apps-script/Code.gs, with Google's servers
 * replaced by an in-memory fake sheet. Proves bookings land in the sheet and that slots are shared
 * between different visitors.
 *   npm run serve   (in another terminal)
 *   node tests/live-booking.test.mjs
 */
import { chromium } from 'playwright';
import { makeEnv } from './fake-apps-script.mjs';

const BASE = process.env.BASE_URL || 'http://localhost:4173/';
const ENDPOINT = 'https://script.google.com/macros/s/TEST-DEPLOYMENT/exec';
let failures = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? '✓' : '✗'} ${msg}`);
  if (!cond) failures++;
};

const sheet = makeEnv();
sheet.ctx.setup();
const requests = [];
let offline = false;

async function visitor(browser, viewport = { width: 1280, height: 860 }) {
  const ctx = await browser.newContext({ viewport });
  await ctx.addInitScript((url) => {
    window.LUMIERE_CONFIG = { bookingEndpoint: url };
  }, ENDPOINT);
  await ctx.route(/^https:\/\/(images\.unsplash\.com|fonts\.)/, (r) => r.abort());
  // Google's servers → the real Code.gs running against the fake sheet
  await ctx.route(/^https:\/\/script\.google\.com\//, async (route) => {
    const req = route.request();
    requests.push({ method: req.method(), url: req.url(), type: req.headers()['content-type'], body: req.postData() });
    if (offline) return route.abort('internetdisconnected');
    const url = new URL(req.url());
    const out =
      req.method() === 'POST'
        ? sheet.ctx.doPost({ postData: { contents: req.postData() } })
        : sheet.ctx.doGet({ parameter: Object.fromEntries(url.searchParams) });
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: out.text });
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(BASE);
  return { ctx, page, errors, dialog: page.getByRole('dialog') };
}

/** Opens booking, picks check-up + Dr. Aanya, and the first day that has a free slot. Returns {date}. */
async function toTimes(v, dentist = /Aanya/) {
  if (!(await v.dialog.isVisible().catch(() => false))) await v.page.locator('.hero').getByRole('button', { name: /book your visit/i }).click();
  await v.dialog.getByRole('radio', { name: /dental check-up/i }).click();
  await v.dialog.getByRole('radio', { name: dentist }).click();
  for (let i = 0; i < 25; i++) {
    const days = v.dialog.locator('.cal__day:not([aria-disabled])');
    if (i >= (await days.count())) {
      await v.dialog.getByRole('button', { name: 'Next month' }).click();
      continue;
    }
    const date = await days.nth(i).getAttribute('data-date');
    await days.nth(i).click();
    await v.dialog.locator('button.slot, .state--empty, .state--error').first().waitFor();
    if (await v.dialog.locator('button.slot:not(:disabled)').count()) return { date };
    await v.dialog.getByRole('button', { name: 'Back' }).click();
  }
  throw new Error('no free day');
}

async function fillDetails(v, name, email) {
  await v.dialog.getByLabel('Full name').fill(name);
  await v.dialog.getByLabel('Email address').fill(email);
  await v.dialog.getByLabel('Mobile number').fill('98765 43210');
  await v.dialog.getByRole('button', { name: /continue/i }).click();
  await v.dialog.getByText('Step 6 of 6').waitFor();
}

const browser = await chromium.launch();
try {
  // ── Visitor A books a slot ───────────────────────────────
  const a = await visitor(browser);
  ok(await a.page.getByText(/booking requests go to the site owner/i).isVisible(), 'live mode is switched on by config.js');
  const { date } = await toTimes(a);
  const time = (await a.dialog.locator('button.slot:not(:disabled)').first().textContent()).trim();
  await a.dialog.locator('button.slot:not(:disabled)').first().click();
  await fillDetails(a, 'Riya Kapoor', 'riya@example.com');
  ok(await a.dialog.getByText(/agree the clinic may store these details/).isVisible(), 'review step shows the consent line instead of the demo notice');
  await a.dialog.getByRole('button', { name: /confirm booking/i }).dblclick();
  await a.dialog.getByText('Booking reference').waitFor({ timeout: 8000 });
  const ref = (await a.dialog.locator('.ref__code').textContent()).trim();
  ok(/^LD-[A-Z2-9]{6}$/.test(ref), `visitor A sees a real booking reference (${ref})`);
  ok(await a.dialog.getByText(/your request is in/i).isVisible(), 'success screen uses live wording');
  ok(sheet.rows.length === 1, 'exactly one row was added to the sheet (double-click guarded)');
  const row = sheet.rows[0];
  ok(row[1] === ref && row[2] === 'New' && row[4] === 'Dr. Aanya Mehra' && row[6] === `'${date}`, `row matches the booking (${row[1]}, ${row[4]}, ${String(row[6]).slice(1)} ${String(row[7]).slice(1)})`);
  ok(row[8] === 'Riya Kapoor' && row[9] === 'riya@example.com' && row[10] === '98765 43210', 'row holds the patient’s contact details');
  const post = requests.find((r) => r.method === 'POST');
  ok(post && post.type.startsWith('text/plain'), 'booking is sent as a simple text/plain POST (no CORS preflight)');
  ok(post && JSON.parse(post.body).website === '', 'honeypot value is sent empty for a real visitor');
  ok(requests.filter((r) => r.method === 'GET').every((r) => !/riya/i.test(r.url)), 'availability requests carry no personal data');

  // ── Visitor B, a different browser, sees the slot as taken ──
  const b = await visitor(browser, { width: 390, height: 844 });
  await b.page.locator('.hero').getByRole('button', { name: /book your visit/i }).click();
  await b.dialog.getByRole('radio', { name: /dental check-up/i }).click();
  await b.dialog.getByRole('radio', { name: /Aanya/ }).click();
  for (let i = 0; i < 3 && !(await b.dialog.locator(`[data-date="${date}"]`).count()); i++) {
    await b.dialog.getByRole('button', { name: 'Next month' }).click();
  }
  await b.dialog.locator(`[data-date="${date}"]`).click();
  await b.dialog.locator('button.slot').first().waitFor();
  const sameSlot = b.dialog.locator('button.slot').filter({ hasText: new RegExp(`^${time}$`) });
  ok(await sameSlot.isDisabled(), `visitor B (another device) cannot pick ${date} ${time} with Dr. Aanya`);
  await b.ctx.close();

  // ── Visitor C loses a race: slot taken between choosing and confirming ──
  const c = await visitor(browser);
  const { date: cDate } = await toTimes(c);
  const cTime = (await c.dialog.locator('button.slot:not(:disabled)').first().textContent()).trim();
  await c.dialog.locator('button.slot:not(:disabled)').first().click();
  await fillDetails(c, 'Kabir Shah', 'kabir@example.com');
  const toHHMM = (t) => {
    const [, h, m, ap] = t.match(/(\d+):(\d+)\s*(am|pm)/);
    return `${String((Number(h) % 12) + (ap === 'pm' ? 12 : 0)).padStart(2, '0')}:${m}`;
  };
  // someone else books that exact slot while C is on the review step
  const sneaky = JSON.parse(
    sheet.ctx.doPost({
      postData: {
        contents: JSON.stringify({ service: 'checkup', dentist: 'aanya', requestedDentist: 'aanya', date: cDate, time: toHHMM(cTime), patient: { name: 'Other Person', email: 'other@example.com', phone: '', note: '' } }),
      },
    }).text,
  );
  ok(sneaky.ok, `another booking takes ${cDate} ${cTime} first`);
  await c.dialog.getByRole('button', { name: /confirm booking/i }).click();
  await c.dialog.locator('.state--error').waitFor({ timeout: 8000 });
  ok(await c.dialog.getByText(/just been booked by someone else/).isVisible(), 'visitor C is told the time was just taken');
  ok(await c.dialog.getByRole('button', { name: 'Choose another time' }).isVisible(), 'and is offered "Choose another time"');
  const rowsBefore = sheet.rows.length;
  await c.dialog.getByRole('button', { name: 'Choose another time' }).click();
  await c.dialog.locator('button.slot').first().waitFor();
  ok(await c.dialog.locator('button.slot').filter({ hasText: new RegExp(`^${cTime}$`) }).isDisabled(), 'the lost slot now shows as unavailable');
  await c.dialog.locator('button.slot:not(:disabled)').first().click();
  await c.dialog.getByRole('button', { name: /continue/i }).click();
  await c.dialog.getByRole('button', { name: /confirm booking/i }).click();
  await c.dialog.getByText('Booking reference').waitFor({ timeout: 8000 });
  ok(sheet.rows.length === rowsBefore + 1, 'visitor C books a different time successfully');

  // ── Network failure ───────────────────────────────────────
  await c.dialog.getByRole('button', { name: /book another visit/i }).click();
  await toTimes(c, /Meera/);
  await c.dialog.locator('button.slot:not(:disabled)').first().click();
  await fillDetails(c, 'Kabir Shah', 'kabir2@example.com');
  offline = true;
  const before = sheet.rows.length;
  await c.dialog.getByRole('button', { name: /confirm booking/i }).click();
  await c.dialog.locator('.state--error').waitFor({ timeout: 25000 });
  ok(await c.dialog.getByText(/could not reach the booking system/).isVisible(), 'offline: a clear "could not reach" message is shown');
  ok(await c.dialog.getByRole('button', { name: /confirm booking/i }).isEnabled(), 'offline: Confirm stays available to retry');
  offline = false;
  await c.dialog.getByRole('button', { name: /confirm booking/i }).click();
  await c.dialog.getByText('Booking reference').waitFor({ timeout: 8000 });
  ok(sheet.rows.length === before + 1, 'retry after reconnecting saves the booking');

  ok(a.errors.length + c.errors.length === 0, `no page errors ${JSON.stringify([...a.errors, ...c.errors])}`);
  await a.ctx.close();
  await c.ctx.close();
} catch (e) {
  failures++;
  console.error('✗ test crashed:', e.message);
} finally {
  await browser.close();
}
console.log(failures ? `\n${failures} check(s) failed` : '\nAll live-booking checks passed');
process.exit(failures ? 1 : 0);
