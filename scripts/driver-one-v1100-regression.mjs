// Native Elaneeru V11.0.0 — Route Dispatcher + Driver One backend regression.
// Runs the real Apps Script sources against an in-memory workbook with SYNTHETIC data only.
// Usage: node scripts/driver-one-v1100-regression.mjs
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createSandbox } from './lib/apps-script-sandbox.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ciSort = (a, b) => (a.toLowerCase() < b.toLowerCase() ? -1 : a.toLowerCase() > b.toLowerCase() ? 1 : 0);
const files = fs.readdirSync(path.join(root, 'src')).filter(f => f.endsWith('.gs')).sort(ciSort).map(f => 'src/' + f);

const H = {
  Drivers: ['Driver ID','Driver Name','Mobile','PIN Hash','Delivery Type','Vehicle Number','Vehicle Type','Capacity Qty','Current Route ID','Current Stop ID','Last Login','Status','Created At','Updated At','Staff ID','Access Source'],
  Delivery_Routes: ['Route ID','Route Date','Route Type','Driver ID','Vehicle Number','Hub Latitude','Hub Longitude','Total Stops','Completed Stops','Total Road KM','Estimated Minutes','Optimization Source','Status','Created At','Updated At','Route Polyline','API Status'],
  Route_Stops: ['Stop ID','Route ID','Route Type','Stop Sequence','Order Type','Order ID','Customer/Vendor ID','Display Name','Mobile','Address','Latitude','Longitude','Required Qty','Assigned Batch Qty','Delivered Qty','Road Distance From Previous KM','Travel Time From Previous Min','Planned ETA','Check In At','Barcode Verified At','Delivered At','Check Out At','Tracking Visible','Status','Priority','Time Slot','Failure Reason','Failure Remarks','Failed At','Failure Latitude','Failure Longitude'],
  Delivery_Events: ['Event ID','Event At','Route ID','Stop ID','Order Type','Order ID','Driver ID','Event Type','Latitude','Longitude','Barcode','Quantity','Remarks'],
  Driver_Live: ['Live ID','Driver ID','Route ID','Stop ID','Order Type','Order ID','Latitude','Longitude','Accuracy M','Heading','Updated At','Status'],
  Staff_Users: ['Staff ID','Name','Mobile','PIN Hash','Role','Allowed App','Status','Last Login','Created At','Updated At'],
  Audit_Log: ['Audit ID','Created At','Module','Action','Reference Type','Reference ID','User ID','Old Value','New Value'],
  B2B_Orders: ['Order ID','Vendor ID','Business Name','Status','Ordered At','Latitude','Longitude','Assigned Route ID'],
  Products: ['Product ID','Product Name']
};

let passed = 0;
const results = [];
async function test(name, fn) {
  try { await fn(); passed++; results.push('✓ ' + name); }
  catch (e) { results.push('✗ ' + name + '\n    ' + (e && e.stack || e).split('\n').slice(0, 3).join('\n    ')); process.exitCode = 1; }
}
const throws = (fn, re) => assert.throws(fn, err => re.test(String(err && err.message)), 'expected error ' + re);

const sb = createSandbox({ files, root });
const { ss, props, templates } = sb;
const call = (fn, ...args) => sb.call(fn, ...args);
const hash = v => call('hashV8_', v);
for (const [name, headers] of Object.entries(H)) ss.add(name, headers);
const today = call('isoDate_');
const tomorrow = call('isoDate_', new Date(Date.now() + 86400000));
const yesterday = call('isoDate_', new Date(Date.now() - 86400000));

// Synthetic people only — never real customers.
const now = new Date();
ss.getSheetByName('Drivers').data.push(
  ['DRV-TEST-A','Test Driver A','9000011111',hash('4321'),'B2B','KA00TEST1','Pickup',1800,'','','','ACTIVE',now,now,'',''],
  ['DRV-TEST-B','Test Driver B','9000022222',hash('8765'),'B2B','KA00TEST2','Pickup',800,'','','','ACTIVE',now,now,'',''],
  ['DRV-TEST-C','Test Driver C','9000033333',hash('1111'),'B2C','KA00TEST3','Bike',100,'','','','ACTIVE',now,now,'',''],
  ['DRV-TEST-NOCAP','Test Driver NoCap','9000044444',hash('2222'),'B2B','KA00TEST4','Pickup','','','','','ACTIVE',now,now,'','']
);
ss.getSheetByName('Staff_Users').data.push(
  ['STF-OPS-T','Test Ops','9000055555',hash('5555'),'OPERATIONS','OPERATIONS','ACTIVE','','',''],
  ['STF-PICK-T','Test Picker','9000066666',hash('6666'),'PICKER','PICKER','ACTIVE','','','']
);
ss.getSheetByName('B2B_Orders').data.push(['NEB2B-T1','V-T1','Test Shop','Confirmed',now,12.9,77.6,'']);
props.set('ADMIN_EMAIL', 'admin@example.test');
props.set('ADMIN_PIN_HASH', hash('9090'));
const ADMIN = { email: 'admin@example.test', pin: '9090' };
const OPS = { mobile: '9000055555', pin: '5555' };
const rowsOf = n => ss.getSheetByName(n) ? ss.getSheetByName(n).data.length : 0;
let seq = 0; const rid = () => 'req-test-' + (++seq).toString().padStart(4, '0') + '-' + Math.random().toString(36).slice(2, 8);

const fileRows = [
  { __row: 2, 'Customer Name': 'Synthetic Shop One', 'Phone Number': 9876500001, Lat: 12.8995, Long: 77.6010, Quantity: 300, Amount: 12900, 'Order ID': 'T-ORD-1' },
  { __row: 3, 'Customer Name': 'Synthetic Shop Two', 'Phone Number': '+91 98765 00002', Lat: '12.9172', Long: '77.6103', Quantity: 200, Amount: 8600 },
  { __row: 4, 'Customer Name': '=HYPERLINK("http://x")', 'Phone Number': '098765 00003', Lat: 12.8000, Long: 77.5990, Quantity: 100, Amount: 4000, __formulaFields: ['Phone Number'] },
  { __row: 5, 'Customer Name': '', 'Phone Number': '9876500004', Lat: 12.9, Long: 77.6 },
  { __row: 6, 'Customer Name': 'Bad Phone', 'Phone Number': '12345', Lat: 12.9, Long: 77.6 },
  { __row: 7, 'Customer Name': 'Sci Phone', 'Phone Number': '9.87650E+09', Lat: 12.9, Long: 77.6 },
  { __row: 8, 'Customer Name': 'Bad Lat', 'Phone Number': '9876500008', Lat: 95, Long: 77.6 },
  { __row: 9, 'Customer Name': 'Zero', 'Phone Number': '9876500009', Lat: 0, Long: 0 },
  { __row: 10, 'Customer Name': 'Neg Qty', 'Phone Number': '9876500010', Lat: 12.9, Long: 77.6, Quantity: -5 },
  { __row: 11, 'Customer Name': 'Dup Order', 'Phone Number': '9876500011', Lat: 12.91, Long: 77.61, 'Order ID': 'T-ORD-1' },
  { __row: 12, 'Customer Name': '', 'Phone Number': '', Lat: '', Long: '' }
];
const aliasRows = [{ __row: 2, name: 'Alias Shop', mobile: '9876511111', latitude: 12.91, lng: 77.59, qty: '150', 'order value': '6450.50' }];

await test('All 67+ Apps Script files load in project order with V1100 last', () => {
  assert.equal(call('getDriverOneHealthV1100').otpRequired, false);
  assert.equal(call('getDriverOneHealthV1100').invoicesInDriverApp, false);
});

await test('SECURITY: admin credentials cannot be replaced anonymously', () => {
  throws(() => call('setV8AdminCredentials', 'attacker@example.test', '1234'), /Invalid admin credentials/);
  assert.equal(props.get('ADMIN_EMAIL'), 'admin@example.test');
  throws(() => call('setV8AdminCredentials', 'attacker@example.test', '1234', 'admin@example.test', '0000'), /Invalid admin credentials/);
  assert.equal(call('setV8AdminCredentials', 'admin@example.test', '9090', 'admin@example.test', '9090'), true);
});

await test('Validation: aliases, text phones, +91/0 normalisation, row-numbered errors', () => {
  const v = call('v1100ValidateRows_', fileRows, { routeDate: tomorrow });
  assert.equal(v.totals.rows, 10, 'blank row ignored');
  assert.equal(JSON.stringify(v.accepted.map(a => a.phone)), JSON.stringify(['9876500001', '9876500002', '9876500003']));
  const byRow = r => v.errors.filter(e => e.row === r).map(e => e.field + ': ' + e.message).join(' | ');
  assert.match(byRow(5), /Customer name is required/);
  assert.match(byRow(6), /valid 10-digit/);
  assert.match(byRow(7), /scientific notation/);
  assert.match(byRow(8), /Latitude/);
  assert.match(byRow(9), /0,0/);
  assert.match(byRow(10), /Quantity/);
  assert.match(byRow(11), /Duplicate Order ID/);
  assert.equal(v.totals.rejected, 7);
  assert.ok(v.warnings.some(w => w.row === 4 && /Formula-calculated values in: phone/.test(w.message)));
  const a = call('v1100ValidateRows_', aliasRows, {});
  assert.equal(a.accepted.length, 1);
  assert.equal(a.accepted[0].qty, 150);
  assert.equal(a.accepted[0].amount, 6450.5);
  const tooMany = call('v1100ValidateRows_', Array.from({ length: 201 }, (_, i) => ({ __row: i + 2, name: 'x' })), {});
  assert.match(tooMany.errors[0].message, /Maximum 200/);
});

await test('Preview requires dispatcher auth and never writes', () => {
  throws(() => call('d1PreviewImportV1100', {}, { rows: fileRows }), /sign-in required/);
  throws(() => call('d1PreviewImportV1100', { mobile: '9000066666', pin: '6666' }, { rows: fileRows }), /Invalid OPERATIONS/);
  const snap = () => [...ss.sheets.values()].filter(s => s.name !== 'Staff_Users').map(s => s.name + ':' + s.writes + ':' + s.data.length).join(',');
  const before = snap();
  const p = call('d1PreviewImportV1100', OPS, { rows: fileRows, routeDate: tomorrow, driverId: 'DRV-TEST-A' });
  assert.equal(p.mutated, false);
  assert.equal(p.totals.accepted, 3);
  assert.equal(p.driver.capacity, 1800);
  assert.equal(p.driver.pinHash, undefined);
  assert.equal(snap(), before, 'preview must not write (staff last-login timestamp excepted)');
});

let routeId;
await test('Create route: rejects errors unless partial import is approved; nothing half-written', () => {
  const stopsBefore = rowsOf('Route_Stops'), routesBefore = rowsOf('Delivery_Routes');
  throws(() => call('d1CreateRouteV1100', OPS, { rows: fileRows, routeDate: tomorrow, driverId: 'DRV-TEST-A' }), /7 row\(s\) have errors/);
  throws(() => call('d1CreateRouteV1100', OPS, { rows: fileRows, routeDate: yesterday, driverId: 'DRV-TEST-A', acceptPartial: true }), /past/);
  throws(() => call('d1CreateRouteV1100', OPS, { rows: fileRows, routeDate: tomorrow, driverId: 'DRV-TEST-C', acceptPartial: true }), /not enabled for B2B/);
  throws(() => call('d1CreateRouteV1100', OPS, { rows: fileRows, routeDate: tomorrow, driverId: 'DRV-TEST-NOCAP', acceptPartial: true }), /capacity is not set/);
  throws(() => call('d1CreateRouteV1100', OPS, { rows: fileRows.map(r => ({ ...r, Quantity: r.Quantity ? 400 : r.Quantity })), routeDate: tomorrow, driverId: 'DRV-TEST-B', acceptPartial: true }), /exceeds recorded vehicle capacity 800/);
  assert.equal(rowsOf('Route_Stops'), stopsBefore);
  assert.equal(rowsOf('Delivery_Routes'), routesBefore);
});

await test('Create route: partial import writes route, stops, terms, import log; no invented KM/ETA', () => {
  const r = call('d1CreateRouteV1100', OPS, { rows: fileRows, routeDate: tomorrow, driverId: 'DRV-TEST-A', acceptPartial: true, fileName: 'synthetic.xlsx', sequenceMode: 'NEAREST' });
  routeId = r.routeId;
  assert.equal(r.duplicate, false);
  assert.equal(r.stops, 3);
  assert.equal(r.totalQty, 600);
  assert.equal(r.totalAmount, 25500);
  assert.equal(r.sequenceSource, 'STRAIGHT_LINE_NEAREST_NEIGHBOUR');
  assert.equal(r.roadKm, null);
  assert.equal(JSON.stringify(r.skippedRows), JSON.stringify([5, 6, 7, 8, 9, 10, 11]));
  const route = call('find_', 'Delivery_Routes', 'Route ID', routeId);
  assert.equal(route['Route Type'], 'B2B_D1');
  assert.equal(route['API Status'], 'DRIVER_ONE_V1100');
  assert.equal(route['Total Road KM'], '');
  assert.equal(route['Estimated Minutes'], '');
  assert.equal(route.Status, 'PLANNED');
  const stops = call('rows_', 'Route_Stops').filter(s => s['Route ID'] === routeId);
  assert.equal(stops.length, 3);
  // Nearest-neighbour from the hub (12.814, 77.588): the 12.800 stop is closest.
  assert.equal(stops.find(s => s['Stop Sequence'] === 1).Mobile, '9876500003');
  assert.equal(stops.find(s => s.Mobile === '9876500003')['Display Name'], "'=HYPERLINK(\"http://x\")", 'formula injection neutralised');
  assert.equal(typeof stops[0].Mobile, 'string');
  assert.equal(rowsOf('D1_Stop_Terms') - 1, 3);
  assert.equal(rowsOf('D1_Imports') - 1, 1);
  assert.equal(call('rows_', 'B2B_Orders').length, 1, 'B2B orders untouched');
});

await test('Create route is idempotent on retry (same file, date, driver)', () => {
  const stops = rowsOf('Route_Stops');
  const r = call('d1CreateRouteV1100', OPS, { rows: fileRows, routeDate: tomorrow, driverId: 'DRV-TEST-A', acceptPartial: true, sequenceMode: 'NEAREST' });
  assert.equal(r.duplicate, true);
  assert.equal(r.routeId, routeId);
  assert.equal(rowsOf('Route_Stops'), stops);
  try { call('d1CreateRouteV1100', ADMIN, { rows: [fileRows[0]], routeDate: tomorrow, driverId: 'DRV-TEST-B' }); assert.fail('expected clash'); }
  catch (e) { assert.match(String(e.message), /T-ORD-1 is already on another route/, String(e.message)); }
});

await test('Legacy V8 driver app never sees Driver One routes', () => {
  const legacy = call('getDriverDayRouteV8', '9000011111', '4321', 'B2B', tomorrow);
  assert.equal(legacy.route, null);
});

await test('Driver sees only own routes; other driver is refused', () => {
  const a = call('d1DriverLoginV1100', '9000011111', '4321');
  assert.equal(a.otpRequired, false);
  assert.equal(JSON.stringify(a.routes.map(r => r.routeId)), JSON.stringify([routeId]));
  assert.equal(JSON.stringify(a).includes('PIN Hash'), false);
  throws(() => call('d1DriverLoginV1100', '9000011111', '0000'), /Invalid driver/);
  const b = call('d1DriverLoginV1100', '9000022222', '8765');
  assert.equal(b.routes.length, 0);
  throws(() => call('d1GetRouteV1100', '9000022222', '8765', routeId), /not assigned to you/);
  const stop = call('d1GetRouteV1100', '9000011111', '4321', routeId).stops[0];
  throws(() => call('d1CheckInV1100', '9000022222', '8765', stop.stopId, {}, rid()), /not assigned to you/);
});

let view;
const A = ['9000011111', '4321'];
await test('Loading: cannot start before load, cannot exceed capacity, retry-safe', () => {
  throws(() => call('d1StartTripV1100', ...A, routeId, {}, rid()), /Confirm vehicle loading/);
  throws(() => call('d1ConfirmLoadV1100', ...A, routeId, 1801, rid()), /exceeds recorded vehicle capacity 1800/);
  throws(() => call('d1ConfirmLoadV1100', ...A, routeId, 600, 'x'), /request ID/);
  const req = rid();
  const l = call('d1ConfirmLoadV1100', ...A, routeId, 600, req);
  assert.equal(l.loadedQty, 600);
  const events = rowsOf('Delivery_Events');
  assert.equal(call('d1ConfirmLoadV1100', ...A, routeId, 600, req).duplicate, true);
  assert.equal(rowsOf('Delivery_Events'), events);
  call('d1StartTripV1100', ...A, routeId, { lat: 12.814, lng: 77.588, accuracy: 12 }, rid());
  throws(() => call('d1ConfirmLoadV1100', ...A, routeId, 500, rid()), /before the trip starts/);
  view = call('d1GetRouteV1100', ...A, routeId);
  assert.equal(view.status, 'IN_PROGRESS');
  assert.equal(view.totals.loadedQty, 600);
});

await test('Delivery without OTP: full, partial and failed outcomes with quantity rules', () => {
  const [s1, s2, s3] = view.stops; // 100 (₹4000), 300 (₹12900), 200 (₹8600) by sequence
  throws(() => call('d1RecordDeliveryV1100', ...A, s1.stopId, { outcome: 'DELIVERED', deliveredQty: s1.requiredQty, requestId: rid() }), /Check in at the stop first/);
  const ci = call('d1CheckInV1100', ...A, s1.stopId, { lat: 12.8001, lng: 77.5991, accuracy: 9 }, rid());
  assert.equal(ci.gpsCaptured, true);
  throws(() => call('d1RecordDeliveryV1100', ...A, s1.stopId, { outcome: 'DELIVERED', deliveredQty: s1.requiredQty - 1, requestId: rid() }), /Full delivery must be exactly/);
  throws(() => call('d1RecordDeliveryV1100', ...A, s1.stopId, { outcome: 'DELIVERED', deliveredQty: s1.requiredQty + 1, requestId: rid() }), /cannot exceed/);
  throws(() => call('d1RecordDeliveryV1100', ...A, s1.stopId, { outcome: 'DELIVERED', deliveredQty: 'abc', requestId: rid() }), /whole number/);
  const req = rid();
  const d1 = call('d1RecordDeliveryV1100', ...A, s1.stopId, { outcome: 'DELIVERED', deliveredQty: s1.requiredQty, requestId: req });
  assert.equal(d1.status, 'DELIVERED');
  assert.equal(call('d1RecordDeliveryV1100', ...A, s1.stopId, { outcome: 'DELIVERED', deliveredQty: s1.requiredQty, requestId: req }).duplicate, true);
  throws(() => call('d1RecordDeliveryV1100', ...A, s1.stopId, { outcome: 'DELIVERED', deliveredQty: s1.requiredQty, requestId: rid() }), /already recorded/);

  call('d1CheckInV1100', ...A, s2.stopId, {}, rid()); // GPS denied still records check-in
  throws(() => call('d1RecordDeliveryV1100', ...A, s2.stopId, { outcome: 'PARTIAL', deliveredQty: 250, returnedQty: 20, requestId: rid() }), /reason/);
  throws(() => call('d1RecordDeliveryV1100', ...A, s2.stopId, { outcome: 'PARTIAL', deliveredQty: 250, returnedQty: 60, failureReason: 'Damaged', requestId: rid() }), /Delivered \+ returned/);
  const d2 = call('d1RecordDeliveryV1100', ...A, s2.stopId, { outcome: 'PARTIAL', deliveredQty: 250, returnedQty: 20, failureReason: 'Damaged stock rejected', requestId: rid() });
  assert.equal(d2.remainingOnVehicle, 600 - 100 - 250);

  call('d1CheckInV1100', ...A, s3.stopId, { lat: 12.92, lng: 77.61 }, rid());
  throws(() => call('d1RecordDeliveryV1100', ...A, s3.stopId, { outcome: 'FAILED', deliveredQty: 5, failureReason: 'Shop closed', requestId: rid() }), /cannot have delivered/);
  throws(() => call('d1RecordDeliveryV1100', ...A, s3.stopId, { outcome: 'FAILED', deliveredQty: 0, requestId: rid() }), /failure reason/);
  call('d1RecordDeliveryV1100', ...A, s3.stopId, { outcome: 'FAILED', deliveredQty: 0, failureReason: 'Shop closed', gps: { lat: 12.92, lng: 77.61 }, requestId: rid() });
  const st = call('find_', 'Route_Stops', 'Stop ID', s3.stopId);
  assert.equal(st['Failure Reason'], 'Shop closed');
  assert.equal(st['Failure Latitude'], 12.92);
  const ev = call('rows_', 'Delivery_Events').filter(e => e['Route ID'] === routeId);
  assert.ok(ev.every(e => !/"otp":true/.test(String(e.Remarks))));
});

await test('Collections: Cash vs UPI kept separate, capped to amount due, failed stop cannot be paid', () => {
  view = call('d1GetRouteV1100', ...A, routeId);
  const [s1, s2, s3] = view.stops;
  assert.equal(s2.collectible, Math.round(s2.amountDue * 250 / 300 * 100) / 100);
  throws(() => call('d1RecordCollectionV1100', ...A, s3.stopId, { method: 'CASH', amount: 100, requestId: rid() }), /failed stop cannot have a collection/);
  throws(() => call('d1RecordCollectionV1100', ...A, s1.stopId, { method: 'CASH', amount: s1.amountDue + 1, requestId: rid() }), /exceeds/);
  throws(() => call('d1RecordCollectionV1100', ...A, s1.stopId, { method: 'UPI', amount: 100, upiRef: '', requestId: rid() }), /UPI reference/);
  const req = rid();
  const c1 = call('d1RecordCollectionV1100', ...A, s1.stopId, { method: 'CASH', amount: 1000, requestId: req });
  assert.equal(c1.status, 'DRIVER_ENTERED');
  assert.equal(call('d1RecordCollectionV1100', ...A, s1.stopId, { method: 'CASH', amount: 1000, requestId: req }).duplicate, true);
  const c2 = call('d1RecordCollectionV1100', ...A, s1.stopId, { method: 'UPI', amount: s1.amountDue - 1000, upiRef: 'utr123456789', requestId: rid() });
  assert.equal(c2.status, 'PROOF_SUBMITTED');
  assert.equal(c2.balance, 0);
  throws(() => call('d1RecordCollectionV1100', ...A, s2.stopId, { method: 'UPI', amount: 10, upiRef: 'UTR123456789', requestId: rid() }), /already been recorded/);
  call('d1RecordCollectionV1100', ...A, s2.stopId, { method: 'CASH', amount: s2.collectible, requestId: rid() });
  const cols = call('rows_', 'D1_Collections');
  assert.equal(cols.length, 3);
  assert.ok(cols.every(c => ['DRIVER_ENTERED', 'PROOF_SUBMITTED'].includes(c.Status)), 'nothing auto-marked as received');
});

await test('Close trip: requires reconciliation; variance goes to supervisor review', () => {
  view = call('d1GetRouteV1100', ...A, routeId);
  const t = view.totals;
  assert.equal(t.deliveredQty, 350);
  const expectedBack = 600 - 350;
  throws(() => call('d1CloseTripV1100', ...A, routeId, { returnedToHubQty: expectedBack - 2, cashHandedOver: t.cash, requestId: rid() }), /Explain the difference/);
  const req = rid();
  const c = call('d1CloseTripV1100', ...A, routeId, { returnedToHubQty: expectedBack - 2, cashHandedOver: t.cash, remarks: '2 cracked in transit', requestId: req });
  assert.equal(c.status, 'CLOSED_PENDING_REVIEW');
  assert.equal(c.reconciliation.stockVariance, -2);
  assert.equal(c.reconciliation.cashVariance, 0);
  assert.equal(call('d1CloseTripV1100', ...A, routeId, { requestId: req }).duplicate, true);
  throws(() => call('d1ReviewRouteV1100', ADMIN, routeId, true, ''), /review notes/);
  assert.equal(call('d1ReviewRouteV1100', ADMIN, routeId, true, 'Damage approved').status, 'CLOSED');
  const board = call('d1GetDispatchBoardV1100', OPS, tomorrow);
  assert.equal(board.routes.length, 1);
  assert.equal(board.routes[0].status, 'CLOSED');
  assert.equal(board.routes[0].totals.failed, 1);
  const detail = call('d1GetRouteDetailAdminV1100', ADMIN, routeId);
  assert.ok(detail.events.some(e => e.type === 'TRIP_CLOSED'));
  const col = detail.collections.find(x => x.method === 'UPI');
  assert.equal(call('d1ValidateCollectionV1100', ADMIN, col.collectionId, 'VALIDATED', '').status, 'VALIDATED');
  throws(() => call('d1ValidateCollectionV1100', ADMIN, col.collectionId, 'REJECTED', 'x'), /already validated/);
});

await test('Unresolved stops block closing; planned route can be cancelled by dispatch only', () => {
  const r2 = call('d1CreateRouteV1100', ADMIN, { rows: aliasRows, routeDate: today, driverId: 'DRV-TEST-B' });
  const B = ['9000022222', '8765'];
  call('d1ConfirmLoadV1100', ...B, r2.routeId, 150, rid());
  call('d1StartTripV1100', ...B, r2.routeId, {}, rid());
  throws(() => call('d1CloseTripV1100', ...B, r2.routeId, { returnedToHubQty: 150, cashHandedOver: 0, requestId: rid() }), /not resolved/);
  throws(() => call('d1CancelRouteV1100', ADMIN, r2.routeId, 'mistake'), /not been loaded/);
  const r3 = call('d1CreateRouteV1100', ADMIN, { rows: [{ ...aliasRows[0], mobile: '9876522222' }], routeDate: tomorrow, driverId: 'DRV-TEST-B' });
  throws(() => call('d1CancelRouteV1100', OPS, r3.routeId, ''), /reason/);
  assert.equal(call('d1CancelRouteV1100', OPS, r3.routeId, 'Customer postponed').success, true);
  assert.equal(call('d1DriverLoginV1100', ...B).routes.some(r => r.routeId === r3.routeId), false);
});

await test('Pages: dispatch/driverone routes resolve; legacy routes unchanged', () => {
  templates.length = 0;
  call('doGet', { parameter: { page: 'driverone' } });
  call('doGet', { parameter: { page: 'dispatch' } });
  call('doGet', { parameter: { page: 'driver' } });
  assert.equal(JSON.stringify(templates.slice(0, 3)), JSON.stringify(['DriverOneV1100', 'DispatchV1100', 'Driver']));
});

await test('UI contract: no OTP input and no invoice/print in Driver One', () => {
  const driverUi = fs.readFileSync(path.join(root, 'src/DriverOneV1100.html'), 'utf8');
  const shell = fs.readFileSync(path.join(root, 'apps/driver-one/index.html'), 'utf8');
  for (const src of [driverUi, shell]) {
    assert.doesNotMatch(src, /\botp\b/i);
    assert.doesNotMatch(src, /invoice|window\.print|\.print\(/i);
  }
  assert.match(driverUi, /d1RecordDeliveryV1100/);
  assert.doesNotMatch(shell, /98765|9980|7259|9844|9900/, 'no customer phone numbers in the public shell');
  const dispatchUi = fs.readFileSync(path.join(root, 'src/DispatchV1100.html'), 'utf8');
  assert.match(dispatchUi, /d1PreviewImportV1100/);
  assert.match(dispatchUi, /d1CreateRouteV1100/);
  for (const f of ['src/DriverOneV1100.html', 'src/DispatchV1100.html']) {
    const html = fs.readFileSync(path.join(root, f), 'utf8');
    [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m => m[1]).filter(s => s.trim()).forEach(s => new Function(s));
  }
});

console.log(results.join('\n'));
console.log(`\nDriver One V1100 regression: ${passed}/${results.length} passed.`);
