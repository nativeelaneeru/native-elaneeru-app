import fs from 'node:fs';

const path='src/ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ_V963_DriverMarketFix.gs';
const src=fs.readFileSync(path,'utf8');
let failures=0;
function ok(cond,msg){
  if(cond) console.log(`✓ ${msg}`);
  else { failures++; console.error(`✗ ${msg}`); }
}

new Function(src);
ok(/v963DateKey_/.test(src)&&/Asia\/Kolkata/.test(src),'route dates are normalized in India timezone');
ok(/V963_PREVIOUS_GET_DRIVER_DAY_ROUTE/.test(src)&&/candidate\['Route Date'\]/.test(src),'driver route lookup retries using stored route-date representation');
ok(/\['COMPLETED','CANCELLED'\]/.test(src),'completed/cancelled routes remain excluded');
ok(/\['Estimated Per Piece','Modal Rate','Modal Price'\]/.test(src),'market reader supports new and legacy modal columns');
ok(/\['Min Rate','Min Price'\]/.test(src)&&/\['Max Rate','Max Price'\]/.test(src),'market reader supports new and legacy min/max columns');
ok(/status==='TEST'/.test(src)&&/quality\.indexOf\('DEMO'\)/.test(src),'TEST/DEMO market rows are excluded');
ok(/data\.marketRates=rates/.test(src)&&/data\.marketPrices=rates/.test(src),'B2B market aliases receive the same canonical current-rate list');
ok(/marketRatesUpdatedAt/.test(src)&&/marketRatesVersion/.test(src),'B2B payload exposes market freshness metadata');
ok(!/placeB2BOrder\s*\(/.test(src)&&!/saveOrder\s*\(/.test(src),'fix cannot create B2B/B2C production orders');
ok(!/Payment_Ledger|Cashback_Ledger|B2C_Subscriptions/.test(src),'fix does not write financial or subscription ledgers');

if(failures){
  console.error(`\n${failures} driver/market regression check(s) failed.`);
  process.exit(1);
}
console.log('\nAll driver/market regression checks passed.');
