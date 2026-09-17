import fs from 'node:fs';

function ok(value,message){if(!value)throw new Error(message);console.log('✓',message)}

const backendPath='src/ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ_V961_Serviceability.gs';
const populationFixPath='src/ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ_V962_ServiceabilityPopulationFix.gs';
const backend=fs.readFileSync(backendPath,'utf8');
const populationFix=fs.readFileSync(populationFixPath,'utf8');
const admin=fs.readFileSync('src/AdminServiceabilityV961.html','utf8');
const populationAdmin=fs.readFileSync('src/AdminServiceabilityPopulationV962.html','utf8');
const routes=fs.readFileSync('src/ZZZZZZZZZZZZZZZZZZZZZZZ_V912_FinalRoutes.gs','utf8');
const nav=fs.readFileSync('src/AdminNavigationV957.html','utf8');

const adminScript=(admin.match(/<script>([\s\S]*?)<\/script>/i)||[])[1]||'';
const populationAdminScript=(populationAdmin.match(/<script>([\s\S]*?)<\/script>/i)||[])[1]||'';
new Function(adminScript);
new Function(populationAdminScript);
ok(true,'Admin serviceability UI JavaScript parses');
ok(/AdminServiceabilityV961/.test(routes)&&/AdminServiceabilityPopulationV962/.test(routes),'Admin route appends serviceability and unified population modules');
ok(/serviceability/.test(nav),'Admin navigation knows the serviceability panel');
ok(/V961_GRID_KM\s*=\s*1\.5/.test(backend),'Service grid is fixed at 1.5 km squares');
ok(/V961_B2C_RADIUS_KM\s*=\s*3/.test(backend),'B2C launch radius is 3 km');
ok(/V961_B2B_RADIUS_KM\s*=\s*20/.test(backend),'B2B operating radius is 20 km');
ok(/rows_\(V8\.SHEETS\.CUSTOMERS\)/.test(backend),'Existing Customers master populates B2C serviceability');
ok(/rows_\(V8\.SHEETS\.B2B_VENDORS\)/.test(populationFix),'Approved B2B Vendors master also populates serviceability');
ok(/V8\.SHEETS\.VENDOR_ONBOARD/.test(populationFix)&&/pendingOnboarding/.test(populationFix),'Pending B2B onboarding is sourced separately without double-counting approved vendors');
ok(/mapPopulation=approved\.concat\(pending\)/.test(populationFix)&&/base\.customers=mapPopulation/.test(populationFix),'Pending/manual B2B leads with GPS are included in Admin map population');
ok(/pendingExcludedFromApprovedCounts:true/.test(populationFix),'Pending/manual leads do not inflate approved customer metrics');
ok(/partyType='B2C'|partyType:'B2C'/.test(populationFix)&&/partyType:'B2B'/.test(populationFix)&&/partyType:'B2B_PENDING'/.test(populationFix),'Serviceability records identify B2C, approved B2B and pending B2B types');
ok(/customersNeedLocation/.test(backend)&&/missingGpsRetained:true/.test(populationFix),'Customers missing GPS remain visible for correction');
ok(/getServiceabilityAdminV961=getServiceabilityAdminV962_/.test(populationFix),'V9.6.5 safely owns the Admin population endpoint');
ok(/B2C Customers \+ approved B2B Vendors/.test(populationAdmin),'Admin explains the approved customer population source');
ok(/pending\/manual B2B lead/i.test(populationAdmin)&&/B2B LEAD/.test(populationAdmin),'Admin clearly labels pending/manual vendor leads');
ok(/AUTO_REFRESH_MS962=30000/.test(populationAdmin)&&/setInterval/.test(populationAdmin),'Service Areas auto-refreshes live Sheet data every 30 seconds while open');
ok(/visibilitychange/.test(populationAdmin)&&/addEventListener\('focus'/.test(populationAdmin),'Service Areas refreshes when Admin returns to the browser tab/window');
ok(/Live Sheet sync/.test(populationAdmin),'Admin shows last live Sheet sync status');
ok(/Expected DRR/.test(populationAdmin)&&/partyType/.test(populationAdmin),'Unified table labels channel and B2B expected daily quantity');
ok(/updateServiceGridStatusV961/.test(backend),'Admin can independently update grid service status');
ok(/Apartment_Service_Overrides/.test(backend)&&/saveApartmentServiceOverrideV961/.test(backend),'Apartment subscription exceptions require an Admin-managed override');
ok(/Subscription Only/.test(backend)&&/APARTMENT_APPROVED/.test(backend),'Apartment exceptions remain subscription-only and distinct from normal grid opening');
ok(/checkServiceabilityV961/.test(backend),'Read-only future app serviceability API exists');
ok(!/checkDeliveryLocation\s*=/.test(backend)&&!/saveOrder\s*=/.test(backend),'Admin map module does not replace live B2C checkout yet');
ok(/Current Onboarded Customers/.test(admin),'Admin exposes the current onboarded customer view');
ok(/OPEN/.test(admin)&&/COMING_SOON/.test(admin)&&/PAUSED/.test(admin)&&/CLOSED/.test(admin),'Admin exposes open / coming-soon / paused / closed grid states');

console.log('Serviceability regression checks passed.');
