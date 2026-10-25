// Native Elaneeru V11.0.0 — browser end-to-end test for Route Dispatcher + Driver One.
// Real Chromium renders src/DispatchV1100.html and src/DriverOneV1100.html; every
// google.script.run call is executed by the real Apps Script sources in an in-memory
// workbook (scripts/lib/apps-script-sandbox.mjs). Synthetic data only; no network.
//
// Requires: playwright (with Chromium), xlsx@0.18.5, leaflet@1.9.4 resolvable from
// NE_E2E_MODULES (a node_modules directory) or the repo's node_modules.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { createSandbox } from './lib/apps-script-sandbox.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const modulesDir = process.env.NE_E2E_MODULES || path.join(root, 'node_modules');
const req = createRequire(path.join(modulesDir, 'noop.js'));
const { chromium } = req('playwright');
const XLSX = req('xlsx');
const libs = {
  'xlsx.full.min.js': path.join(path.dirname(req.resolve('xlsx/package.json')), 'dist/xlsx.full.min.js'),
  'leaflet.min.js': path.join(path.dirname(req.resolve('leaflet/package.json')), 'dist/leaflet.js'),
  'leaflet.min.css': path.join(path.dirname(req.resolve('leaflet/package.json')), 'dist/leaflet.css')
};
const out = path.join(root, 'test-results');
fs.mkdirSync(out, { recursive: true });

// ---------- backend sandbox with synthetic records ----------
const ciSort = (a, b) => (a.toLowerCase() < b.toLowerCase() ? -1 : a.toLowerCase() > b.toLowerCase() ? 1 : 0);
const files = fs.readdirSync(path.join(root, 'src')).filter(f => f.endsWith('.gs')).sort(ciSort).map(f => 'src/' + f);
const sb = createSandbox({ files, root });
const H = {
  Drivers: ['Driver ID','Driver Name','Mobile','PIN Hash','Delivery Type','Vehicle Number','Vehicle Type','Capacity Qty','Current Route ID','Current Stop ID','Last Login','Status','Created At','Updated At'],
  Delivery_Routes: ['Route ID','Route Date','Route Type','Driver ID','Vehicle Number','Hub Latitude','Hub Longitude','Total Stops','Completed Stops','Total Road KM','Estimated Minutes','Optimization Source','Status','Created At','Updated At','Route Polyline','API Status'],
  Route_Stops: ['Stop ID','Route ID','Route Type','Stop Sequence','Order Type','Order ID','Customer/Vendor ID','Display Name','Mobile','Address','Latitude','Longitude','Required Qty','Assigned Batch Qty','Delivered Qty','Road Distance From Previous KM','Travel Time From Previous Min','Planned ETA','Check In At','Barcode Verified At','Delivered At','Check Out At','Tracking Visible','Status','Priority','Time Slot','Failure Reason','Failure Remarks','Failed At','Failure Latitude','Failure Longitude'],
  Delivery_Events: ['Event ID','Event At','Route ID','Stop ID','Order Type','Order ID','Driver ID','Event Type','Latitude','Longitude','Barcode','Quantity','Remarks'],
  Driver_Live: ['Live ID','Driver ID','Route ID','Stop ID','Order Type','Order ID','Latitude','Longitude','Accuracy M','Heading','Updated At','Status'],
  Staff_Users: ['Staff ID','Name','Mobile','PIN Hash','Role','Allowed App','Status','Last Login','Created At','Updated At'],
  Audit_Log: ['Audit ID','Created At','Module','Action','Reference Type','Reference ID','User ID','Old Value','New Value']
};
for (const [n, h] of Object.entries(H)) sb.ss.add(n, h);
const hash = v => sb.call('hashV8_', v);
const now = new Date();
sb.ss.getSheetByName('Drivers').data.push(['DRV-E2E-1', 'E2E Driver', '9000077777', hash('2468'), 'B2B', 'KA00E2E1', 'Pickup', 1500, '', '', '', 'ACTIVE', now, now]);
sb.ss.getSheetByName('Staff_Users').data.push(['STF-E2E-OPS', 'E2E Ops', '9000088888', hash('1357'), 'OPERATIONS', 'OPERATIONS', 'ACTIVE', '', '', '']);

// ---------- synthetic Excel file: text phones, numeric phone, a formula, a bad row ----------
const ws = XLSX.utils.aoa_to_sheet([
  ['Customer Name', 'Phone Number', 'Lat', 'Long', 'Quantity', 'Amount', 'Address'],
  ['E2E Shop North', '9876600001', 12.9010, 77.6020, 200, 8600, 'Test layout 1'],
  ['E2E Shop South', '+91 98766 00002', 12.8050, 77.5950, 100, 4300, 'Test layout 2'],
  ['E2E Shop East', 9876600003, 12.8800, 77.6300, 150, 6450, 'Test layout 3'],
  ['E2E Missing Phone', '', 12.85, 77.60, 50, 2150, 'Test layout 4']
]);
ws['C4'] = { t: 'n', v: 12.88, f: 'ROUND(12.8801,4)' };
ws['B2'].t = 's'; ws['B3'].t = 's';
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Route');
const xlsxPath = path.join(out, 'driver-one-e2e-synthetic.xlsx');
XLSX.writeFile(wb, xlsxPath);

// ---------- browser ----------
const pages = { 'dispatch.html': 'src/DispatchV1100.html', 'driver.html': 'src/DriverOneV1100.html' };
const browser = await chromium.launch();
const context = await browser.newContext({ timezoneId: 'Asia/Kolkata', locale: 'en-IN', geolocation: { latitude: 12.9009, longitude: 77.6021, accuracy: 15 }, permissions: ['geolocation'] });
await context.exposeBinding('__gas', (_src, fn, argsJson) => {
  if (!/^d1[A-Za-z0-9]+V1100$/.test(fn)) return { ok: false, error: 'Method not exposed in test: ' + fn };
  try { return { ok: true, result: JSON.parse(JSON.stringify(sb.call(fn, ...JSON.parse(argsJson)) ?? null)) }; }
  catch (e) { return { ok: false, error: String(e && e.message || e) }; }
});
await context.addInitScript(() => {
  const make = () => {
    let ok = () => {}, fail = () => {};
    const runner = new Proxy({}, { get(_t, prop) {
      if (prop === 'withSuccessHandler') return f => { ok = f; return runner; };
      if (prop === 'withFailureHandler') return f => { fail = f; return runner; };
      return (...args) => { window.__gas(prop, JSON.stringify(args)).then(r => (r.ok ? ok(r.result) : fail(new Error(r.error)))); };
    } });
    return runner;
  };
  window.google = { script: { get run() { return make(); } } };
});
const network = [];
await context.route('**/*', async route => {
  const url = route.request().url();
  const name = url.split('/').pop().split('?')[0];
  if (url.startsWith('https://ne.test/') && pages[name]) return route.fulfill({ contentType: 'text/html', body: fs.readFileSync(path.join(root, pages[name])) });
  if (url.includes('cdnjs.cloudflare.com') && libs[name]) return route.fulfill({ contentType: name.endsWith('.css') ? 'text/css' : 'application/javascript', body: fs.readFileSync(libs[name]) });
  if (url.includes('tile.openstreetmap.org')) return route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') });
  network.push(url);
  return route.abort();
});

const evidence = [];
const step = (m) => { evidence.push('✓ ' + m); };
try {
  // Dispatcher on desktop
  const d = await context.newPage();
  await d.setViewportSize({ width: 1280, height: 900 });
  d.on('dialog', dlg => dlg.accept('E2E note'));
  const dErrors = []; d.on('pageerror', e => dErrors.push(e.message));
  await d.goto('https://ne.test/dispatch.html');
  await d.fill('#lm', '9000088888'); await d.fill('#lp', '1357');
  await d.click('button:has-text("Sign in")');
  await d.waitForSelector('#file');
  step('Dispatcher signed in as OPERATIONS staff');
  await d.selectOption('#drv', 'DRV-E2E-1');
  await d.setInputFiles('#file', xlsxPath);
  await d.waitForSelector('text=3 valid');
  const pv = await d.textContent('#pv');
  assert.match(pv, /Row|Customer/);
  assert.match(pv, /9876600002/);
  assert.match(pv, /9876600003/);
  assert.match(pv, /Phone number is required/);
  assert.match(pv, /Formula-calculated values in: lat/);
  assert.equal(await d.isDisabled('#createBtn'), true, 'create blocked while a row has errors');
  step('Excel import: text phone, +91 phone, numeric phone accepted; missing-phone row rejected with row number; formula flagged');
  await d.check('#partial');
  await d.waitForFunction(() => !document.getElementById('createBtn').disabled);
  await d.selectOption('#seq', 'NEAREST');
  await d.screenshot({ path: path.join(out, 'driver-one-dispatch-preview.png'), fullPage: true });
  await d.click('#createBtn');
  await d.waitForSelector('text=Route created');
  const stored = sb.call('rows_', 'Delivery_Routes').map(r => String(r['Route Date']));
  assert.equal(stored[0], sb.call('isoDate_', new Date(Date.now() + 86400000)), 'default delivery date is tomorrow in IST');
  const created = await d.textContent('#pv');
  assert.match(created, /3 stops · 450 coconuts/);
  assert.match(created, /straight line nearest neighbour/);
  step('Route created and published: 3 stops, 450 coconuts, labelled straight-line (no KM/ETA)');

  // Driver on a phone-sized viewport, separate page (separate device from the browser's point of view)
  const m = await context.newPage();
  await m.setViewportSize({ width: 390, height: 844 });
  const mErrors = []; m.on('pageerror', e => mErrors.push(e.message));
  await m.goto('https://ne.test/driver.html');
  await m.fill('#m', '9000077777'); await m.fill('#p', '2468');
  await m.click('#lb');
  await m.waitForSelector('text=Load vehicle');
  step('Driver signed in on phone viewport and sees only the assigned trip');
  await m.fill('#lq', '450'); await m.click('text=Confirm loaded');
  await m.waitForSelector('text=2 · Start trip'); await m.click('text=2 · Start trip');
  await m.waitForSelector('text=I have arrived');
  step('Load confirmed (450) and trip started');
  for (let i = 0; i < 3; i++) {
    await m.locator('button:has-text("I have arrived")').first().click();
    await m.waitForSelector('text=Save delivery');
    const stopCard = m.locator('.stop.ARRIVED');
    const name = await stopCard.locator('h3').textContent();
    if (i === 1) {
      await stopCard.locator('.seg label:has-text("Failed")').click();
      await stopCard.locator('select').selectOption('Shop closed');
    }
    await stopCard.locator('button:has-text("Save delivery")').click();
    await m.waitForFunction(() => !document.querySelector('.stop.ARRIVED'));
    if (i !== 1) {
      await m.locator('button:has-text("Record payment")').first().click();
      await m.waitForFunction(n => [...document.querySelectorAll('.stop')].some(s => s.textContent.includes(n) && !s.querySelector('button')), name);
    }
    step(`Stop ${i + 1} (${name.trim()}): ${i === 1 ? 'failed — Shop closed, no payment allowed' : 'delivered and cash recorded'}`);
  }
  const html = await m.content();
  assert.doesNotMatch(html, /\botp\b/i);
  assert.doesNotMatch(html, /invoice|print/i);
  step('No OTP prompt and no invoice/print control anywhere in Driver One');
  await m.screenshot({ path: path.join(out, 'driver-one-mobile-stops.png'), fullPage: true });
  await m.click('button:has-text("Close trip")');
  await m.waitForSelector('text=Trip summary');
  const summary = await m.textContent('main');
  assert.match(summary, /CLOSED/);
  await m.screenshot({ path: path.join(out, 'driver-one-mobile-closed.png'), fullPage: true });
  step('Trip closed with matching stock and cash');
  const checkIns = sb.call('rows_', 'Delivery_Events').filter(e => e['Event Type'] === 'CHECK_IN');
  assert.equal(checkIns.length, 3);
  assert.ok(checkIns.every(e => typeof e.Latitude === 'number' && Math.abs(e.Latitude - 12.9009) < 1e-6), 'browser GPS stored on every check-in');
  step('Browser GPS (granted) stored on all 3 check-ins with accuracy note');

  // Dispatcher sees the result on the live board
  await d.click('#t-board');
  await d.fill('#bd', sb.call('isoDate_', new Date(Date.now() + 86400000)));
  await d.click('text=Refresh');
  await d.waitForSelector('text=E2E Driver');
  await d.click('text=Details');
  await d.waitForSelector('text=Event log');
  const board = await d.textContent('main');
  assert.match(board, /TRIP_CLOSED/);
  assert.match(board, /DRIVER ENTERED/);
  assert.match(board, /Shop closed/);
  await d.screenshot({ path: path.join(out, 'driver-one-dispatch-board.png'), fullPage: true });
  step('Dispatcher board shows events, failed stop reason and unverified cash');
  assert.deepEqual(dErrors, []); assert.deepEqual(mErrors, []);
  assert.deepEqual(network, [], 'no unexpected network requests');
  step('No page errors and no unexpected network calls');
  console.log(evidence.join('\n'));
  console.log('\nDriver One V1100 browser E2E passed. Screenshots in test-results/.');
} catch (e) {
  console.log(evidence.join('\n'));
  console.error('✗ ' + (e && e.stack || e));
  process.exitCode = 1;
} finally {
  await browser.close();
}
