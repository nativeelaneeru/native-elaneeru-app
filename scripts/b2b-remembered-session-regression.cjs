const fs=require('fs'),vm=require('vm'),assert=require('assert'),crypto=require('crypto');
let now=Date.now();class Clock extends Date{static now(){return now}}
const props=new Map(),cache=new Map(),v={'Vendor ID':'V1',Mobile:'6111111111',Status:'ACTIVE','PIN Hash':'pin-hash',_row:2};
const ctx={console,Date:Clock,V8:{SHEETS:{B2B_VENDORS:'vendors'}},s_:x=>String(x??'').trim(),digits_:x=>String(x).replace(/\D/g,''),active_:x=>x==='ACTIVE',hashV8_:x=>crypto.createHash('sha256').update(String(x==='1234'?'pin-hash':x)).digest('hex'),Utilities:{getUuid:()=>crypto.randomUUID()},CacheService:{getScriptCache:()=>({get:k=>cache.get(k)||null,put:(k,x)=>cache.set(k,x),remove:k=>cache.delete(k)})},PropertiesService:{getScriptProperties:()=>({getProperty:k=>props.get(k)||null,setProperty:(k,x)=>props.set(k,x),deleteProperty:k=>props.delete(k)})},rows_:()=>[v],find_:(_,field,value)=>v[field]===value?v:null,v1000MarketRates_:()=>[],v1000B2BProducts_:()=>[],v1000B2BBanners_:()=>[],n_:x=>Number(x)||0};
v['PIN Hash']=ctx.hashV8_('1234');
vm.createContext(ctx);vm.runInContext(fs.readFileSync(process.argv[2],'utf8'),ctx);
const first=ctx.vendorLogin('6111111111','1234').token;
assert(props.size>0);assert(![...props.keys()].some(k=>k.includes(first)));
cache.clear();assert.equal(ctx.vendor_(first)['Vendor ID'],'V1');
now+=7*86400000;cache.clear();assert.equal(ctx.vendor_(first)['Vendor ID'],'V1');
const second=ctx.vendorLogin('6111111111','1234').token;
ctx.vendorLogout(second);assert.throws(()=>ctx.vendor_(second),/expired/);
v.Status='INACTIVE';assert.throws(()=>ctx.vendor_(first),/inactive/);v.Status='ACTIVE';
v['PIN Hash']='changed';assert.throws(()=>ctx.vendor_(first),/invalid/);v['PIN Hash']=ctx.hashV8_('1234');
const legacy=crypto.randomUUID();cache.set('VENDOR:'+legacy,'V1');assert.equal(ctx.vendor_(legacy)['Vendor ID'],'V1');cache.clear();assert.equal(ctx.vendor_(legacy)['Vendor ID'],'V1');
now+=31*86400000;assert.throws(()=>ctx.vendor_(legacy),/expired/);
assert.throws(()=>ctx.vendor_(crypto.randomUUID()),/expired/);
assert.throws(()=>ctx.vendor_('bad'),/expired/);
console.log('B2B remembered sessions passed: cache eviction, renewal, logout, inactivity, PIN change, migration, expiry and forged tokens.');
