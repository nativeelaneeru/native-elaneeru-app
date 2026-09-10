import fs from 'node:fs';
import vm from 'node:vm';

function ok(value,message){if(!value)throw new Error(message);console.log('✓',message)}

for(const file of ['b2c/cart-visibility-v10320.js','b2c/customer-growth-v10330.js','b2c/referral-reward-v10340.js','b2b/production-fixes-v990.js','b2b/payment-upi-v916.js']){
  const source=fs.readFileSync(file,'utf8');
  new Function(source);
  ok(true,`${file} parses`);
}

class Classes{
  constructor(...names){this.s=new Set(names)}
  contains(n){return this.s.has(n)}
  add(n){this.s.add(n)}
  remove(n){this.s.delete(n)}
  toggle(n,force){
    if(force===true){this.s.add(n);return true}
    if(force===false){this.s.delete(n);return false}
    if(this.s.has(n)){this.s.delete(n);return false}
    this.s.add(n);return true
  }
}
function elem(hidden=false){return {classList:new Classes(...(hidden?['hide']:[])),parentNode:null}}
const elements={
  homePage:elem(false),shopPage:elem(true),ordersPage:elem(true),accountPage:elem(true),offersPage:elem(true),
  cartBar:elem(false),cartSheet:elem(false)
};
const document={
  readyState:'complete',hidden:false,
  getElementById:id=>elements[id]||null,
  addEventListener:()=>{}
};
const context={
  console,document,
  S:{cart:{TC:{qty:1}}},
  cartLines:()=>[{productId:'TC',qty:1}],
  setTimeout:fn=>{fn();return 0},
  setInterval:()=>0,
  clearInterval:()=>{},
  addEventListener:()=>{},
  go(page){
    for(const name of ['home','shop','orders','account','offers'])elements[name+'Page'].classList.toggle('hide',name!==page);
  },
  updateCartBar(){elements.cartBar.classList.toggle('show',Object.keys(context.S.cart).length>0)},
  openCart(){elements.cartSheet.classList.add('show')},
  closeSheet(){elements.cartSheet.classList.remove('show')}
};
context.window=context;
vm.createContext(context);
vm.runInContext(fs.readFileSync('b2c/cart-visibility-v10320.js','utf8'),context,{filename:'cart-visibility-v10320.js'});

context.updateCartBar();
ok(elements.cartBar.classList.contains('show'),'B2C cart bar shows on Home when cart has items');
context.go('orders');
ok(!elements.cartBar.classList.contains('show'),'B2C cart bar hides on Orders');
context.go('account');
ok(!elements.cartBar.classList.contains('show'),'B2C cart bar hides on Account');
context.go('shop');
ok(elements.cartBar.classList.contains('show'),'B2C cart bar returns on Shop');
context.openCart();
ok(!elements.cartBar.classList.contains('show'),'B2C cart bar hides while cart sheet is open');
context.closeSheet();
ok(elements.cartBar.classList.contains('show'),'B2C cart bar returns after closing cart sheet on Shop');

const growth=fs.readFileSync('b2c/customer-growth-v10330.js','utf8');
ok(/saveB2CSubscriptionV910/.test(growth),'B2C subscription UI is wired to subscription backend');
ok(/registerB2CReferralV910/.test(growth),'B2C Refer & Earn UI is wired to referral backend');
ok(!/saveOrder\s*\(/.test(growth)&&!/placeOrder\s*\(/.test(growth),'B2C growth module cannot place a production order');

const rewardUi=fs.readFileSync('b2c/referral-reward-v10340.js','utf8');
ok(/2 FREE Tender Coconuts/.test(rewardUi),'B2C referral UI states the approved 2-free-coconut reward');
ok(/first delivered order/i.test(rewardUi),'B2C referral UI states the delivered-order qualification rule');
ok(!/saveOrder\s*\(/.test(rewardUi)&&!/placeOrder\s*\(/.test(rewardUi),'B2C referral reward UI cannot place a production order');

const rewardBackend=fs.readFileSync('src/ZZZZZZZZZZZZZZZZZZZZZZ_V911_ReferralRewards.gs','utf8');
ok(/V911_REFERRER_FREE_QTY\s*=\s*2/.test(rewardBackend),'Referral backend grants exactly 2 free coconuts to the referrer');
ok(/V911_REFERRED_FREE_QTY\s*=\s*0/.test(rewardBackend),'Referral backend grants no separate reward to the referred customer');
ok(/FIRST_DELIVERED_ORDER/.test(rewardBackend),'Referral backend qualifies only on the first delivered-order rule');
ok(/getB2CCustomerGrowthV910\s*=\s*getB2CCustomerGrowthV911_/.test(rewardBackend),'Referral reward rule owns the existing customer-growth API');
ok(/registerB2CReferralV910\s*=\s*registerB2CReferralV911_/.test(rewardBackend),'Referral registration uses the protected new-customer rule');
ok(!/saveOrder\s*=/.test(rewardBackend),'Referral backend does not override production checkout');

const config=fs.readFileSync('b2c/config.js','utf8');
ok(/referral-reward-v10340\.js/.test(config),'B2C production config loads the 2-coconut referral reward UI');

const b2b=fs.readFileSync('b2b/production-fixes-v990.js','utf8');
ok(/Need B2B access\?/.test(b2b),'B2B login explains vendor approval/PIN access');
ok(/removeRetailSwitch/.test(b2b),'B2B keeps retail/customer navigation separate');

const b2bConfig=fs.readFileSync('b2b/config.js','utf8');
const b2bPaymentUi=fs.readFileSync('b2b/payment-upi-v916.js','utf8');
const b2bPaymentBackend=fs.readFileSync('src/ZZZZZZZZZZZZZZZZZZZZZZZZZZ_V916_B2BPayments.gs','utf8');
ok(/payment-upi-v916\.js/.test(b2bConfig),'B2B production config loads the UPI payment overlay');
ok(/prepareB2BUpiPaymentV916/.test(b2bPaymentUi)&&/submitB2BUpiOrderV916/.test(b2bPaymentUi),'B2B UPI UI uses payment-intent then UTR submission');
ok(/Verification Pending/i.test(b2bPaymentUi),'B2B UPI UI clearly states manual verification status');
ok(/paymentStatus/.test(b2bPaymentUi)&&/UPI Payment/.test(b2bPaymentUi),'B2B order history shows UPI payment verification status');
ok(/paymentIntentBeforeOrder:true/.test(b2bPaymentBackend)&&/autoMarkPaid:false/.test(b2bPaymentBackend),'B2B UPI backend creates payment intent before order and never auto-marks paid');
ok(/v916B2BQuote_/.test(b2bPaymentBackend)&&/b2bProducts_\(vid\)/.test(b2bPaymentBackend),'B2B UPI amount uses server-side negotiated pricing');
ok(/v913PaymentSheet_\(ss\)/.test(b2bPaymentBackend)&&/Channel:'B2B'/.test(b2bPaymentBackend),'B2B UPI uses the central Payment_Ledger');
ok(/findExistingB2BRequestV904_/.test(b2bPaymentBackend),'B2B UPI order creation reuses duplicate-request protection');
ok(/v916UtrAlreadyUsed_/.test(b2bPaymentBackend)&&/duplicateUtrProtected:true/.test(b2bPaymentBackend),'B2B UPI rejects duplicate UTR reuse');
ok(/V916_PREVIOUS_ROUTE_CANDIDATES_/.test(b2bPaymentBackend)&&/status==='PAID'/.test(b2bPaymentBackend)&&/fulfillmentRequiresPaidUpi:true/.test(b2bPaymentBackend),'B2B routing excludes UPI orders until payment is verified PAID');
ok(!/updateObj_\(V8\.SHEETS\.B2B_VENDORS/.test(b2bPaymentBackend),'B2B UPI does not increase vendor credit outstanding');

const approvalFix=fs.readFileSync('src/VendorApprovalFixV916.html','utf8');
const approvalScript=(approvalFix.match(/<script>([\s\S]*?)<\/script>/i)||[])[1]||'';
new Function(approvalScript);
ok(/ok!==true/.test(approvalFix)&&/Invalid admin credentials/.test(approvalFix),'Vendor approval login rejects adminLogin=false');
ok(/2 FREE Tender Coconuts/.test(approvalFix)&&/first delivered order/i.test(approvalFix),'Vendor approval console shows the approved referral rule instead of rupee rewards');

const onboardingBackend=fs.readFileSync('src/ZZZZZZZZ_V840_VendorApproval.gs','utf8');
ok(/\['COD','UPI','CREDIT'\]/.test(onboardingBackend),'Vendor onboarding validates COD, UPI and CREDIT commercial terms');
ok(/VENDOR_ONBOARDING_PHOTO_FOLDER_ID/.test(onboardingBackend),'Vendor onboarding uses the configured photo folder');
ok(/already active as B2B vendor/.test(onboardingBackend)&&/already pending/.test(onboardingBackend),'Vendor onboarding protects against duplicate active and pending mobiles');

const paymentAdmin=fs.readFileSync('src/PaymentVerification.html','utf8');
const paymentAdminScript=(paymentAdmin.match(/<script>([\s\S]*?)<\/script>/i)||[])[1]||'';
new Function(paymentAdminScript);
ok(/getUpiPaymentsAdminV916/.test(paymentAdmin)&&/verifyB2BUpiPaymentV916/.test(paymentAdmin)&&/verifyB2CUpiPaymentV913/.test(paymentAdmin),'Central Admin UPI review supports both B2C and B2B');
ok(/confirm the UTR and amount/i.test(paymentAdmin),'Admin UPI review requires an explicit bank-check reminder');
const paymentAdminBackend=fs.readFileSync('src/ZZZZZZZZZZZZZZZZZZZZZZZZZZZ_V916_PaymentAdmin.gs','utf8');
ok(/getUpiPaymentsAdminV916/.test(paymentAdminBackend)&&/Payment_Ledger|V8\.SHEETS\.PAYMENTS/.test(paymentAdminBackend),'Central UPI review reads the shared Payment_Ledger');
const routes=fs.readFileSync('src/ZZZZZZZZZZZZZZZZZZZZZZZ_V912_FinalRoutes.gs','utf8');
ok(/'payments':'PaymentVerification'/.test(routes),'Admin router exposes the central UPI verification screen');
const cumulative=fs.readFileSync('src/CumulativeDashboard.html','utf8');
ok(/\?page=payments/.test(cumulative),'Cumulative Control Tower links to UPI verification');

console.log('Feature regression checks passed.');