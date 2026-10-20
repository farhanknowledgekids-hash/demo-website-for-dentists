/**
 * Lumière Dental — booking backend (Google Apps Script)
 *
 * Every booking made on the website becomes a row in a private Google Sheet.
 * Only the sheet's owner (and anyone they choose to share it with) can open it.
 * The website can do exactly two things through this script:
 *   GET  ?action=slots&date=YYYY-MM-DD   → which times are already taken (no personal data)
 *   POST {booking JSON}                  → validate and add one booking row
 *
 * Setup: see apps-script/SETUP.md. In short: paste this file into Extensions → Apps Script
 * of a new Google Sheet, run "setup" once, then Deploy → New deployment → Web app
 * (Execute as: Me, Who has access: Anyone) and paste the /exec URL into dist/config.js.
 */

/* ── Settings you may change ───────────────────────────────────────────── */

var CONFIG = {
  /** ID of the Google Sheet (the long code in its URL). Leave '' if this script was opened from the sheet's Extensions menu. */
  SPREADSHEET_ID: '',
  SHEET_NAME: 'Bookings',
  /** Email that receives a short notice for every new booking. Leave '' to turn off. */
  ADMIN_EMAIL: '',
  TIME_ZONE: 'Asia/Kolkata',
  BOOKING_WINDOW_DAYS: 60,
  MIN_NOTICE_MINUTES: 120,
  /** Max bookings one email address can make in 10 minutes (spam protection). */
  MAX_PER_EMAIL_PER_10_MIN: 3,
  /** Max bookings accepted from everyone in 10 minutes (spam protection). */
  MAX_TOTAL_PER_10_MIN: 40,
};

/* These lists must match src/booking/catalog.ts and src/booking/mockScheduler.ts on the website. */
var SERVICES = {
  checkup: 'Dental check-up',
  cleaning: 'Hygiene clean',
  cosmetic: 'Cosmetic consultation',
  whitening: 'Whitening consultation',
  aligners: 'Clear aligner consultation',
  restorative: 'Restorative consultation',
  emergency: 'Emergency enquiry',
};
var DENTISTS = {
  aanya: 'Dr. Aanya Mehra',
  kabir: 'Dr. Kabir Rao',
  meera: 'Dr. Meera Iyer',
};
var WEEKDAY_TIMES = ['09:30', '10:15', '11:00', '11:45', '12:30', '14:30', '15:15', '16:00', '16:45', '17:30', '18:15'];
var SATURDAY_TIMES = ['10:00', '10:45', '11:30', '12:15', '14:00', '14:45', '15:30', '16:15'];

var HEADERS = ['Received', 'Reference', 'Status', 'Treatment', 'Dentist', 'Requested dentist', 'Date', 'Time', 'Patient name', 'Email', 'Phone', 'Note', 'Service id', 'Dentist id'];
var STATUSES = ['New', 'Confirmed', 'Completed', 'Cancelled', 'No-show'];
/** Rows with these statuses free their time slot again. */
var RELEASED_STATUSES = ['Cancelled'];

/* ── One-time setup: run this from the Apps Script editor ─────────────── */

function setup() {
  var ss = spreadsheet_();
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME) || ss.insertSheet(CONFIG.SHEET_NAME);
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold').setBackground('#1e3a2f').setFontColor('#f4efe6');
  sheet.setFrozenRows(1);
  sheet.setColumnWidths(1, HEADERS.length, 140);
  sheet.setColumnWidth(12, 280);
  var statusRule = SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).setAllowInvalid(false).build();
  sheet.getRange(2, 3, sheet.getMaxRows() - 1, 1).setDataValidation(statusRule);
  ss.setSpreadsheetTimeZone(CONFIG.TIME_ZONE);
  return 'Sheet "' + CONFIG.SHEET_NAME + '" is ready.';
}

/* ── Web endpoints ─────────────────────────────────────────────────────── */

function doGet(e) {
  try {
    var p = (e && e.parameter) || {};
    if (p.action === 'slots') {
      if (!isIsoDate(p.date)) return json({ ok: false, error: 'invalid', message: 'A valid date is required.' });
      return json({ ok: true, date: p.date, booked: bookedOn(p.date) });
    }
    return json({ ok: true, service: 'lumiere-booking', version: 1 });
  } catch (err) {
    console.error(err);
    return json({ ok: false, error: 'server', message: 'Something went wrong on our side.' });
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var body = parseBody(e);
    var result = validateBooking(body, new Date());
    if (!result.ok) return json(result);
    var b = result.booking;

    var limited = rateLimited(b.email);
    if (limited) return json(limited);

    // the lock makes "check the slot, then write the row" one step, so two people can't take the same time
    lock.waitLock(15000);
    var taken = bookedOn(b.date);
    var dentist = resolveDentist(b, taken);
    if (!dentist) {
      return json({ ok: false, error: 'slot_taken', message: 'That time has just been booked by someone else. Please choose another time.' });
    }

    var reference = makeReference();
    sheet_().appendRow([
      Utilities.formatDate(new Date(), CONFIG.TIME_ZONE, 'yyyy-MM-dd HH:mm:ss'),
      reference,
      'New',
      SERVICES[b.service],
      DENTISTS[dentist],
      b.requestedDentist === 'any' ? 'No preference' : DENTISTS[b.requestedDentist],
      // leading apostrophe keeps these as text, so Sheets never reformats them as dates/times
      "'" + b.date,
      "'" + b.time,
      safe(b.name),
      safe(b.email),
      safe(b.phone),
      safe(b.note),
      b.service,
      dentist,
    ]);
    SpreadsheetApp.flush();
    lock.releaseLock();

    notifyAdmin(reference, b, dentist);
    return json({ ok: true, reference: reference, dentist: dentist, date: b.date, time: b.time });
  } catch (err) {
    console.error(err);
    return json({ ok: false, error: 'server', message: 'We could not save your booking just now. Please try again in a moment.' });
  } finally {
    try {
      lock.releaseLock();
    } catch (ignored) {}
  }
}

/* ── Validation (mirrors the website, but never trusts it) ─────────────── */

var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
var NAME_RE = /^[^\d<>@#$%^&*=+{}\[\]\\|;:"/?~\x60]{2,80}$/;

function validateBooking(body, now) {
  var fail = function (msg) {
    return { ok: false, error: 'invalid', message: msg };
  };
  if (!body || typeof body !== 'object') return fail('The booking could not be read.');
  // honeypot: real visitors never see or fill this field
  if (body.website) return fail('The booking could not be accepted.');

  var service = str(body.service);
  var dentist = str(body.dentist);
  var requested = str(body.requestedDentist) || dentist;
  var date = str(body.date);
  var time = str(body.time);
  var p = body.patient || {};
  var name = str(p.name).trim();
  var email = str(p.email).trim().toLowerCase();
  var phone = str(p.phone).trim();
  var note = str(p.note).trim();

  if (!SERVICES[service]) return fail('Please choose a treatment.');
  if (!DENTISTS[dentist]) return fail('Please choose a dentist.');
  if (requested !== 'any' && !DENTISTS[requested]) return fail('Please choose a dentist.');
  if (!isIsoDate(date)) return fail('Please choose a date.');

  var today = Utilities.formatDate(now, CONFIG.TIME_ZONE, 'yyyy-MM-dd');
  var last = Utilities.formatDate(new Date(now.getTime() + CONFIG.BOOKING_WINDOW_DAYS * 86400000), CONFIG.TIME_ZONE, 'yyyy-MM-dd');
  if (date < today || date > last) return fail('That date is outside the booking window.');
  var times = timesFor(date);
  if (times.indexOf(time) === -1) return fail('That time is not available.');
  if (minutesUntil(date, time, now) < CONFIG.MIN_NOTICE_MINUTES) return fail('That time is too soon. Please choose a later time.');

  if (!NAME_RE.test(name)) return fail('Please enter your full name.');
  if (!EMAIL_RE.test(email) || email.length > 120) return fail('Please enter a valid email address.');
  var digits = phone.replace(/[\s()-]/g, '');
  if (digits && !/^(\+91)?[6-9]\d{9}$/.test(digits) && !/^\+\d{8,15}$/.test(digits)) return fail('Please enter a valid mobile number.');
  if (note.length > 240) return fail('Please keep your note under 240 characters.');

  return {
    ok: true,
    booking: { service: service, dentist: dentist, requestedDentist: requested, date: date, time: time, name: name, email: email, phone: phone, note: note },
  };
}

/** Picks the dentist for the booking: the one requested, or for "no preference" the first one free. */
function resolveDentist(b, taken) {
  var isFree = function (id) {
    return !taken.some(function (t) {
      return t.time === b.time && t.dentist === id;
    });
  };
  if (b.requestedDentist !== 'any') return isFree(b.dentist) ? b.dentist : null;
  if (isFree(b.dentist)) return b.dentist;
  var ids = Object.keys(DENTISTS);
  for (var i = 0; i < ids.length; i++) if (isFree(ids[i])) return ids[i];
  return null;
}

/* ── Sheet helpers ─────────────────────────────────────────────────────── */

function spreadsheet_() {
  return CONFIG.SPREADSHEET_ID ? SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
}

function sheet_() {
  var ss = spreadsheet_();
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    setup();
    sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  }
  return sheet;
}

/** Times already taken on a date, as [{time, dentist}]. Never returns names or contact details. */
function bookedOn(date) {
  var sheet = sheet_();
  var rows = sheet.getLastRow() - 1;
  if (rows < 1) return [];
  var values = sheet.getRange(2, 1, rows, HEADERS.length).getDisplayValues();
  var out = [];
  for (var i = 0; i < values.length; i++) {
    var r = values[i];
    var status = r[2];
    var d = String(r[6]).replace(/^'/, '');
    if (d === date && RELEASED_STATUSES.indexOf(status) === -1) out.push({ time: String(r[7]).replace(/^'/, ''), dentist: r[13] });
  }
  return out;
}

function rateLimited(email) {
  var cache = CacheService.getScriptCache();
  var keyEmail = 'rate:' + email;
  var keyAll = 'rate:all';
  var nEmail = Number(cache.get(keyEmail) || 0);
  var nAll = Number(cache.get(keyAll) || 0);
  if (nEmail >= CONFIG.MAX_PER_EMAIL_PER_10_MIN || nAll >= CONFIG.MAX_TOTAL_PER_10_MIN) {
    return { ok: false, error: 'rate_limited', message: 'Too many booking attempts. Please wait a few minutes or call the clinic.' };
  }
  cache.put(keyEmail, String(nEmail + 1), 600);
  cache.put(keyAll, String(nAll + 1), 600);
  return null;
}

function notifyAdmin(reference, b, dentist) {
  if (!CONFIG.ADMIN_EMAIL) return;
  try {
    MailApp.sendEmail({
      to: CONFIG.ADMIN_EMAIL,
      subject: 'New booking ' + reference + ': ' + b.date + ' ' + b.time,
      body:
        'A new booking request was added to your sheet.\n\n' +
        'Reference: ' + reference + '\n' +
        'Treatment: ' + SERVICES[b.service] + '\n' +
        'Dentist: ' + DENTISTS[dentist] + '\n' +
        'When: ' + b.date + ' at ' + b.time + '\n' +
        'Patient: ' + b.name + '\n\n' +
        'Open the sheet to see contact details and confirm the visit.',
    });
  } catch (err) {
    console.error('Admin email failed: ' + err);
  }
}

/* ── Small utilities ───────────────────────────────────────────────────── */

function parseBody(e) {
  if (!e || !e.postData || !e.postData.contents) return null;
  if (e.postData.contents.length > 5000) return null;
  try {
    return JSON.parse(e.postData.contents);
  } catch (err) {
    return null;
  }
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function str(v) {
  return typeof v === 'string' ? v : '';
}

function isIsoDate(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s + 'T00:00:00Z'));
}

/** Day of week (0 = Sunday) of an ISO date, independent of time zone. */
function weekday(date) {
  return new Date(date + 'T12:00:00Z').getUTCDay();
}

function timesFor(date) {
  var d = weekday(date);
  if (d === 0) return [];
  return d === 6 ? SATURDAY_TIMES : WEEKDAY_TIMES;
}

/** Minutes from "now" until date+time in the clinic's time zone. */
function minutesUntil(date, time, now) {
  var nowLocal = Utilities.formatDate(now, CONFIG.TIME_ZONE, "yyyy-MM-dd'T'HH:mm");
  var a = Date.parse(date + 'T' + time + ':00Z');
  var b = Date.parse(nowLocal + ':00Z');
  return (a - b) / 60000;
}

/** Stops spreadsheet formula injection: text starting with = + - @ is stored as plain text. */
function safe(v) {
  return /^[=+\-@\t\r]/.test(v) ? "'" + v : v;
}

function makeReference() {
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var s = '';
  for (var i = 0; i < 6; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
  return 'LD-' + s;
}
