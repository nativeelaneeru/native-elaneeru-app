/*******************************************************************************
 * NATIVE ELANEERU V9 — SHARED APP SHELL + ROUTER
 * One router, one app switcher, relative links that work on preview/live URLs.
 *******************************************************************************/

function sharedUxV9_(page){
  const apps=[
    ['Apps','apps','▦'],['B2C','b2c','🛒'],['B2B','b2b','🏪'],['Admin','admin','📊'],
    ['Delivery','delivery','🛵'],['Driver','driver','🚚'],['Sales','sales','📈'],
    ['Picker','picker','📦'],['Onboarding','vendor','🤝'],['Barcode','barcode','▦'],['Inventory','inventory','🏬']
  ];
  const items=apps.map(a=>'<a class="nel9-app" href="?page='+a[1]+'"><span>'+a[2]+'</span><b>'+a[0]+'</b></a>').join('');
  return `
  <style id="nel9-style">
    #nel9-launch{position:fixed;right:14px;bottom:16px;z-index:2147483000;border:0;background:#075b34;color:#fff;height:50px;padding:0 15px;border-radius:999px;box-shadow:0 12px 30px rgba(7,91,52,.28);font-weight:900;display:flex;align-items:center;gap:8px;cursor:pointer}
    #nel9-backdrop{position:fixed;inset:0;background:rgba(8,28,17,.45);backdrop-filter:blur(3px);z-index:2147483001;display:none}
    #nel9-drawer{position:fixed;right:0;top:0;bottom:0;width:min(420px,92vw);background:#fff;z-index:2147483002;transform:translateX(105%);transition:transform .22s ease;box-shadow:-20px 0 50px rgba(8,28,17,.20);padding:20px;overflow:auto;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif}
    #nel9-drawer.open{transform:translateX(0)}#nel9-backdrop.open{display:block}.nel9-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:18px}.nel9-brand{font-size:20px;font-weight:950;color:#075b34;margin:0}.nel9-sub{font-size:12px;color:#66736b;margin:4px 0 0}.nel9-close{border:0;background:#eef6f1;color:#075b34;width:42px;height:42px;border-radius:50%;font-size:20px}.nel9-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.nel9-app{text-decoration:none;color:#17211b;border:1px solid #e3e9e5;background:#fff;border-radius:15px;padding:13px;min-height:78px;display:flex;flex-direction:column;justify-content:center;gap:5px}.nel9-app:hover{background:#f1faf4;border-color:#b9dcc6}.nel9-app span{font-size:22px}.nel9-app b{font-size:13px}.nel9-foot{margin-top:16px;padding:12px;border-radius:14px;background:#f0f8f3;color:#476154;font-size:12px;line-height:1.5}@media(max-width:640px){#nel9-launch{right:10px;bottom:10px}.nel9-grid{grid-template-columns:repeat(2,1fr)}}
  </style>
  <button id="nel9-launch" type="button"><span>☰</span><span>Apps</span></button><div id="nel9-backdrop"></div><aside id="nel9-drawer" aria-hidden="true"><div class="nel9-head"><div><h2 class="nel9-brand">Native Elaneeru</h2><p class="nel9-sub">App Suite · V9</p></div><button id="nel9-close" class="nel9-close" type="button">×</button></div><div class="nel9-grid">${items}</div><div class="nel9-foot">Current app: <b>${page}</b><br>Fresh Operations is the shared backend.</div></aside>
  <script>(function(){const b=document.getElementById('nel9-launch'),d=document.getElementById('nel9-drawer'),x=document.getElementById('nel9-close'),o=document.getElementById('nel9-backdrop');if(!b||!d)return;function open(){d.classList.add('open');o.classList.add('open');d.setAttribute('aria-hidden','false')}function close(){d.classList.remove('open');o.classList.remove('open');d.setAttribute('aria-hidden','true')}b.onclick=open;x.onclick=close;o.onclick=close;document.addEventListener('keydown',e=>{if(e.key==='Escape')close()})})();</script>`;
}

function doGetV9_(e){
  const isBridge=String(e&&e.parameter&&e.parameter.bridge||'')==='1';
  if(isBridge) return bridgeHtml_({ok:false,error:'POST required.',requestId:''});
  const p=String(e&&e.parameter&&e.parameter.page||'').toLowerCase();
  const routes={
    '':'index','home':'index','b2c':'index','apps':'Apps',
    'b2b':'B2B','admin':'Admin','sales':'Sales','picker':'Picker','barcode':'Barcode','inventory':'Inventory',
    'vendor':'VendorOnboarding','vendoronboarding':'VendorOnboarding',
    'b2bdriver':'Driver','driver':'Driver','b2cdelivery':'Delivery','delivery':'Delivery','routeplanner':'Admin'
  };
  const page=routes[p]||'Apps';
  const out=HtmlService.createTemplateFromFile(page).evaluate()
    .setTitle('Native Elaneeru - '+(page==='index'?'B2C':page))
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport','width=device-width, initial-scale=1, viewport-fit=cover')
    .addMetaTag('theme-color','#075b34');
  if(page!=='Apps') out.append(sharedUxV9_(page));
  return out;
}

// Override older router definitions without changing the stable V8 engine.
doGet = doGetV9_;
