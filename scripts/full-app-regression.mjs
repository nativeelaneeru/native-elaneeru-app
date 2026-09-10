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
  'src/CumulativeDashboard.html','src/PaymentVerification.html',
  'src/VendorOnboardingV910.html','src/VendorOnboardingFixV918.html',
  'src/VendorApproval.html','src/VendorApprovalFixV916.html',
  'src/Sales.html','src/Picker.html','src/Barcode.html','src/Inventory.html',
  'src/Delivery.html','src/DeliveryFixV918.html','src/Driver.html','src/SharedUX.html'
];
appHtml.forEach(parseHtml);

for(const path of ['b2b/runtime-guard-v918.js','b2b/production-fixes-v990.js','b2b/payment-upi-v916.js']){
  new Function(read(path));
  ok(true,`${path} parses`);
}

const router=read('src/ZZZZZZZZZZZZZZZZZZZZZZZ_V912_FinalRoutes.gs');
new Function(router);
const requiredRoutes={
  admin:'Admin',dashboard:'CumulativeDashboard',payments:'PaymentVerification',sales:'Sales',picker:'Picker',
  barcode:'Barcode',inventory:'Inventory',vendor:'VendorOnboardingV910',approvals:'VendorApproval',
  driver:'Driver',delivery:'Delivery',b2b:'B2B'
};
for(const [route,page] of Object.entries(requiredRoutes))ok(router.includes(`'${route}':'${page}'`),`router maps ${route} → ${page}`);
ok(/VendorOnboardingFixV918/.test(router),'Vendor Onboarding V918 safety guard is attached');
ok(/DeliveryFixV918/.test(router),'B2C Delivery V918 safety guard is attached');

const shared=read('src/SharedUX.html');
ok(/script\.google\.com\/macros\/s\/AKfycbx2s0l5A8LAdD1j24395XJSTMd5cEU7QdUkTI8LarDzatF-vVw6ODfm5x7MVJUkP9aB\/exec/.test(shared),'shared launcher uses the production Apps Script URL');
ok(/nativeelaneeru\.github\.io\/native-elaneeru-app\/b2c\//.test(shared),'shared launcher sends Customer to the live B2C PWA');
ok(/nativeelaneeru\.github\.io\/native-elaneeru-app\/b2b\//.test(shared),'shared launcher sends B2B to the live B2B PWA');
ok(!/location\.href\.split\('\?'\)/.test(shared),'shared launcher does not build routes from iframe location');
ok(!/href=["']\?page=/.test(shared),'shared launcher has no iframe-relative page links');

const payments=read('src/PaymentVerification.html');
ok(!/href=["']\?page=/.test(payments),'UPI Verification has no iframe-relative navigation');
ok(/Array\.isArray\(DATA&&DATA\.rows\)/.test(payments),'UPI Verification guards null payment rows');

const admin=read('src/Admin.html');
const adminFix=read('src/AdminFixesV915.html');
const adminRuntime=admin+'\n'+adminFix;
ok(/normaliseAdminData|normaliseDashboard/.test(adminRuntime),'Operations Admin normalises dashboard data');
ok(/!Array\.isArray\(o\.items\)/.test(adminRuntime),'Operations Admin guards nested order items');
ok(/['"]feedback['"]/.test(adminRuntime)&&/Array\.isArray\(d\[k\]\)/.test(adminRuntime),'Operations Admin guards feedback and other list responses');

const access=read('src/AdminAccessV917.html');
ok(/d&&Array\.isArray\(d\.rows\)/.test(access),'Access Management guards null staff responses');
ok(!/href=["']\?page=vendor/.test(access),'Access Management uses safe Vendor Onboarding navigation');

const vendorFix=read('src/VendorOnboardingFixV918.html');
ok(/SALES=raw;PRODUCTS=Array\.isArray\(raw\.products\)/.test(vendorFix),'Vendor Onboarding guards Sales profile/product responses');
ok(/raw\.success===false\|\|!raw\.onboardingId/.test(vendorFix),'Vendor Onboarding validates successful persistence before showing success');

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
const b2bGuard=read('b2b/runtime-guard-v918.js');
ok(/d\.products=Array\.isArray\(d\.products\)/.test(b2bGuard)&&/d\.orders=Array\.isArray\(d\.orders\)/.test(b2bGuard),'B2B runtime guard normalises product/order lists');
ok(/!Array\.isArray\(o\.items\)/.test(b2bGuard),'B2B runtime guard normalises nested order items');

const security=read('src/ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ_V918_ProductionSecurity.gs');
new Function(security);
ok(/9000000005/.test(security)&&/9000000006/.test(security),'legacy demo staff identities are explicitly blocked');
ok(/setupDemoAccessV81=function\(\)/.test(security),'demo access creation is disabled in production');
ok(/Legacy demo access is disabled/.test(security),'legacy demo logins are rejected at authentication');

console.log('Full Native Elaneeru app regression audit passed.');
