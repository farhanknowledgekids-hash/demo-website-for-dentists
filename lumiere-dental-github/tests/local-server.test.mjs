/**
 * Tests "Start Website.bat" mode: server.js serves the site and writes bookings to Bookings.csv.
 * Runs in a temporary copy of the project so your real Bookings.csv is never touched.
 *   node tests/local-server.test.mjs
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dir = mkdtempSync(join(tmpdir(), 'lumiere-'));
for (const p of ['server.js', 'dist', 'apps-script']) cpSync(join(root, p), join(dir, p), { recursive: true });
// no Google copy during tests
writeFileSync(join(dir, 'dist', 'config.js'), "window.LUMIERE_CONFIG = window.LUMIERE_CONFIG || { bookingEndpoint: '' };\n");
const CSV = join(dir, 'Bookings.csv');
const PORT = 4191;
const BASE = `http://localhost:${PORT}/`;

let failures = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? '✓' : '✗'} ${msg}`);
  if (!cond) failures++;
};

const srv = spawn(process.execPath, ['server.js'], { cwd: dir, env: { ...process.env, PORT: String(PORT), NO_BROWSER: '1' } });
let log = '';
srv.stdout.on('data', (d) => (log += d));
srv.stderr.on('data', (d) => (log += d));
for (let i = 0; i < 50 && !log.includes('is running'); i++) await new Promise((r) => setTimeout(r, 100));
ok(log.includes('is running'), 'server starts');
ok(existsSync(CSV), 'Bookings.csv is created in the folder on start');

const rows = () => readFileSync(CSV, 'utf8').replace(/^﻿/, '').trim().split(/\r?\n/).slice(1);

async function visitor(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(BASE);
  return { ctx, page, errors, dialog: page.getByRole('dialog') };
}

async function book(v, { name, email, dentist = /Aanya/, pickTime }) {
  if (!(await v.dialog.isVisible().catch(() => false))) await v.page.locator('.hero').getByRole('button', { name: /book your visit/i }).click();
  await v.dialog.getByRole('radio', { name: /dental check-up/i }).click();
  await v.dialog.getByRole('radio', { name: dentist }).click();
  let date;
  for (let i = 0; i < 25; i++) {
    const days = v.dialog.locator('.cal__day:not([aria-disabled])');
    if (i >= (await days.count())) {
      await v.dialog.getByRole('button', { name: 'Next month' }).click();
      continue;
    }
    date = await days.nth(i).getAttribute('data-date');
    await days.nth(i).click();
    await v.dialog.locator('button.slot, .state--empty, .state--error').first().waitFor();
    if (await v.dialog.locator('button.slot:not(:disabled)').count()) break;
    await v.dialog.getByRole('button', { name: 'Back' }).click();
  }
  const slot = pickTime ? v.dialog.locator('button.slot').filter({ hasText: new RegExp(`^${pickTime}$`) }) : v.dialog.locator('button.slot:not(:disabled)').first();
  const time = (await slot.textContent()).trim();
  await slot.click();
  await v.dialog.getByLabel('Full name').fill(name);
  await v.dialog.getByLabel('Email address').fill(email);
  await v.dialog.getByLabel('Mobile number').fill('98765 43210');
  await v.dialog.getByRole('button', { name: /continue/i }).click();
  await v.dialog.getByRole('button', { name: /confirm booking/i }).click();
  await v.dialog.locator('.ref__code, .state--error').first().waitFor({ timeout: 15000 });
  return { date, time };
}

const browser = await chromium.launch();
try {
  const a = await visitor(browser);
  ok(await a.page.locator('.hero__title').isVisible(), 'website loads from the local server');
  const imgOk = await a.page.evaluate(async () => {
    const img = document.querySelector('.hero__img img');
    await img.decode().catch(() => {});
    return img.naturalWidth > 0;
  });
  ok(imgOk, 'hero photo loads (bundled, no internet needed)');

  const first = await book(a, { name: 'Riya Kapoor', email: 'riya@example.com' });
  ok(await a.dialog.getByText('Booking reference').isVisible(), 'visitor sees a booking reference');
  let r = rows();
  ok(r.length === 1, `one row written to Bookings.csv (${r.length})`);
  const cells = r[0].split(',');
  ok(cells.includes('Riya Kapoor') && cells.includes('riya@example.com') && cells.includes('98765 43210'), 'row has name, email and phone');
  ok(cells.includes(first.date) && cells.includes('Dental check-up') && cells.includes('Dr. Aanya Mehra'), `row has date (${first.date}), treatment and dentist`);
  ok(/^﻿/.test(readFileSync(CSV, 'utf8')), 'file starts with a BOM so Excel reads accents correctly');

  // second visitor cannot take the same slot
  const b2 = await visitor(browser);
  await b2.page.locator('.hero').getByRole('button', { name: /book your visit/i }).click();
  await b2.dialog.getByRole('radio', { name: /dental check-up/i }).click();
  await b2.dialog.getByRole('radio', { name: /Aanya/ }).click();
  for (let i = 0; i < 3 && !(await b2.dialog.locator(`[data-date="${first.date}"]`).count()); i++) await b2.dialog.getByRole('button', { name: 'Next month' }).click();
  await b2.dialog.locator(`[data-date="${first.date}"]`).click();
  await b2.dialog.locator('button.slot').first().waitFor();
  ok(await b2.dialog.locator('button.slot').filter({ hasText: new RegExp(`^${first.time}$`) }).isDisabled(), `another visitor sees ${first.date} ${first.time} as booked`);
  await b2.ctx.close();

  // Excel has the file open (simulated by making it read-only) → booking kept as pending, then merged
  writeFileSync(CSV + '.locktest', '');
  await a.dialog.getByRole('button', { name: /book another visit/i }).click();
  await book(a, { name: 'Kabir Shah', email: 'kabir@example.com', dentist: /Meera/ });
  ok(await a.dialog.getByText('Booking reference').isVisible(), 'booking still succeeds while the spreadsheet is locked');
  ok(existsSync(join(dir, 'Bookings-pending.csv')), 'locked spreadsheet: booking is kept in Bookings-pending.csv');
  unlinkSync(CSV + '.locktest');
  await a.dialog.getByRole('button', { name: /book another visit/i }).click();
  await book(a, { name: 'Meera Joshi', email: 'meera@example.com', dentist: /Kabir/ });
  r = rows();
  ok(r.length === 3 && !existsSync(join(dir, 'Bookings-pending.csv')), `after unlocking, pending booking is merged (rows: ${r.length})`);

  // marking a row Cancelled in Excel frees the slot
  const text = readFileSync(CSV, 'utf8').replace(',New,Dental check-up,Dr. Aanya Mehra', ',Cancelled,Dental check-up,Dr. Aanya Mehra');
  writeFileSync(CSV, text);
  const slots = await (await fetch(`${BASE}api?action=slots&date=${first.date}`)).json();
  ok(!slots.booked.some((s) => s.dentist === 'aanya'), 'setting Status to "Cancelled" in the spreadsheet frees the time');
  ok(!JSON.stringify(slots).includes('Riya'), 'availability never exposes names');

  const bad = await (await fetch(`${BASE}api`, { method: 'POST', body: JSON.stringify({ service: 'x' }) })).json();
  ok(!bad.ok && bad.error === 'invalid', 'invalid booking is rejected by the server');
  ok(log.includes('New booking') && log.includes('Riya Kapoor'), 'server window shows each new booking');
  ok(a.errors.length === 0, `no page errors ${JSON.stringify(a.errors)}`);
  await a.ctx.close();
} catch (e) {
  failures++;
  console.error('✗ test crashed:', e.message, '\n', log);
} finally {
  await browser.close();
  srv.kill();
}
console.log(failures ? `\n${failures} check(s) failed` : '\nAll local-spreadsheet checks passed');
process.exit(failures ? 1 : 0);
