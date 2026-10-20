/** In-memory fakes of the Google services used by apps-script/Code.gs, plus a loader. */
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

export function makeEnv() {
  const rows = []; // data rows only (header handled separately)
  let header = [];
  const mails = [];
  const cache = new Map();
  const sheet = {
    getRange(r, c, nr = 1, nc = 1) {
      const api = {
        setValues(v) {
          if (r === 1) header = v[0];
          return api;
        },
        getDisplayValues() {
          return rows.slice(r - 2, r - 2 + nr).map((row) => row.slice(c - 1, c - 1 + nc).map((x) => String(x).replace(/^'/, '')));
        },
        setFontWeight: () => api,
        setBackground: () => api,
        setFontColor: () => api,
        setDataValidation: () => api,
        setNumberFormat: () => api,
      };
      return api;
    },
    getLastRow: () => rows.length + 1,
    getMaxRows: () => 1000,
    appendRow: (v) => rows.push(v),
    setFrozenRows() {},
    setColumnWidths() {},
    setColumnWidth() {},
  };
  const ss = { getSheetByName: () => sheet, insertSheet: () => sheet, setSpreadsheetTimeZone() {} };
  const fmt = (d, tz, pattern) => {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
        .formatToParts(d)
        .map((p) => [p.type, p.value]),
    );
    return pattern
      .replace("'T'", 'T')
      .replace('yyyy', parts.year)
      .replace('MM', parts.month)
      .replace('dd', parts.day)
      .replace('HH', parts.hour)
      .replace('mm', parts.minute)
      .replace('ss', parts.second);
  };
  const ctx = {
    console,
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ss,
      openById: () => ss,
      flush() {},
      newDataValidation: () => ({ requireValueInList() { return this; }, setAllowInvalid() { return this; }, build: () => ({}) }),
    },
    Utilities: { formatDate: fmt },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    CacheService: { getScriptCache: () => ({ get: (k) => cache.get(k) ?? null, put: (k, v) => cache.set(k, v) }) },
    ContentService: { createTextOutput: (s) => ({ text: s, setMimeType() { return this; } }), MimeType: { JSON: 'json' } },
    MailApp: { sendEmail: (m) => mails.push(m) },
  };
  vm.createContext(ctx);
  vm.runInContext(readFileSync(new URL('../apps-script/Code.gs', import.meta.url), 'utf8'), ctx);
  return { ctx, rows, mails, cache, header: () => header };
}
