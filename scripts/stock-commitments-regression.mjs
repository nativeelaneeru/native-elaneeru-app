// Native Elaneeru V11.1.0 — committed stock + 2-hour manual stock cycle regression.
// Loads every real src/*.gs file in Apps Script order against an in-memory workbook. Synthetic data only.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createSandbox } from './lib/apps-script-sandbox.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ciSort = (a, b) => (a.toLowerCase() < b.toLowerCase() ? -1 : a.toLowerCase() > b.toLowerCase() ? 1 : 0);
const files = fs.readdirSync(path.join(root, 'src')).filter(f => f.endsWith('.gs')).sort(ciSort).map(f => 'src/' + f);
const sb = createSandbox({ files, root });
const { ss } = sb;
const call = (fn, ...a) => sb.call(fn, ...a);
const H = {
  Products: ['Product ID', 'Product Name'],
  Coconut_Batches: ['Batch ID', 'Barcode', 'Product ID', 'Product Name', 'Original Qty', 'Available Qty', 'Reserved Qty', 'Delivered Qty', 'Location', 'Picker ID', 'Printed', 'Status', 'Created At', 'Updated At'],
  Batch_Assignments: ['Assignment ID', 'Assigned At', 'Batch ID', 'Barcode', 'Order Type', 'Order ID', 'Stop ID', 'Product ID', 'Assigned Qty', 'Scanned Qty', 'Delivered Qty', 'Assigned By', 'Status', 'Updated At'],
  B2B_Orders: ['Order ID', 'Ordered At', 'Vendor ID', 'Business Name', 'Owner Name', 'Mobile', 'Address', 'Area', 'Pincode', 'Latitude', 'Longitude', 'Payment Type', 'Payment Status', 'Subtotal', 'Discount', 'Total Amount', 'Outstanding Before', 'Outstanding After', 'Status', 'Delivery OTP Hash', 'Delivery Slot', 'Priority', 'Delivery Date', 'Source', 'Created At', 'Updated At', 'Notes'],
  B2B_Order_Items: ['Item ID', 'Order ID', 'Product ID', 'Product Name', 'Quantity', 'Unit', 'Unit Price', 'Line Amount', 'Batch Required', 'Picked Qty', 'Delivered Qty', 'Status', 'Created At', 'Updated At'],
  B2B_Vendors: ['Vendor ID', 'Business Name', 'Owner Name', 'Mobile', 'Address', 'Area', 'Pincode', 'Latitude', 'Longitude', 'Payment Type', 'Credit Limit', 'Outstanding', 'Status', 'Updated At'],
  B2B_Stock_Checks: ['Product ID', 'Verified At', 'Verified By', 'Status', 'Safety Qty'],
  B2B_Auto_Accept: ['Setting', 'Value'],
  B2B_Delivery_Capacity: ['Delivery Date', 'Slot', 'Area', 'Capacity Qty', 'Cutoff At', 'Enabled'],
  B2B_Acceptance_Log: ['Order ID', 'Vendor ID', 'Checked At', 'Decision', 'Reason', 'Delivery Date', 'Delivery Slot', 'Reserved Qty'],
  Staff_Users: ['Staff ID', 'Name', 'Mobile', 'PIN Hash', 'Role', 'Allowed App', 'Status', 'Last Login', 'Created At', 'Updated At'],
  Inventory_Ledger: ['Movement ID', 'Created At', 'Product ID', 'Product Name', 'Location', 'Movement Type', 'Qty In', 'Qty Out', 'Reference Type', 'Reference ID', 'Batch ID', 'Reason', 'User ID'],
  Audit_Log: ['Audit ID', 'Created At', 'Module', 'Action', 'Reference Type', 'Reference ID', 'User ID', 'Old Value', 'New Value']
};
for (const [n, h] of Object.entries(H)) ss.add(n, h);
const hash = v => call('hashV8_', v);
const now = new Date(), hoursAgo = h => new Date(Date.now() - h * 3600000);
ss.getSheetByName('Products').data.push(['TC', 'Tender Coconut']);
ss.getSheetByName('Staff_Users').data.push(['STF-T-OPS', 'Test Ops', '9000090000', hash('2580'), 'OPERATIONS', 'BUNCH', 'ACTIVE', '', '', '']);
ss.getSheetByName('B2B_Vendors').data.push(['V-T1', 'Test Shop', 'Owner', '9876500100', 'Addr', 'Jayanagar', '560001', 12.9, 77.6, 'COD', 0, 0, 'ACTIVE', now]);
ss.getSheetByName('B2B_Auto_Accept').data.push(['Enabled', true], ['StockCheckMaxHours', 3]);
const B = ss.getSheetByName('Coconut_Batches').data;
B.push(['BUN-1', 'NEL-B-1', 'TC', 'Tender Coconut', 300, 300, 0, 0, 'HUB', 'STF', 'NO', 'AVAILABLE', hoursAgo(5), hoursAgo(5)]);
B.push(['BUN-2', 'NEL-B-2', 'TC', 'Tender Coconut', 210, 210, 0, 0, 'HUB', 'STF', 'NO', 'AVAILABLE', hoursAgo(3), hoursAgo(3)]);
B.push(['BUN-DEMO', 'DEMO-1', 'TC', 'Tender Coconut', 50, 0, 0, 50, 'HUB', 'STF', 'NO', 'DELIVERED', hoursAgo(1), hoursAgo(1)]);
const O = ss.getSheetByName('B2B_Orders').data, I = ss.getSheetByName('B2B_Order_Items').data;
const order = (id, status, at, qty) => { O.push([id, at, 'V-OLD', 'Shop', '', '', '', 'Jayanagar', '', '', '', 'COD', 'PENDING', 0, 0, 0, 0, 0, status, '', '', 'NORMAL', '', 'B2B WEB', at, at, '']); I.push(['BI-' + id, id, 'TC', 'Tender Coconut', qty, 'pc', 40, qty * 40, 'YES', 0, 0, 'OPEN', at, at]); };
order('OPEN-1', 'Order Received', hoursAgo(1), 200);          // promised, not bunched
order('OPEN-2', 'Confirmed', hoursAgo(2), 100);               // 60 already bunched -> 40 promised
order('DONE-1', 'Delivered', hoursAgo(2), 300);                // closed
order('CXL-1', 'Cancelled', hoursAgo(2), 400);                 // closed
order('STALE-1', 'Order Received', hoursAgo(100), 900);        // older than 72 h window
ss.getSheetByName('Batch_Assignments').data.push(['ASN-1', now, 'BUN-X', 'NEL-X', 'B2B', 'OPEN-2', '', 'TC', 60, 0, 0, 'picker', 'ASSIGNED', now]);
const stock = () => { sb.cache.clear(); return call('getBunchStockV944').find(x => x.productId === 'TC'); };

let passed = 0; const results = [];
const test = (name, fn) => { try { fn(); passed++; results.push('✓ ' + name); } catch (e) { results.push('✗ ' + name + '\n    ' + String(e.stack || e).split('\n').slice(0, 3).join('\n    ')); process.exitCode = 1; } };

test('Vendor availability = bunch stock − open unbunched promises (cancelled, delivered and >72 h orders ignored)', () => {
  const x = stock();
  assert.equal(x.onHandQty, 510);
  assert.equal(x.committedQty, 240);
  assert.equal(x.availableQty, 270);
  assert.equal(x.stockStatus, 'IN_STOCK');
});

test('Cancelling an order releases its coconuts immediately; nothing was written to batches', () => {
  const before = JSON.stringify(B.map(r => r.slice(0, 8)));
  const row = O.findIndex(r => r[0] === 'OPEN-1');
  O[row][18] = 'Cancelled';
  assert.equal(stock().availableQty, 470);
  O[row][18] = 'Order Received';
  assert.equal(stock().availableQty, 270);
  assert.equal(JSON.stringify(B.map(r => r.slice(0, 8))), before);
});

const lines = q => [{ x: { productId: 'TC', productName: 'Tender Coconut' }, q, line: q * 40 }];
const vendor = () => call('find_', 'B2B_Vendors', 'Vendor ID', 'V-T1');
test('Orders above free stock are refused inside the order lock (COD path had no stock check before)', () => {
  assert.throws(() => call('neAutoPrepare_', vendor(), lines(300), {}), /Only 270 Tender Coconut available right now/);
  const plan = call('neAutoPrepare_', vendor(), lines(200), {});
  assert.equal(plan.accepted, false, 'no published slot, so it waits for operations');
});

test('Auto-accept cannot hand promised coconuts to a new order', () => {
  ss.getSheetByName('B2B_Stock_Checks').data.push(['TC', new Date(Date.now() - 30 * 60000).toISOString(), 'Ops', 'VERIFIED', 0]);
  const ctx = call('neAutoContext_');
  assert.equal(ctx.checks.find(r => r['Product ID'] === 'TC')['Safety Qty'], 240);
});

test('Full COD order path: two vendors cannot both take the last coconuts', () => {
  vm.runInContext("vendor_=()=>find_(V8.SHEETS.B2B_VENDORS,'Vendor ID','V-T1');b2bProducts_=()=>[{productId:'TC',productName:'Tender Coconut',price:40,moq:50,qtyStep:50,unit:'pc'}];", sb.ctx);
  const first = call('placeB2BOrder', 'tok', { clientRequestId: 'req-a-000001', items: [{ productId: 'TC', quantity: 250 }], paymentType: 'COD' });
  assert.equal(first.success, true);
  assert.equal(stock().availableQty, 20);
  assert.throws(() => call('placeB2BOrder', 'tok', { clientRequestId: 'req-b-000001', items: [{ productId: 'TC', quantity: 200 }], paymentType: 'COD' }), /Only 20 Tender Coconut available/);
  const retry = call('placeB2BOrder', 'tok', { clientRequestId: 'req-a-000001', items: [{ productId: 'TC', quantity: 250 }], paymentType: 'COD' });
  assert.equal(retry.duplicatePrevented, true, 'a retried submit returns the same order, not a stock error');
});

test('A 2-hourly bunch entry adds stock, records the stock check, and refreshes availability at once', () => {
  sb.cache.clear(); call('getBunchStockV944'); // warm cache with old value
  const r = call('createBunchV944', '9000090000', '2580', { productId: 'TC', qty: 400 });
  assert.equal(r.success, true);
  assert.equal(call('getBunchStockV944').find(x => x.productId === 'TC').availableQty, 420, 'cache cleared by the entry');
  const chk = call('rows_', 'B2B_Stock_Checks').find(x => x['Product ID'] === 'TC');
  assert.equal(chk.Status, 'VERIFIED');
  assert.match(String(chk['Verified By']), /Test Ops/);
  assert.ok(Date.now() - Date.parse(chk['Verified At']) < 60000);
});

test('Freshness: fresh after an entry, stale after 150 minutes', () => {
  let f = call('v1110Freshness_');
  assert.equal(f.stale, false);
  assert.ok(f.minutesSince <= 1);
  for (const r of B.slice(1)) if (!/DEMO/.test(r[1])) r[12] = hoursAgo(3); // row 0 is the header
  f = call('v1110Freshness_');
  assert.equal(f.stale, true);
  assert.ok(f.minutesSince >= 179);
  assert.equal(f.products.find(p => p.productId === 'TC').available, 420);
});

console.log(results.join('\n'));
console.log(`\nStock commitments V1110 regression: ${passed}/${results.length} passed.`);
