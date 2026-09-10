import fs from 'node:fs';
import vm from 'node:vm';

function ok(value,message){if(!value)throw new Error(message);console.log('✓',message)}

for(const file of ['b2c/cart-visibility-v10320.js','b2c/customer-growth-v10330.js','b2c/referral-reward-v10340.js','b2b/production-fixes-v990.js']){
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

console.log('Feature regression checks passed.');
