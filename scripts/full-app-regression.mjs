import fs from 'node:fs';

function ok(value,message){
  if(!value)throw new Error(message);
  console.log('✓',message);
}
function read(path){return fs.readFileSync(path,'utf8')}
function inlineScripts(path){
  const html=read(path);
  return [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
}
function parseHtml(path){
  const scripts=inlineScripts(path);
  ok(scripts.length>0,`${path} contains inline JavaScript`);
  scripts.forEach((src,i)=>{new Function(src);ok(true,`${path} inline script ${i+1} parses`)});
}

const appHtml=[
  'src/Admin.html','src/AdminFixesV915.html','src/AdminAccessV917.html',
  'src/CumulativeDashboard.html','src/Customer360.html','src/PaymentVerification.html','shop/index.html',
  'src/VendorOnboardingV910.html','src/VendorOnboardingFixV918.html',
  'src/VendorApproval.html','src/VendorApprovalFixV916.html',
  'src/Sales.html','src/Picker.html','src/Barcode.html','src/Inventory.html',
  'src/Delivery.html','src/DeliveryFixV918.html','src/Driver.html','src/SharedUX.html',
  'src/AdminVendorPricingV946.html'
];
appHtml.forEach(parseHtml);

for(const path of ['b2b/runtime-guard-v918.js','b2b/production-fixes-v990.js','b2b/payment-upi-v916.js','b2b/session-v985.js']){
  new Function(read(path));
  ok(true,`${path} parses`);
}

const router=read('src/ZZZZZZZZZZZZZZZZZZZZZZZ_V912_FinalRoutes.gs');
new Function(router);
const requiredRoutes={
  admin:'Admin',customer360:'Customer360',dashboard:'CumulativeDashboard',payments:'PaymentVerification',sales:'Sales',picker:'Picker',
  barcode:'Barcode',inventory:'Inventory',vendor:'VendorOnboardingV910',approvals:'VendorApproval',
  driver:'Driver',delivery:'Delivery',b2b:'BusinessRedirect',b2c:'DirectRedirect'
};
for(const [route,page] of Object.entries(requiredRoutes))ok(router.includes(`'${route}':'${page}'`),`router maps ${route} → ${page}`);
ok(/VendorOnboardingFixV918/.test(router),'Vendor Onboarding V918 safety guard is attached');
ok(/DeliveryFixV918/.test(router),'B2C Delivery V918 safety guard is attached');
ok(/AdminVendorPricingV946/.test(router),'Admin Vendor Pricing editor is attached');

const shared=read('src/SharedUX.html');
ok(/script\.google\.com\/macros\/s\/AKfycbx2s0l5A8LAdD1j24395XJSTMd5cEU7QdUkTI8LarDzatF-vVw6ODfm5x7MVJUkP9aB\/exec/.test(shared),'shared launcher uses the production Apps Script URL');
ok(/nativeelaneeru\.github\.io\/native-elaneeru-app\/b2c\//.test(shared),'shared launcher sends Customer to the live B2C PWA');
ok(/nativeelaneeru\.github\.io\/native-elaneeru-app\/b2b\//.test(shared),'shared launcher sends B2B to the live B2B PWA');
ok(!/location\.href\.split\('\?'\)/.test(shared),'shared launcher does not build routes from iframe location');
ok(!/href=["']\?page=/.test(shared),'shared launcher has no iframe-relative page links');

const publicShop=read('shop/index.html');
ok(/getAppConfig/.test(publicShop),'Public Shop reads the live catalogue');
ok(/\.\.\/b2c\//.test(publicShop)&&/\.\.\/b2b\//.test(publicShop),'Public Shop routes orders to Direct and Business');
ok(!/placeOrder|saveOrder|submitOrder/.test(publicShop),'Public Shop cannot place production orders directly');

const customer360=read('src/Customer360.html');
ok(/searchCustomer360V947/.test(customer360)&&/getCustomer360ProfileV947/.test(customer360),'Customer 360 loads search and profile APIs');
const customer360Backend=read('src/ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ_V947_Customer360.gs');
new Function(customer360Backend);
ok(/v948RequireCustomer360_\(email,pin\)/.test(customer360Backend),'Customer 360 endpoints require Admin or selected-staff authentication');
ok(!/append_\(|updateObj_\(|deleteRow\(/.test(customer360Backend),'Customer 360 backend performs no production writes');
const customer360Access=read('src/ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ_V948_Customer360Access.gs');
new Function(customer360Access);
ok(/CUSTOMER_360/.test(customer360Access)&&/staffAppLoginV917_/.test(customer360Access),'Customer 360 supports explicitly selected staff');
ok(/v948RequireCustomer360_/.test(customer360Backend),'Customer 360 data endpoints enforce private access');

const payments=read('src/PaymentVerification.html');
ok(!/href=["']\?page=/.test(payments),'UPI Verification has no iframe-relative navigation');
ok(/Array\.isArray\(DATA&&DATA\.rows\)/.test(payments),'UPI Verification guards null payment rows');

const admin=read('src/Admin.html');
const adminFix=read('src/AdminFixesV915.html');
const adminRuntime=admin+'\n'+adminFix;
ok(/normaliseAdminData|normaliseDashboard/.test(adminRuntime),'Operations Admin normalises dashboard data');
ok(/!Array\.isArray\(o\.items\)/.test(adminRuntime),'Operations Admin guards nested order items');
ok(/['"]feedback['"]/.test(adminRuntime)&&/Array\.isArray\(d\[k\]\)/.test(adminRuntime),'Operations Admin guards feedback and other list responses');

const productAdmin=read('src/ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ_V928_ProductAdmin.gs');
ok(/NEL_PUBLIC_CATALOG_V908/.test(productAdmin)&&/NEL_B2C_APP_CONFIG_V837/.test(productAdmin)&&/V905:B2C_PRODUCTS/.test(productAdmin),'Product Admin invalidates catalogue and checkout price caches');

const vendorPricingAdmin=read('src/ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ_V946_VendorPricingAdmin.gs');
new Function(vendorPricingAdmin);
ok(/requireAdmin_\(email,pin\)/.test(vendorPricingAdmin),'Vendor Pricing editor requires Admin authentication');
ok(/B2B Default Price/.test(vendorPricingAdmin)&&/Agreed Price/.test(vendorPricingAdmin),'Vendor Pricing editor shows default and agreed B2B prices');
ok(/price<=0/.test(vendorPricingAdmin)&&/moq<1\|\|step<1/.test(vendorPricingAdmin),'Vendor Pricing editor validates price, MOQ and quantity step');

const access=read('src/AdminAccessV917.html');
ok(/d&&Array\.isArray\(d\.rows\)/.test(access),'Access Management guards null staff responses');
ok(!/href=["']\?page=vendor/.test(access),'Access Management uses safe Vendor Onboarding navigation');

const vendorFix=read('src/VendorOnboardingFixV918.html');
ok(/SALES=raw;PRODUCTS=Array\.isArray\(raw\.products\)/.test(vendorFix),'Vendor Onboarding guards Sales profile/product responses');
ok(/raw\.success===false\|\|!raw\.onboardingId/.test(vendorFix),'Vendor Onboarding validates successful persistence before showing success');
ok(/nel_vendor_onboarding_session_v949/.test(vendorFix)&&/resumeVendorOnboardingSessionV949/.test(vendorFix),'Vendor Onboarding restores its saved staff session');
ok(/createVendorOnboardingSessionV949/.test(vendorFix)&&/submitVendorOnboardingSessionV949/.test(vendorFix),'Vendor Onboarding uses token-based login and submit');
ok(!/localStorage\.setItem\([^,]+,\s*pin\b/i.test(vendorFix),'Vendor Onboarding never stores the staff PIN in localStorage');
ok(/const section=q\('s3'\),grid=section&&section\.querySelector\('\.grid'\)/.test(vendorFix),'Vendor B2B PIN is injected into the Commercials step');

const vendorSession=read('src/ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ_V949_VendorOnboardingSession.gs');
new Function(vendorSession);
ok(/createVendorOnboardingSessionV949/.test(vendorSession)&&/resumeVendorOnboardingSessionV949/.test(vendorSession)&&/logoutVendorOnboardingSessionV949/.test(vendorSession),'Vendor Onboarding backend supports create, resume and logout sessions');
ok(/PropertiesService\.getScriptProperties/.test(vendorSession)&&/V949_VENDOR_SESSION_TTL_MS=30\*24\*60\*60\*1000/.test(vendorSession),'Vendor Onboarding session is persisted server-side for 30 days');
ok(/JSON\.stringify\(\{\s*staffId:u\.staffId,accessFingerprint:v949StaffAccessFingerprint_\(row\),createdAt:Date\.now\(\),expiresAt:expiresAt\s*\}\)/.test(vendorSession),'Vendor Onboarding server session stores staff identity and one-way access fingerprint, not the PIN');
ok(/active_\(r\.Status\)/.test(vendorSession)&&/v917AppsForRow_\(row\)/.test(vendorSession),'Vendor Onboarding rechecks active status and app permission on every session use');
ok(/rec\.accessFingerprint!==fingerprint/.test(vendorSession)&&/revokesOnPinReset:true/.test(vendorSession),'Vendor Onboarding invalidates remembered sessions after credential changes');
ok(/serverStoresPin:false/.test(vendorSession)&&/pinStoredInBrowser:false/.test(vendorSession),'Vendor Onboarding session health contract confirms no PIN persistence');
const publicRead=read('src/ZZZZZ_V838_PublicCatalog.gs');
ok(/getVendorOnboardingSessionHealthV949:getVendorOnboardingSessionHealthV949/.test(publicRead),'Vendor Onboarding exposes only a read-only session health contract');

const approvalFix=read('src/VendorApprovalFixV916.html');
ok(/LIST=Array\.isArray\(raw\)\?raw:\[\]/.test(approvalFix),'Vendor Approvals guards null pending-vendor responses');
ok(/ok!==true/.test(approvalFix),'Vendor Approvals requires a successful Admin login result');

const picker=read('src/Picker.html');
ok(!/Demo picker|9000000005|2222/.test(picker),'Picker UI exposes no legacy demo credentials');
ok(/Array\.isArray\(d\.tasks\)/.test(picker),'Picker guards null task responses');

const sales=read('src/Sales.html');
ok(/Array\.isArray\(d\.daily\)/.test(sales)&&/Array\.isArray\(d\.areas\)/.test(sales),'Sales dashboard guards null trend/area data');

const inventory=read('src/Inventory.html');
ok(/Array\.isArray\(d\.products\)/.test(inventory)&&/Array\.isArray\(d\.movements\)/.test(inventory),'Inventory guards null product/movement data');

const barcode=read('src/Barcode.html');
ok(/Array\.isArray\(d\.products\)/.test(barcode)&&/Array\.isArray\(d\.batches\)/.test(barcode),'Barcode console guards null product/batch data');

const deliveryFix=read('src/DeliveryFixV918.html');
ok(/d\.stops=Array\.isArray\(d\.stops\)\?d\.stops:\[\]/.test(deliveryFix),'B2C Delivery guards null route-stop data');
ok(/r\.success!==true/.test(deliveryFix),'B2C Delivery validates login result');

const driver=read('src/Driver.html');
ok(/function localDate\(/.test(driver),'B2B Driver uses local calendar date');
ok(/d\.stops=Array\.isArray\(d\.stops\)\?d\.stops:\[\]/.test(driver),'B2B Driver guards null route-stop data');

const b2bConfig=read('b2b/config.js');
ok(/runtime-guard-v918\.js/.test(b2bConfig),'B2B production config loads the V918 runtime guard');
ok(/session-v985\.js/.test(b2bConfig),'B2B production config loads persistent fast-session support');
const b2bGuard=read('b2b/runtime-guard-v918.js');
ok(/d\.products=Array\.isArray\(d\.products\)/.test(b2bGuard)&&/d\.orders=Array\.isArray\(d\.orders\)/.test(b2bGuard),'B2B runtime guard normalises product/order lists');
ok(/!Array\.isArray\(o\.items\)/.test(b2bGuard),'B2B runtime guard normalises nested order items');
const b2bSession=read('b2b/session-v985.js');
const b2bWorker=read('b2b/sw.js');
ok(/NEL_B2B_DB\.get\('sessionToken'\)/.test(b2bSession),'B2B restores the partner session from IndexedDB');
ok(/nel_b2b_data_cache/.test(b2bSession)&&/renderCached/.test(b2bSession),'B2B renders cached dashboard data before live refresh');
ok(/function clearSaved\(/.test(b2bSession)&&/localStorage\.removeItem\('nel_b2b_token'\)/.test(b2bSession),'B2B explicit logout clears the persistent session');
ok(/staleWhileRevalidate\(request,'\.\/index\.html'\)/.test(b2bWorker),'B2B repeat launches use cached navigation immediately');

const security=read('src/ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ_V918_ProductionSecurity.gs');
new Function(security);
ok(/9000000005/.test(security)&&/9000000006/.test(security),'legacy demo staff identities are explicitly blocked');
ok(/setupDemoAccessV81=function\(\)/.test(security),'demo access creation is disabled in production');
ok(/Legacy demo access is disabled/.test(security),'legacy demo logins are rejected at authentication');

const directApp=read('b2c/index.html');
const directLogin=read('b2c/login/index.html');
const directWorker=read('b2c/sw.js');
ok(/function persistentSessionMobile\(/.test(directApp)&&/nel_profile_v9','nel_b2c_profile/.test(directApp),'B2C restores login from persistent customer profiles');
ok(/NEL_DB\.getKV\('mobile'\)/.test(directApp),'B2C restores login from IndexedDB before redirecting');
ok(/nel_profile_v9','nel_b2c_profile/.test(directLogin),'B2C login recognises an existing remembered profile');
ok(/staleWhileRevalidate\(request,navigationFallback\(url\)\)/.test(directWorker),'B2C repeat launches use cached navigation immediately');
ok(/staleWhileRevalidate\(request\)/.test(directWorker),'B2C cached runtime assets refresh in the background');

console.log('Full Native Elaneeru app regression audit passed.');
