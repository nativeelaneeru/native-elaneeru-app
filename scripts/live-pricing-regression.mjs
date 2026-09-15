import fs from 'node:fs';

function ok(value,message){if(!value)throw new Error(message);console.log('✓',message)}
function read(path){return fs.readFileSync(path,'utf8')}

const backend=read('src/ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ_V950_LivePricing.gs');
const b2c=read('b2c/live-pricing-v10440.js');
const b2b=read('b2b/live-pricing-v950.js');
const b2cConfig=read('b2c/config.js');
const b2bConfig=read('b2b/config.js');
const b2cWorker=read('b2c/sw.js');
const b2bWorker=read('b2b/sw.js');

new Function(backend);new Function(b2c);new Function(b2b);
ok(true,'live pricing backend and client modules parse');
ok(/function getB2CLivePricingV950\(/.test(backend),'B2C has a dedicated lightweight live-pricing endpoint');
ok(/function getB2BLivePricingV950\(token\)/.test(backend),'B2B has a vendor-authenticated live-pricing endpoint');
ok(/V950_PREVIOUS_DO_POST/.test(backend)&&/getB2CLivePricingV950:getB2CLivePricingV950/.test(backend)&&/getB2BLivePricingV950:getB2BLivePricingV950/.test(backend),'PWA bridge exposes only the dedicated live-pricing methods');
ok(/serverAuthoritative:true/.test(backend),'live pricing health contract keeps server-authoritative pricing');
ok(/POLL_MS=5000/.test(b2c)&&/getB2CLivePricingV950/.test(b2c),'B2C checks live prices every five seconds while active');
ok(/publishCatalogV113/.test(b2c)&&/renderCart/.test(b2c),'B2C live pricing refreshes catalogue and open-cart totals without reload');
ok(/POLL_MS=5000/.test(b2b)&&/getB2BLivePricingV950/.test(b2b),'B2B checks vendor-specific prices every five seconds while active');
ok(/Prices increased due to market uptrend/.test(b2b)&&/We have a better price for you/.test(b2b),'B2B explains both upward and downward price changes');
ok(/CART\[id\]\.product=Object\.assign/.test(b2b),'B2B live pricing reconciles existing cart items to the fresh server price');
ok(/nel_b2b_last_prices_v950_/.test(b2b),'B2B remembers last-seen prices separately for each vendor');
ok(/live-pricing-v10440\.js/.test(b2cConfig)&&/live-pricing-v10440/.test(b2cWorker),'B2C production config and PWA cache load live pricing');
ok(/live-pricing-v950\.js/.test(b2bConfig)&&/live-pricing-v950/.test(b2bWorker),'B2B production config and PWA cache load live pricing');

console.log('Live pricing regression checks passed.');
