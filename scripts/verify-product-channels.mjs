import fs from 'node:fs';

const backend=fs.readFileSync('src/ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ_V951_ProductChannels.gs','utf8');
const ui=fs.readFileSync('src/AdminProductsSimpleV951.html','utf8');
const routes=fs.readFileSync('src/ZZZZZZZZZZZZZZZZZZZZZZZ_V912_FinalRoutes.gs','utf8');

function ok(cond,msg){if(!cond){console.error('FAIL:',msg);process.exitCode=1}else console.log('PASS:',msg)}

ok(/B2C Image URL/.test(backend)&&/B2B Image URL/.test(backend),'channel-specific image columns are supported');
ok(/\['B2C','B2B','BOTH'\]/.test(backend),'B2C-only, B2B-only and Both availability are supported');
ok(/id==='TC'\)availability='BOTH'/.test(backend),'Tender Coconut remains available in both apps');
ok(/v951ChannelImage_\(r,'B2C'\)/.test(backend),'B2C catalogue uses the B2C image override');
ok(/v951ChannelImage_\(r,'B2B'\)/.test(backend),'B2B catalogue uses the B2B image override');
ok(/safeImageUrl_\(row\['Image URL'\]\)/.test(backend),'channel images safely fall back to the shared legacy image');
ok(/value="B2C">B2C only/.test(ui)&&/value="BOTH">Both/.test(ui)&&/value="B2B">B2B only/.test(ui),'Admin has one simple availability selector');
ok(/pcAvailability'\)\.value='B2C'/.test(ui),'new products default to B2C only');
ok(/pcB2cSection/.test(ui)&&/pcB2bSection/.test(ui)&&/style\.display=b2c\?'block':'none'/.test(ui),'irrelevant channel sections are hidden');
ok(/Leave blank to use the B2C\/shared image/.test(ui),'B2B image is optional when a shared image is sufficient');
ok(/saveProductAdminV951/.test(ui),'simplified Admin saves through the channel-aware backend');
ok(/AdminProductsSimpleV951/.test(routes),'Admin route loads the simplified Products UI after the legacy compatibility UI');

const scripts=[...ui.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]);
try{scripts.forEach(s=>new Function(s));ok(true,'simplified Products JavaScript parses')}catch(e){ok(false,'simplified Products JavaScript parses: '+e.message)}
try{new Function(backend);ok(true,'product channel backend parses as JavaScript')}catch(e){ok(false,'product channel backend parses: '+e.message)}

if(process.exitCode)process.exit(process.exitCode);
