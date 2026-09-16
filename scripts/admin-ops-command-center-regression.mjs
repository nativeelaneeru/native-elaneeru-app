import fs from 'node:fs';

let failed=0;
function ok(cond,msg){if(cond)console.log('✓ '+msg);else{console.error('✗ '+msg);failed++;}}
const backend=fs.readFileSync('src/ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ_V964_AdminOpsCommandCenter.gs','utf8');
const ui=fs.readFileSync('src/AdminOpsCommandCenterV964.html','utf8');
const nav=fs.readFileSync('src/AdminNavigationV957.html','utf8');
const routes=fs.readFileSync('src/ZZZZZZZZZZZZZZZZZZZZZZZ_V912_FinalRoutes.gs','utf8');

new Function(backend);
for(const match of ui.matchAll(/<script>([\s\S]*?)<\/script>/g)) new Function(match[1]);

ok(/function getAdminOpsCommandCenterV964\(email,pin\)/.test(backend),'Command Center backend exists');
ok(/requireAdmin_\(email,pin\)/.test(backend),'Command Center requires Admin authentication');
ok(/vendorFunnel/.test(backend)&&/market/.test(backend)&&/products/.test(backend)&&/blockers/.test(backend),'Command Center covers vendor, market, product and blocker views');
ok(/Karnataka/.test(backend)&&/Tamil Nadu/.test(backend),'Market freshness covers Karnataka and Tamil Nadu');
ok(/invalidStatus/.test(backend)&&/missingGps/.test(backend)&&/legacyTerminology/.test(backend),'Vendor data-quality checks are included');
ok(!/(append_|updateObj_|setValue\(|setValues\(|deleteRow\(|insertRow|clearContent\(|clear\()/.test(backend),'Command Center backend remains read-only');
ok(/Command Center/.test(ui)&&/Operations Command Center/.test(ui),'Admin UI exposes the Command Center');
ok(/B2C Orders Waiting/.test(ui)&&/B2B Orders Waiting/.test(ui)&&/Picker Queue/.test(ui),'Admin UI surfaces operational queues');
ok(/Market price freshness/.test(ui)&&/Wholesale mandi reference only/.test(ui),'Admin UI clearly separates mandi reference from selling prices');
ok(/Vendor acquisition funnel/.test(ui)&&/Vendor onboarding data quality/.test(ui),'Admin UI includes acquisition funnel and data-quality visibility');
ok(/opscenter/.test(nav),'Central Admin navigation knows the Command Center panel');
ok(/AdminOpsCommandCenterV964/.test(routes),'Admin production route loads the Command Center partial');
ok(routes.indexOf('AdminOpsCommandCenterV964')<routes.indexOf('AdminNavigationV957'),'Command Center loads before centralized navigation');

if(failed){console.error(`Admin Command Center regression failed: ${failed}`);process.exit(1)}
console.log('Admin Operations Command Center regression passed.');
