/**
 * Runs apps-script/Code.gs in Node with in-memory fakes of the Google services it uses,
 * so the booking backend's rules can be tested without a Google account.
 *   node tests/apps-script.test.mjs
 */
import { makeEnv } from './fake-apps-script.mjs';

let failures = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? '✓' : '✗'} ${msg}`);
  if (!cond) failures++;
};

const post = (env, body) => JSON.parse(env.ctx.doPost({ postData: { contents: JSON.stringify(body) } }).text);
const get = (env, params) => JSON.parse(env.ctx.doGet({ parameter: params }).text);

// a weekday 3+ days ahead, in IST
function futureWeekday(offset = 3) {
  const d = new Date(Date.now() + offset * 86400000);
  let iso = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d);
  while (new Date(iso + 'T12:00:00Z').getUTCDay() === 0 || new Date(iso + 'T12:00:00Z').getUTCDay() === 6) {
    iso = new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC' }).format(new Date(Date.parse(iso + 'T12:00:00Z') + 86400000));
  }
  return iso;
}
const date = futureWeekday();
const base = () => ({
  service: 'checkup',
  dentist: 'aanya',
  requestedDentist: 'aanya',
  date,
  time: '10:15',
  patient: { name: 'Riya Kapoor', email: 'riya@example.com', phone: '98765 43210', note: 'Prefers mornings' },
});

{
  const env = makeEnv();
  ok(env.ctx.setup().includes('ready') && env.header()[1] === 'Reference', 'setup() writes the header row');

  const r = post(env, base());
  ok(r.ok && /^LD-[A-Z2-9]{6}$/.test(r.reference), `valid booking is accepted (${r.reference})`);
  ok(env.rows.length === 1, 'booking adds exactly one row');
  const row = env.rows[0];
  ok(row[2] === 'New' && row[3] === 'Dental check-up' && row[4] === 'Dr. Aanya Mehra', 'row has status, treatment and dentist names');
  ok(row[6] === `'${date}` && row[7] === "'10:15", 'date and time are stored as text');
  ok(row[8] === 'Riya Kapoor' && row[9] === 'riya@example.com' && row[10] === '98765 43210', 'row has patient contact details');

  const slots = get(env, { action: 'slots', date });
  ok(slots.ok && slots.booked.length === 1 && slots.booked[0].time === '10:15' && slots.booked[0].dentist === 'aanya', 'GET slots returns the taken time');
  ok(!JSON.stringify(slots).includes('Riya') && !JSON.stringify(slots).includes('@'), 'GET slots never exposes names or emails');

  const dup = post(env, { ...base(), patient: { ...base().patient, email: 'other@example.com' } });
  ok(!dup.ok && dup.error === 'slot_taken', 'the same dentist + time cannot be booked twice');
  ok(env.rows.length === 1, 'rejected double booking adds no row');

  const any = post(env, { ...base(), requestedDentist: 'any', patient: { ...base().patient, email: 'any@example.com' } });
  ok(any.ok && any.dentist === 'kabir', `"no preference" is moved to a free dentist when the first is taken (${any.dentist})`);

  // admin cancels the first booking → slot frees up
  env.rows[0][2] = 'Cancelled';
  const after = get(env, { action: 'slots', date });
  ok(!after.booked.some((b) => b.dentist === 'aanya'), 'marking a row "Cancelled" frees its slot');
}

{
  const env = makeEnv();
  const bad = (patch, label) => {
    const r = post(env, { ...base(), ...patch, patient: { ...base().patient, ...(patch.patient || {}) } });
    ok(!r.ok && r.error === 'invalid', `rejects ${label}: "${r.message}"`);
  };
  bad({ service: 'surgery' }, 'unknown treatment');
  bad({ dentist: 'nobody' }, 'unknown dentist');
  bad({ date: '2020-01-01' }, 'a past date');
  bad({ time: '03:00' }, 'a time outside opening hours');
  bad({ patient: { email: 'not-an-email' } }, 'a bad email');
  bad({ patient: { name: '' } }, 'a missing name');
  bad({ patient: { phone: '12345' } }, 'a bad phone number');
  bad({ patient: { note: 'x'.repeat(300) } }, 'an over-long note');
  bad({ website: 'http://spam' }, 'a filled honeypot field');
  const sunday = (() => {
    let d = Date.parse(date + 'T12:00:00Z');
    while (new Date(d).getUTCDay() !== 0) d += 86400000;
    return new Date(d).toISOString().slice(0, 10);
  })();
  bad({ date: sunday }, 'a Sunday');
  const garbage = JSON.parse(env.ctx.doPost({ postData: { contents: '{not json' } }).text);
  ok(!garbage.ok, 'rejects malformed JSON');
  ok(env.rows.length === 0, 'no invalid request ever reaches the sheet');
}

{
  const env = makeEnv();
  const r = post(env, { ...base(), patient: { ...base().patient, name: 'Riya Kapoor', note: '=HYPERLINK("http://x")' } });
  ok(r.ok && env.rows[0][11].startsWith("'="), 'formula-like text is neutralised before writing');

  let last;
  for (let i = 0; i < 4; i++) {
    last = post(env, { ...base(), time: ['11:00', '11:45', '12:30', '14:30'][i], patient: { ...base().patient, email: 'spam@example.com' } });
  }
  ok(!last.ok && last.error === 'rate_limited', 'the 4th booking from one email within 10 minutes is refused');
}

{
  const env = makeEnv();
  env.ctx.CONFIG.ADMIN_EMAIL = 'admin@example.com';
  post(env, base());
  ok(env.mails.length === 1 && env.mails[0].to === 'admin@example.com' && !env.mails[0].body.includes('riya@example.com'), 'admin gets a notice email without the patient’s contact details');
}

console.log(failures ? `\n${failures} check(s) failed` : '\nAll backend checks passed');
process.exit(failures ? 1 : 0);
