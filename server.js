/**
 * Lumière Dental — local website + bookings spreadsheet.
 *
 *   Double-click "Start Website.bat" (or run: node server.js)
 *
 * - Serves the website at http://localhost:4173 and opens it in your browser.
 * - Every booking is added as a new row to  Bookings.csv  in this folder (opens in Excel).
 * - Each booking is also copied to your Google Sheet (if dist/config.js has a Google URL).
 * - Times already in Bookings.csv are shown as unavailable on the website.
 *
 * No installs needed: uses only Node.js built-ins. Booking rules come from apps-script/Code.gs,
 * so the local spreadsheet and the Google Sheet always apply exactly the same checks.
 */
const http = require('node:http');
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { exec } = require('node:child_process');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');
const CSV = path.join(ROOT, 'Bookings.csv');
const PENDING = path.join(ROOT, 'Bookings-pending.csv');
const PORT = Number(process.env.PORT) || 4173;
const TZ = 'Asia/Kolkata';

const HEADERS = ['Received', 'Reference', 'Status', 'Treatment', 'Dentist', 'Requested dentist', 'Date', 'Time', 'Patient name', 'Email', 'Phone', 'Note', 'Google Sheet', 'Service id', 'Dentist id'];

/* ── Load the booking rules from Code.gs (same rules as the Google Sheet) ── */
function formatDate(d, tz, pattern) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );
  return pattern.replace("'T'", 'T').replace('yyyy', parts.year).replace('MM', parts.month).replace('dd', parts.day).replace('HH', parts.hour).replace('mm', parts.minute).replace('ss', parts.second);
}
const rules = { Utilities: { formatDate }, console };
vm.createContext(rules);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'apps-script', 'Code.gs'), 'utf8'), rules);

/* ── Google Sheet URL from dist/config.js (optional copy of every booking) ── */
function googleEndpoint() {
  try {
    const m = fs.readFileSync(path.join(DIST, 'config.js'), 'utf8').match(/bookingEndpoint:\s*'(https:\/\/script\.google\.com\/[^']+)'/);
    return m ? m[1] : '';
  } catch {
    return '';
  }
}

/* ── CSV helpers ───────────────────────────────────────────────────────── */
const csvCell = (v) => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // stop Excel formula injection
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
const csvLine = (row) => row.map(csvCell).join(',') + '\r\n';

function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function readRows(file) {
  try {
    return parseCsv(fs.readFileSync(file, 'utf8').replace(/^﻿/, '')).slice(1).filter((r) => r.length > 7);
  } catch {
    return [];
  }
}

function ensureCsv() {
  if (!fs.existsSync(CSV)) fs.writeFileSync(CSV, '﻿' + csvLine(HEADERS)); // BOM so Excel shows é, ₹ etc.
}

/** Taken slots on a date: [{time, dentist}] — from Bookings.csv and any pending rows. */
function bookedOn(date) {
  const H = HEADERS;
  return [...readRows(CSV), ...readRows(PENDING)]
    .filter((r) => r[H.indexOf('Date')] === date && r[H.indexOf('Status')] !== 'Cancelled')
    .map((r) => ({ time: r[H.indexOf('Time')], dentist: r[H.indexOf('Dentist id')] }));
}

/** Appends a row. If Excel has the file open (locked), keeps it in Bookings-pending.csv and merges later. */
function appendRow(row) {
  ensureCsv();
  flushPending();
  try {
    // tests create Bookings.csv.locktest to imitate Excel holding the file open
    if (fs.existsSync(CSV + '.locktest')) throw Object.assign(new Error('locked'), { code: 'EBUSY' });
    fs.appendFileSync(CSV, csvLine(row));
    return 'saved';
  } catch (err) {
    if (!['EBUSY', 'EPERM', 'EACCES'].includes(err.code)) throw err;
    if (!fs.existsSync(PENDING)) fs.writeFileSync(PENDING, '﻿' + csvLine(HEADERS));
    fs.appendFileSync(PENDING, csvLine(row));
    console.log('  Bookings.csv is open in Excel, so this booking was kept in Bookings-pending.csv.');
    console.log('  Close Excel and it will be moved into Bookings.csv automatically.');
    return 'pending';
  }
}

function flushPending() {
  const rows = readRows(PENDING);
  if (!rows.length) return;
  try {
    if (fs.existsSync(CSV + '.locktest')) throw new Error('locked');
    fs.appendFileSync(CSV, rows.map(csvLine).join(''));
    fs.unlinkSync(PENDING);
    console.log(`  Moved ${rows.length} pending booking(s) into Bookings.csv.`);
  } catch {
    /* still locked: try again on the next booking or in 30 seconds */
  }
}
setInterval(flushPending, 30_000).unref();

/* ── Copy to Google Sheet (best effort) ────────────────────────────────── */
function postJson(url, body, redirects = 0) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const isPost = body !== undefined;
    const req = https.request(
      u,
      { method: isPost ? 'POST' : 'GET', headers: isPost ? { 'Content-Type': 'text/plain;charset=utf-8', 'Content-Length': Buffer.byteLength(body) } : {}, timeout: 20000 },
      (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirects < 5) {
          res.resume();
          // Apps Script answers a POST with a redirect that must be fetched with GET
          return resolve(postJson(new URL(res.headers.location, u).toString(), undefined, redirects + 1));
        }
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            reject(new Error('Unexpected reply from Google'));
          }
        });
      },
    );
    req.on('timeout', () => req.destroy(new Error('Google did not answer in time')));
    req.on('error', reject);
    if (isPost) req.write(body);
    req.end();
  });
}

/* ── Booking endpoint (same protocol as the Google Apps Script) ────────── */
async function handleBooking(raw) {
  let body = null;
  try {
    body = raw.length <= 5000 ? JSON.parse(raw) : null;
  } catch {}
  const result = rules.validateBooking(body, new Date());
  if (!result.ok) return result;
  const b = result.booking;
  const dentist = rules.resolveDentist(b, bookedOn(b.date));
  if (!dentist) return { ok: false, error: 'slot_taken', message: 'That time has just been booked by someone else. Please choose another time.' };

  const reference = rules.makeReference();
  let google = 'Not connected';
  const endpoint = googleEndpoint();
  if (endpoint) {
    try {
      const g = await postJson(endpoint, JSON.stringify({ ...body, dentist, requestedDentist: b.requestedDentist }));
      google = g.ok ? `Copied (${g.reference})` : `Not copied: ${g.message || g.error}`;
    } catch (err) {
      google = `Not copied: ${err.message}`;
    }
  }

  const where = appendRow([
    formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss'),
    reference,
    'New',
    rules.SERVICES[b.service],
    rules.DENTISTS[dentist],
    b.requestedDentist === 'any' ? 'No preference' : rules.DENTISTS[b.requestedDentist],
    b.date,
    b.time,
    b.name,
    b.email,
    b.phone,
    b.note,
    google,
    b.service,
    dentist,
  ]);
  console.log(`  New booking ${reference}: ${b.name}, ${rules.SERVICES[b.service]}, ${b.date} ${b.time} with ${rules.DENTISTS[dentist]} → ${where === 'saved' ? 'Bookings.csv' : 'Bookings-pending.csv'} · Google Sheet: ${google}`);
  return { ok: true, reference, dentist, date: b.date, time: b.time };
}

/* ── Static files ──────────────────────────────────────────────────────── */
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg' };

function send(res, status, type, body) {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname === '/api') {
      if (req.method === 'GET') {
        const date = url.searchParams.get('date');
        if (url.searchParams.get('action') === 'slots') {
          if (!rules.isIsoDate(date)) return send(res, 200, 'application/json', JSON.stringify({ ok: false, error: 'invalid', message: 'A valid date is required.' }));
          return send(res, 200, 'application/json', JSON.stringify({ ok: true, date, booked: bookedOn(date) }));
        }
        return send(res, 200, 'application/json', JSON.stringify({ ok: true, service: 'lumiere-local', spreadsheet: CSV }));
      }
      if (req.method === 'POST') {
        let raw = '';
        for await (const chunk of req) {
          raw += chunk;
          if (raw.length > 10000) break;
        }
        return send(res, 200, 'application/json', JSON.stringify(await handleBooking(raw)));
      }
      return send(res, 405, 'text/plain', 'Method not allowed');
    }
    // the site talks to this local server instead of directly to Google
    if (url.pathname === '/config.js') {
      return send(res, 200, TYPES['.js'], "window.LUMIERE_CONFIG = { bookingEndpoint: location.origin + '/api' };\n");
    }
    let file = path.normalize(decodeURIComponent(url.pathname)).replace(/^([/\\])+/, '');
    if (!file || file.endsWith('/') || file.endsWith('\\')) file += 'index.html';
    const full = path.join(DIST, file);
    if (!full.startsWith(DIST)) return send(res, 403, 'text/plain', 'Forbidden');
    const data = fs.readFileSync(full);
    send(res, 200, TYPES[path.extname(full)] || 'application/octet-stream', data);
  } catch (err) {
    if (err.code === 'ENOENT') return send(res, 404, 'text/plain', 'Not found');
    console.error(err);
    send(res, 500, 'application/json', JSON.stringify({ ok: false, error: 'server', message: 'Something went wrong. Please try again.' }));
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`\nThe website is already running at http://localhost:${PORT} (opening it for you).`);
    openBrowser();
    setTimeout(() => process.exit(0), 1500);
  } else throw err;
});

function openBrowser() {
  if (process.env.NO_BROWSER) return;
  const url = `http://localhost:${PORT}`;
  const cmd = process.platform === 'win32' ? `start "" "${url}"` : process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
  exec(cmd, () => {});
}

server.listen(PORT, () => {
  ensureCsv();
  console.log('\n  Lumière Dental is running');
  console.log(`  Website:      http://localhost:${PORT}`);
  console.log(`  Spreadsheet:  ${CSV}`);
  console.log(`  Google Sheet: ${googleEndpoint() ? 'every booking is also copied there' : 'not connected'}`);
  console.log('\n  Keep this window open while you use the website. Close it to stop.\n');
  openBrowser();
});
