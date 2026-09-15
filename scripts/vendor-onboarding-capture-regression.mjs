import fs from 'node:fs';
import vm from 'node:vm';

const server=fs.readFileSync('src/ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ_V952_VendorOnboardingCapture.gs','utf8');
const ui=fs.readFileSync('src/VendorOnboardingCaptureV952.html','utf8');
const route=fs.readFileSync('src/ZZZZZZZZZZZZZZZZZZZZZZZ_V912_FinalRoutes.gs','utf8');
const session=fs.readFileSync('src/ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ_V949_VendorOnboardingSession.gs','utf8');
const activation=fs.readFileSync('src/ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ_V935_InstantVendorActivation.gs','utf8');

function ok(cond,msg){if(!cond){console.error('FAIL:',msg);process.exitCode=1}else console.log('PASS:',msg)}
function parseJs(name,src){try{new vm.Script(src,{filename:name});ok(true,name+' parses')}catch(e){console.error('FAIL:',name+' parse:',e.message);process.exitCode=1}}

parseJs('V952 server',server);
parseJs('V952 UI',ui.replace(/^<script>\s*/,'').replace(/\s*<\/script>\s*$/,''));

ok(/V952_BASE_VENDOR_ONBOARDING_SESSION_SUBMIT=submitVendorOnboardingSessionV949/.test(server),'V952 wraps secure persistent-session submit');
ok(/V952_BASE_ACTIVATE_VENDOR_ONBOARDING=activateVendorOnboardingV935_/.test(server),'V952 wraps instant activation without replacing its core workflow');
ok(/Product Name/.test(server)&&/v952EnsureVendorOnboardingCaptureHeaders_/.test(server),'Product Name is retained in Vendor_Onboarding');
ok(/Full address is required/.test(server),'server requires full address');
ok(/6 digit pincode/.test(server),'server requires valid pincode');
ok(/GPS location/.test(server),'server requires GPS capture');
ok(/Current buying price is required/.test(server),'server requires current buying price');
ok(/Preferred delivery time is required/.test(server),'server requires preferred delivery time');
ok(/Planned start date is required/.test(server),'server requires planned start date');
ok(/Customer Photo URL/.test(server)&&/Shop Photo URL/.test(server),'activation repairs both vendor photo URLs');
ok(/Target Qty/.test(server)&&/Target Reward/.test(server)&&/Reward Text/.test(server),'activation writes target quantity and reward back to onboarding');
ok(/createsTestVendor:false/.test(server),'health contract documents no test-vendor creation');

ok(/pincode/.test(ui)&&/address/.test(ui)&&/current/.test(ui),'UI requires location and buying-price context');
ok(/Capture the vendor GPS location before continuing/.test(ui),'UI blocks progression without GPS');
ok(/ptime/.test(ui)&&/Planned start date is required/.test(ui),'UI requires preferred time and planned start');
ok(/Current buying price/.test(ui)&&/GPS/.test(ui),'review screen surfaces additional captured fields');
ok(/VendorOnboardingCaptureV952/.test(route),'production Vendor Onboarding route loads V952 capture guard');

ok(/submitVendorOnboardingSessionV949/.test(session)&&/initialB2BPin/.test(session),'existing persistent-session and vendor PIN flow remain intact');
ok(/append_\(V8\.SHEETS\.B2B_TARGETS/.test(activation),'existing instant activation still creates B2B target');

if(process.exitCode)process.exit(process.exitCode);
console.log('Vendor Onboarding capture regression checks passed.');
