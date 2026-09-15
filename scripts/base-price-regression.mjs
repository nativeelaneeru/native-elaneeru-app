import fs from 'node:fs';

function read(path){return fs.readFileSync(path,'utf8')}
function ok(cond,msg){if(!cond){console.error('FAIL:',msg);process.exitCode=1}else console.log('PASS:',msg)}

const channels=read('src/ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ_V951_ProductChannels.gs');
const liveBackend=read('src/ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ_V950_LivePricing.gs');
const admin=read('src/AdminProductsSimpleV951.html');
const b2cLive=read('b2c/live-pricing-v10440.js');
const b2bLive=read('b2b/live-pricing-v950.js');
const b2cDisplay=read('b2c/base-price-v10450.js');
const b2bDisplay=read('b2b/base-price-v952.js');
const b2cConfig=read('b2c/config.js');
const b2bConfig=read('b2b/config.js');
const b2cWorker=read('b2c/sw.js');
const b2bWorker=read('b2b/sw.js');

ok(/B2C Base Price/.test(channels)&&/B2B Base Price/.test(channels),'product backend ensures separate B2C and B2B base-price columns');
ok(/b2cBasePrice=v951BasePrice_/.test(channels)&&/b2bBasePrice=v951BasePrice_/.test(channels),'Admin DTO exposes both channel base prices');
ok(/basePrice:v951BasePrice_\(r,'B2C'\)/.test(channels),'B2C catalogue receives the customer-visible base price');
ok(/basePrice:v951BasePrice_\(r,'B2B'\)/.test(channels),'B2B catalogue receives the vendor-visible base price');
ok(/B2C Base Price.*higher than the B2C Selling Price/.test(channels)&&/B2B Base Price.*higher than the B2B Selling Price/.test(channels),'backend rejects base prices below selling prices');

ok(/id="pcB2cBasePrice"/.test(admin)&&/id="pcB2bBasePrice"/.test(admin),'Admin has independent base-price inputs for both channels');
ok(/customer visible/.test(admin)&&/vendor visible/.test(admin),'Admin labels base prices as channel-visible');
ok(/b2cBasePrice:num\('pcB2cBasePrice'\)/.test(admin)&&/b2bBasePrice:num\('pcB2bBasePrice'\)/.test(admin),'Admin saves both base prices');
ok(/Selling price ₹/.test(admin)&&/Default selling price ₹/.test(admin),'Admin clearly separates base and selling prices');

ok(/basePrice:n_\(p\['B2C Base Price'\]\)\|\|price/.test(liveBackend),'B2C live endpoint returns base price with safe selling-price fallback');
ok(/basePrice:n_\(p\['B2B Base Price'\]\)\|\|defaultPrice/.test(liveBackend),'B2B live endpoint returns base price with safe default-price fallback');
ok(/num\(a\.basePrice\)!==num\(b\.basePrice\)/.test(b2cLive)&&/basePrice:num\(fresh\.basePrice\)/.test(b2cLive),'B2C live sync updates base-price display without page refresh');
ok(/num\(old\.basePrice\)!==num\(fresh\.basePrice\)/.test(b2bLive)&&/basePrice:num\(fresh\.basePrice\)/.test(b2bLive),'B2B live sync updates base-price display without page refresh');
ok(/seen\[id\].*price/.test(b2bLive)&&!/seen\[id\].*basePrice/.test(b2bLive),'B2B market notifications remain based on selling-price changes only');

ok(/base>sell&&sell>0/.test(b2cDisplay)&&/nelBasePriceStrike/.test(b2cDisplay),'B2C crosses out base price only when it is genuinely higher');
ok(/base>sell&&sell>0/.test(b2bDisplay)&&/nelBasePriceStrike/.test(b2bDisplay),'B2B crosses out base price only when it is genuinely higher');
ok(/Update Qty/.test(b2bDisplay)&&/Cart quantity updated/.test(b2bDisplay),'B2B cart update wording is unambiguous');
ok(/base-price-v10450\.js/.test(b2cConfig)&&/base-price-v10450/.test(b2cWorker),'B2C production config and service worker load base-price display');
ok(/base-price-v952\.js/.test(b2bConfig)&&/base-price-v952/.test(b2bWorker),'B2B production config and service worker load base-price display');

try{new Function(channels);new Function(liveBackend);new Function(b2cLive);new Function(b2bLive);new Function(b2cDisplay);new Function(b2bDisplay);ok(true,'base-price backend and client JavaScript parse')}catch(e){ok(false,'base-price backend and client JavaScript parse: '+e.message)}
try{[...admin.matchAll(/<script>([\s\S]*?)<\/script>/g)].forEach(x=>new Function(x[1]));ok(true,'base-price Admin JavaScript parses')}catch(e){ok(false,'base-price Admin JavaScript parses: '+e.message)}

if(process.exitCode)process.exit(process.exitCode);
console.log('Base price regression checks passed.');