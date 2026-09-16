import fs from 'node:fs';

function ok(value,message){if(!value)throw new Error(message);console.log('✓',message)}

const backendPath='src/ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ_V961_Serviceability.gs';
const backend=fs.readFileSync(backendPath,'utf8');
const admin=fs.readFileSync('src/AdminServiceabilityV961.html','utf8');
const routes=fs.readFileSync('src/ZZZZZZZZZZZZZZZZZZZZZZZ_V912_FinalRoutes.gs','utf8');
const nav=fs.readFileSync('src/AdminNavigationV957.html','utf8');

const adminScript=(admin.match(/<script>([\s\S]*?)<\/script>/i)||[])[1]||'';
new Function(adminScript);
ok(true,'Admin serviceability UI JavaScript parses');
ok(/AdminServiceabilityV961/.test(routes),'Admin route appends the serviceability module');
ok(/serviceability/.test(nav),'Admin navigation knows the serviceability panel');
ok(/V961_GRID_KM\s*=\s*1\.5/.test(backend),'Service grid is fixed at 1.5 km squares');
ok(/V961_B2C_RADIUS_KM\s*=\s*3/.test(backend),'B2C launch radius is 3 km');
ok(/V961_B2B_RADIUS_KM\s*=\s*20/.test(backend),'B2B operating radius is 20 km');
ok(/rows_\(V8\.SHEETS\.CUSTOMERS\)/.test(backend),'Existing Customers master populates the Admin serviceability view');
ok(/customersNeedLocation/.test(backend),'Customers missing GPS remain visible for correction');
ok(/updateServiceGridStatusV961/.test(backend),'Admin can independently update grid service status');
ok(/Apartment_Service_Overrides/.test(backend)&&/saveApartmentServiceOverrideV961/.test(backend),'Apartment subscription exceptions require an Admin-managed override');
ok(/Subscription Only/.test(backend)&&/APARTMENT_APPROVED/.test(backend),'Apartment exceptions remain subscription-only and distinct from normal grid opening');
ok(/checkServiceabilityV961/.test(backend),'Read-only future app serviceability API exists');
ok(!/checkDeliveryLocation\s*=/.test(backend)&&!/saveOrder\s*=/.test(backend),'Admin map module does not replace live B2C checkout yet');
ok(/Current Onboarded Customers/.test(admin)&&/Customers sheet/.test(admin),'Admin clearly identifies the current onboarded customer source');
ok(/OPEN/.test(admin)&&/COMING_SOON/.test(admin)&&/PAUSED/.test(admin)&&/CLOSED/.test(admin),'Admin exposes open / coming-soon / paused / closed grid states');

console.log('Serviceability regression checks passed.');
