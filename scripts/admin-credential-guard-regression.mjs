// Security regression: anonymous callers cannot replace the admin login.
// Loads every real src/*.gs file in Apps Script order into an in-memory sandbox.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createSandbox } from './lib/apps-script-sandbox.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ciSort = (a, b) => (a.toLowerCase() < b.toLowerCase() ? -1 : a.toLowerCase() > b.toLowerCase() ? 1 : 0);
const files = fs.readdirSync(path.join(root, 'src')).filter(f => f.endsWith('.gs')).sort(ciSort).map(f => 'src/' + f);
const sb = createSandbox({ files, root });
sb.ss.add('Audit_Log', ['Audit ID','Created At','Module','Action','Reference Type','Reference ID','User ID','Old Value','New Value']);
const call = (fn, ...a) => sb.call(fn, ...a);

// First-time setup still works with no stored credentials.
assert.equal(call('setV8AdminCredentials', 'owner@example.test', '4826'), true);
assert.equal(sb.props.get('ADMIN_EMAIL'), 'owner@example.test');
// Anonymous or wrong-credential replacement is refused and changes nothing.
assert.throws(() => call('setV8AdminCredentials', 'attacker@example.test', '1111'), /Invalid admin credentials/);
assert.throws(() => call('setV8AdminCredentials', 'attacker@example.test', '1111', 'owner@example.test', '0000'), /Invalid admin credentials/);
assert.equal(sb.props.get('ADMIN_EMAIL'), 'owner@example.test');
assert.equal(call('adminLogin', 'owner@example.test', '4826'), true);
// The current admin can rotate the PIN, and the change is audited.
assert.equal(call('setV8AdminCredentials', 'owner@example.test', '7391', 'owner@example.test', '4826'), true);
assert.equal(call('adminLogin', 'owner@example.test', '4826'), false);
assert.equal(call('adminLogin', 'owner@example.test', '7391'), true);
assert.ok(call('rows_', 'Audit_Log').some(r => r.Action === 'ADMIN_CREDENTIALS_CHANGED'));
console.log(`PASS: ${files.length} Apps Script files load; admin credentials cannot be replaced anonymously; owner rotation works and is audited.`);
