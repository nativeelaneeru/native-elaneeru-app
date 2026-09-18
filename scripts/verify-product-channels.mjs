import fs from 'node:fs';

const backend=fs.readFileSync('src/ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ_V951_ProductChannels.gs','utf8');
const ui=fs.readFileSync('src/AdminProductsSimpleV951.html','utf8');
const routes=fs.readFileSync('src/ZZZZZZZZZZZZZZZZZZZZZZZ_V912_FinalRoutes.gs','utf8');
const nav=fs.readFileSync('src/AdminNavigationV957.html','utf8');
const guards=fs.readFileSync('src/ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ_V957_ProductStatusGuards.gs','utf8');
const b2cStock=fs.readFileSync('b2c/stock-status-v10590.js','utf8');
const b2cConfig=fs.readFileSync('b2c/config.js','utf8');
const sw=fs.readFileSync('b2c/sw.js','utf8');

function ok(cond,msg){if(!cond){console.error('FAIL:',msg);process.exitCode=1}else console.log('PASS:',msg)}

ok(/B2C Image URL/.test(backend)&&/B2B Image URL/.test(backend),'channel-specific image columns are supported');
ok(/\['B2C','B2B','BOTH'\]/.test(backend),'B2C-only, B2B-only and Both availability are supported');
ok(/id==='TC'\)availability='BOTH'/.test(backend),'Tender Coconut remains available in both apps');
ok(/v951ChannelImage_\(r,'B2C'\)/.test(backend),'B2C catalogue uses the B2C image override');
ok(/v951ChannelImage_\(r,'B2B'\)/.test(backend),'B2B catalogue uses the B2B image override');
ok(/safeImageUrl_\(row\['Image URL'\]\)/.test(backend),'channel images safely fall back to the shared legacy image');
ok(/Channel Availability/.test(backend)&&/B2C Stock Override/.test(backend)&&/B2B Stock Override/.test(backend),'channel membership is stored separately from manual stock status');
ok(/operational==='OOS'/.test(backend)&&/publish:'LIVE',override:'OOS'/.test(backend),'OOS keeps a product published while applying an out-of-stock override');
ok(/explicitOperationalStatus:true/.test(backend)&&/liveNotLiveOos:true/.test(backend),'backend health exposes explicit LIVE NOT LIVE OOS support');

ok(/value="B2C">B2C only/.test(ui)&&/value="BOTH">Both/.test(ui)&&/value="B2B">B2B only/.test(ui),'Admin has one simple availability selector');
ok(/pcAvailability'\)\.value='B2C'/.test(ui),'new products default to B2C only');
ok(/pcB2cSection/.test(ui)&&/pcB2bSection/.test(ui)&&/style\.display=b2c\?'block':'none'/.test(ui),'irrelevant channel sections are hidden');
ok(/Leave blank to use the B2C\/shared image/.test(ui),'B2B image is optional when a shared image is sufficient');
ok(/value="LIVE">LIVE/.test(ui)&&/value="NOT LIVE">NOT LIVE/.test(ui)&&/value="OOS">OOS/.test(ui),'Admin exposes LIVE NOT LIVE and OOS status choices');
ok(/pcB2cStatus/.test(ui)&&/pcB2bStatus/.test(ui),'B2C and B2B have independent operational status controls');
ok(/Out of Stock/.test(ui)&&/visible but ordering blocked/.test(ui),'Admin visibly explains the OOS state');
ok(/saveProductAdminV951/.test(ui),'simplified Admin saves through the channel-aware backend');

ok(/AdminProductsSimpleV951/.test(routes),'Admin route loads the simplified Products UI after the legacy compatibility UI');
ok(/AdminNavigationV957/.test(routes),'Admin route loads centralized navigation after all feature tabs');
ok(/addEventListener\('click'/.test(nav)&&/true\);/.test(nav),'Admin navigation uses delegated capture so later-added tabs also switch cleanly');
ok(/vendorPricingPanel/.test(nav)&&/adminGrowthPanel/.test(nav)&&/adminProductsPanel/.test(nav)&&/adminBarcodePanel/.test(nav)&&/'access'/.test(nav),'Admin navigation knows every dynamic top-level panel');

ok(/v905B2CProducts_/.test(guards)&&/B2C Stock Override/.test(guards),'B2C checkout filters manual OOS server-side');
ok(/v916B2BQuote_/.test(guards)&&/is out of stock/.test(guards),'B2B checkout rejects OOS server-side');
ok(/stockStatus/.test(b2cStock)&&/OUT OF STOCK/.test(b2cStock)&&/window\.add=function/.test(b2cStock),'B2C UI visibly blocks OOS add actions');
ok(/stock-status-v10590\.js/.test(b2cConfig),'B2C production config loads OOS status guard');
const b2cVersion=(b2cConfig.match(/appVersion:\s*'(\d+\.\d+\.\d+)-pwa'/)||[])[1]||'';
ok(/stock-status-v10590/.test(sw)&&!!b2cVersion&&sw.includes('native-elaneeru-b2c-v'+b2cVersion),'B2C service worker refreshes and caches OOS guard using the current app version');

const scripts=[...ui.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]);
try{scripts.forEach(s=>new Function(s));ok(true,'simplified Products JavaScript parses')}catch(e){ok(false,'simplified Products JavaScript parses: '+e.message)}
try{[...nav.matchAll(/<script>([\s\S]*?)<\/script>/g)].forEach(x=>new Function(x[1]));ok(true,'Admin navigation JavaScript parses')}catch(e){ok(false,'Admin navigation JavaScript parses: '+e.message)}
try{new Function(backend);ok(true,'product channel backend parses as JavaScript')}catch(e){ok(false,'product channel backend parses: '+e.message)}
try{new Function(guards);ok(true,'product status guards parse as JavaScript')}catch(e){ok(false,'product status guards parse: '+e.message)}
try{new Function(b2cStock);ok(true,'B2C stock status guard parses as JavaScript')}catch(e){ok(false,'B2C stock status guard parses: '+e.message)}

if(process.exitCode)process.exit(process.exitCode);
