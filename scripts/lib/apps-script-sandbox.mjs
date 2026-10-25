// In-memory Google Apps Script sandbox for backend regression tests.
// Loads the real src/*.gs files into one V8 context (same global scope as Apps Script)
// with SpreadsheetApp/Utilities/LockService/PropertiesService/HtmlService mocked.
// No network, no Google account, no production data.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function istParts(d) {
  const x = new Date(new Date(d).getTime() + 330 * 60000);
  return { y: x.getUTCFullYear(), M: x.getUTCMonth(), d: x.getUTCDate(), H: x.getUTCHours(), m: x.getUTCMinutes(), s: x.getUTCSeconds() };
}
const pad = (n, w = 2) => String(n).padStart(w, '0');
function formatDate(date, _tz, fmt) {
  const p = istParts(date);
  const h12 = p.H % 12 || 12;
  return fmt.replace(/yyyy|yy|MMM|MM|dd|HH|hh|mm|ss|a/g, t => ({
    yyyy: p.y, yy: pad(p.y % 100), MMM: MONTHS[p.M], MM: pad(p.M + 1), dd: pad(p.d), HH: pad(p.H), hh: pad(h12), mm: pad(p.m), ss: pad(p.s), a: p.H < 12 ? 'AM' : 'PM'
  })[t]);
}

class Range {
  constructor(sheet, r, c, nr = 1, nc = 1) { Object.assign(this, { sheet, r, c, nr, nc }); }
  getValues() {
    const out = [];
    for (let i = 0; i < this.nr; i++) {
      const row = this.sheet.data[this.r - 1 + i] || [];
      out.push(Array.from({ length: this.nc }, (_, j) => row[this.c - 1 + j] ?? ''));
    }
    return out;
  }
  getValue() { return this.getValues()[0][0]; }
  setValues(vals) {
    if (vals.length !== this.nr || vals.some(r => r.length !== this.nc)) throw new Error('setValues dimension mismatch');
    vals.forEach((row, i) => {
      const target = (this.sheet.data[this.r - 1 + i] ||= []);
      row.forEach((v, j) => { target[this.c - 1 + j] = v; });
    });
    this.sheet.writes++;
    return this;
  }
  setValue(v) { return this.setValues([[v]]); }
}
class Sheet {
  constructor(name, headers = []) { this.name = name; this.data = headers.length ? [headers.slice()] : []; this.writes = 0; }
  getName() { return this.name; }
  getLastRow() { return this.data.length; }
  getLastColumn() { return this.data.reduce((m, r) => Math.max(m, r.length), 0); }
  getRange(r, c, nr, nc) { return new Range(this, r, c, nr, nc); }
  appendRow(row) { this.data.push(row.slice()); this.writes++; }
}
class Spreadsheet {
  constructor() { this.sheets = new Map(); }
  getSheetByName(n) { return this.sheets.get(n) || null; }
  insertSheet(n) { const s = new Sheet(n); this.sheets.set(n, s); return s; }
  add(n, headers) { const s = new Sheet(n, headers); this.sheets.set(n, s); return s; }
}

export function createSandbox({ files, root }) {
  const ss = new Spreadsheet();
  const props = new Map();
  const templates = [];
  const htmlOut = name => {
    const o = { name, content: '', setTitle() { return o; }, setXFrameOptionsMode() { return o; }, addMetaTag() { return o; },
      append(c) { o.content += c; return o; }, getContent() { return o.content; }, setSandboxMode() { return o; } };
    return o;
  };
  const ctx = {
    console, Date, Math, JSON, Number, String, Object, Array, Error, RegExp, isFinite, isNaN, parseInt, parseFloat, encodeURIComponent, decodeURIComponent, Promise, Symbol, Map, Set,
    SpreadsheetApp: { openById: () => ss, getActive: () => ss, getActiveSpreadsheet: () => ss },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'sha256', MD5: 'md5', SHA_1: 'sha1' },
      Charset: { UTF_8: 'utf8' },
      computeDigest: (alg, v) => [...crypto.createHash(alg).update(String(v), 'utf8').digest()].map(b => (b > 127 ? b - 256 : b)),
      formatDate, getUuid: () => crypto.randomUUID(), sleep() {},
      base64Encode: v => Buffer.from(String(v)).toString('base64'), base64EncodeWebSafe: v => Buffer.from(String(v)).toString('base64url')
    },
    LockService: { getScriptLock: () => ({ waitLock() {}, tryLock: () => true, releaseLock() {} }), getDocumentLock: () => ({ waitLock() {}, tryLock: () => true, releaseLock() {} }) },
    PropertiesService: { getScriptProperties: () => ({
      getProperty: k => (props.has(k) ? props.get(k) : null),
      setProperty: (k, v) => { props.set(k, String(v)); },
      setProperties: o => { Object.entries(o).forEach(([k, v]) => props.set(k, String(v))); },
      getProperties: () => Object.fromEntries(props), deleteProperty: k => props.delete(k)
    }) },
    CacheService: { getScriptCache: () => ({ get: () => null, put() {}, remove() {}, getAll: () => ({}), putAll() {} }) },
    HtmlService: {
      createTemplateFromFile: name => ({ evaluate: () => { templates.push(name); return htmlOut(name); } }),
      createHtmlOutput: c => htmlOut(String(c || '')), createHtmlOutputFromFile: name => htmlOut(name),
      XFrameOptionsMode: { ALLOWALL: 'ALLOWALL', DEFAULT: 'DEFAULT' }, SandboxMode: { IFRAME: 'IFRAME' }
    },
    ContentService: { createTextOutput: c => ({ c, setMimeType() { return this; } }), MimeType: { JSON: 'json', JAVASCRIPT: 'js' } },
    Session: { getActiveUser: () => ({ getEmail: () => '' }), getEffectiveUser: () => ({ getEmail: () => 'owner@example.test' }), getScriptTimeZone: () => 'Asia/Kolkata' },
    ScriptApp: { getProjectTriggers: () => [], newTrigger: () => ({}), getService: () => ({ getUrl: () => 'https://example.test/exec' }) },
    UrlFetchApp: { fetch() { throw new Error('Network disabled in tests'); } },
    DriveApp: {}, Logger: { log() {} }, MailApp: { sendEmail() { throw new Error('Mail disabled in tests'); } }
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  // Apps Script V8 executes each file as a separate script in one shared global scope,
  // in project file order. Separate vm scripts in one context reproduce that, including
  // the repo's "later file reassigns an earlier function" override pattern.
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
  return { ctx, ss, props, templates, call: (fn, ...args) => vm.runInContext(fn, ctx)(...args) };
}
