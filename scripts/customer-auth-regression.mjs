import fs from 'node:fs';

let failures=0;
function ok(cond,msg){if(cond)console.log('✓ '+msg);else{console.error('✗ '+msg);failures++}}

const login=fs.readFileSync('b2c/login/index.html','utf8');
const backend=fs.readFileSync('src/ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ_V953_B2CCustomerAuth.gs','utf8');
const authTransport=(login.match(/function rpc\(method,args=\[\]\)\{[\s\S]*?\nasync function saveOpen/)||[])[0]||'';
const cataloguePrefetch=(login.match(/function prefetchCatalog\(\)\{[\s\S]*?\nasync function warmCatalogBeforeOpen/)||[])[0]||'';

ok(/form\.method='POST'/.test(authTransport)&&/form\.action=API\+'\?bridge=1'/.test(authTransport),'B2C registration uses the POST bridge');
ok(!!authTransport&&!/jsonp=1/.test(authTransport),'B2C registration does not send authentication through JSONP');
ok(/input\.name='payload'/.test(authTransport),'B2C registration sends RPC payload in POST body');
ok(/getCustomerPinStatusV107/.test(login)&&/customerLoginWithPinV107/.test(login)&&/setCustomerPinV107/.test(login),'B2C login UI calls the customer PIN APIs');
ok(!!cataloguePrefetch&&/method:'getAppConfig'/.test(cataloguePrefetch)&&/jsonp=1/.test(cataloguePrefetch),'Login JSONP is limited to the read-only public catalogue prefetch');
ok(!/getCustomerPinStatusV107|customerLoginV95|customerLoginWithPinV107|setCustomerPinV107/.test(cataloguePrefetch),'Customer authentication methods are never sent through the catalogue JSONP prefetch');

for(const fn of ['getCustomerPinStatusV107','customerLoginV95','customerLoginWithPinV107','setCustomerPinV107']){
  ok(new RegExp('function\\s+'+fn+'\\s*\\(').test(backend),fn+' is implemented');
}
ok(/hashV8_\(pin\)/.test(backend)&&/'PIN Hash'/.test(backend),'Customer PIN is stored as a hash');
ok(!/['"]PIN['"]\s*:/.test(backend),'Raw customer PIN is never written as a sheet field');
ok(/PIN is already set/.test(backend)&&/hashV8_\(oldPin\)/.test(backend),'Existing PIN cannot be silently overwritten');
ok(/'Customer ID':'CUST-'\+mobile/.test(backend)&&/'PIN Updated At':now/.test(backend),'First-time registration can create a minimal customer record with PIN metadata');
ok(/getB2CCustomerAuthHealthV953/.test(backend)&&/rawPinStored:false/.test(backend),'Customer auth health contract states raw PIN is not stored');
ok(/V953_PREVIOUS_DO_POST=doPost/.test(backend)&&/if\(auth\[method\]\)/.test(backend),'Customer auth methods are exposed through a narrow late POST bridge wrapper');

if(failures){console.error(`\n${failures} customer-auth regression check(s) failed.`);process.exit(1)}
console.log('\nAll B2C customer-auth regression checks passed.');
