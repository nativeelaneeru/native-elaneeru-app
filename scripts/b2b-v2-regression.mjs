import fs from 'node:fs';
import vm from 'node:vm';

function ok(v,m){if(!v)throw new Error(m);console.log('✓',m)}
const html=fs.readFileSync('b2b-v2/index.html','utf8');
const manifest=JSON.parse(fs.readFileSync('b2b-v2/manifest.webmanifest','utf8'));
const sw=fs.readFileSync('b2b-v2/sw.js','utf8');

const isProductionWrapper=/\.\.\/b2b\/\?legacy=v2/.test(html);
if(isProductionWrapper){
  ok(/<iframe[^>]+src="\.\.\/b2b\/\?legacy=v2&build=1200"/.test(html),'Legacy B2B v2 routes into production Business app');
  ok(manifest.start_url==='./'&&manifest.scope==='./'&&manifest.display==='standalone','B2B v2 manifest remains installable');
  new vm.Script(sw,{filename:'b2b-v2/sw.js'});ok(true,'B2B v2 service worker parses');
  const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(Boolean);
  scripts.forEach((s,i)=>new vm.Script(s,{filename:`b2b-v2/index-inline-${i+1}.js`}));
  ok(scripts.length>0,'B2B v2 migration wrapper runtime parses');
  console.log('B2B v2 production-wrapper regression passed.');
  process.exit(0);
}

ok(/getB2BHomeFastV1000/.test(html),'B2B v2 Home uses lightweight fast endpoint');
ok(/getB2BAppDataV9/.test(html),'B2B v2 loads full order/target payload on demand');
ok(/prepareB2BUpiPaymentV916/.test(html)&&/submitB2BUpiOrderV916/.test(html),'B2B v2 has native UPI flow');
ok(/placeB2BOrderV9/.test(html)&&/clientRequestId/.test(html),'B2B v2 COD order flow is duplicate-safe');
ok(/data-view="schemes"/.test(html)&&!/data-view="credit"/.test(html),'B2B v2 navigation uses Schemes, not Credit');
ok(/bannerHost/.test(html)&&/marketHost/.test(html),'B2B v2 Home includes banners and market prices');
ok(/localStorage\.setItem\('nel_b2b_v2_token'/.test(html)&&/loadCachedHome/.test(html),'B2B v2 restores session and paints cached Home');
ok(/loading="lazy"/.test(html)&&/decoding="async"/.test(html),'B2B v2 defers image work');
ok(manifest.start_url==='./'&&manifest.scope==='./'&&manifest.display==='standalone','B2B v2 manifest is installable');
new vm.Script(sw,{filename:'b2b-v2/sw.js'});ok(true,'B2B v2 service worker parses');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(Boolean);
scripts.forEach((s,i)=>new vm.Script(s,{filename:`b2b-v2/index-inline-${i+1}.js`}));ok(scripts.length>0,'B2B v2 inline runtime parses');
console.log('B2B v2 launch regression passed.');