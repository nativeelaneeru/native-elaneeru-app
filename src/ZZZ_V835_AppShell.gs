/*******************************************************************************
 * NATIVE ELANEERU V8.3.5 — SHARED UX SHELL
 * Adds a consistent mobile-first design layer and app switcher to every Apps
 * Script HTML product without changing each product's business logic.
 *******************************************************************************/

function sharedUxV835_(page){
  const base='https://script.google.com/macros/s/AKfycbx2s0l5A8LAdD1j24395XJSTMd5cEU7QdUkTI8LarDzatF-vVw6ODfm5x7MVJUkP9aB/exec';
  const apps=[
    ['B2C','home','🥥'],['B2B','b2b','🏪'],['Admin','admin','📊'],['Delivery','delivery','🛵'],
    ['Driver','driver','🚚'],['Sales','sales','💼'],['Picker','picker','🧺'],['Vendor','vendor','🤝'],
    ['Barcode','barcode','▦'],['Inventory','inventory','📦'],['Purchase Orders','purchaseorders','🧾']
  ];
  const items=apps.map(a=>'<a class="nel835-app" href="'+base+(a[1]==='home'?'':'?page='+a[1])+'"><span>'+a[2]+'</span><b>'+a[0]+'</b></a>').join('');
  return `
  <style id="nel835-style">
    :root{--nel-green:#08783e;--nel-green2:#0a8f4b;--nel-ink:#17251d;--nel-muted:#66756d;--nel-line:#e4ece7;--nel-bg:#f6f8f6;--nel-card:#fff;--nel-shadow:0 10px 30px rgba(15,55,31,.10);--nel-radius:18px}
    html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
    body{background:var(--nel-bg);color:var(--nel-ink);font-family:Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif!important;text-rendering:optimizeLegibility}
    *{box-sizing:border-box}
    button,input,select,textarea{font:inherit}
    button,[role="button"],a{touch-action:manipulation}
    button,input,select,textarea{min-height:44px}
    input,select,textarea{border-radius:12px!important;border-color:var(--nel-line)!important}
    button{border-radius:12px}
    button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:3px solid rgba(10,143,75,.22)!important;outline-offset:2px}
    table{max-width:100%}
    img{max-width:100%}
    .card,.panel,.sheet,.box,.tile{border-color:var(--nel-line)!important;box-shadow:0 4px 16px rgba(15,55,31,.06)}
    #nel835-launch{position:fixed;right:16px;bottom:18px;z-index:2147483000;border:0;background:var(--nel-green);color:#fff;height:52px;min-height:52px;padding:0 16px;border-radius:999px;box-shadow:0 12px 30px rgba(8,120,62,.28);font-weight:800;display:flex;align-items:center;gap:8px;cursor:pointer}
    #nel835-launch:hover{background:var(--nel-green2);transform:translateY(-1px)}
    #nel835-backdrop{position:fixed;inset:0;background:rgba(8,28,17,.45);backdrop-filter:blur(3px);z-index:2147483001;display:none}
    #nel835-drawer{position:fixed;right:0;top:0;bottom:0;width:min(420px,92vw);background:#fff;z-index:2147483002;transform:translateX(105%);transition:transform .22s ease;box-shadow:-20px 0 50px rgba(8,28,17,.20);padding:20px;overflow:auto}
    #nel835-drawer.open{transform:translateX(0)}
    #nel835-backdrop.open{display:block}
    .nel835-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:18px}
    .nel835-brand{font-size:20px;font-weight:900;color:var(--nel-green);margin:0}.nel835-sub{font-size:13px;color:var(--nel-muted);margin:4px 0 0}
    #nel835-close{border:0;background:#eef6f1;color:var(--nel-green);width:42px;height:42px;min-height:42px;border-radius:50%;font-size:20px;cursor:pointer}
    .nel835-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
    .nel835-app{text-decoration:none;color:var(--nel-ink);border:1px solid var(--nel-line);background:#fff;border-radius:16px;padding:14px;min-height:88px;display:flex;flex-direction:column;justify-content:center;gap:7px;transition:.18s ease}
    .nel835-app:hover{border-color:#b9dac7;background:#f7fcf9;transform:translateY(-1px)}
    .nel835-app span{font-size:23px}.nel835-app b{font-size:14px}
    .nel835-foot{margin-top:16px;padding:12px;border-radius:14px;background:#f0f8f3;color:#476154;font-size:12px;line-height:1.5}
    @media(max-width:640px){body{padding-bottom:76px}#nel835-launch{right:12px;bottom:12px}.nel835-grid{grid-template-columns:repeat(2,1fr)}}
    @media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important;animation-duration:.001ms!important}}
  </style>
  <button id="nel835-launch" type="button" aria-label="Open Native Elaneeru apps"><span>☰</span><span>Apps</span></button>
  <div id="nel835-backdrop"></div>
  <aside id="nel835-drawer" aria-hidden="true">
    <div class="nel835-head"><div><h2 class="nel835-brand">Native Elaneeru</h2><p class="nel835-sub">Switch app · V8.3.5</p></div><button id="nel835-close" type="button" aria-label="Close">×</button></div>
    <div class="nel835-grid">${items}</div>
    <div class="nel835-foot">Current app: <b>${page}</b><br>All apps use the same Fresh Operations backend.</div>
  </aside>
  <script>
    (function(){
      const b=document.getElementById('nel835-launch'),d=document.getElementById('nel835-drawer'),x=document.getElementById('nel835-close'),o=document.getElementById('nel835-backdrop');
      if(!b||!d)return;
      function open(){d.classList.add('open');o.classList.add('open');d.setAttribute('aria-hidden','false');document.documentElement.style.overflow='hidden'}
      function close(){d.classList.remove('open');o.classList.remove('open');d.setAttribute('aria-hidden','true');document.documentElement.style.overflow=''}
      b.addEventListener('click',open);x.addEventListener('click',close);o.addEventListener('click',close);document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
      window.addEventListener('error',function(){ document.body && document.body.classList.add('nel835-js-ready'); });
    })();
  </script>`;
}

function doGetV835_(e){
  const isBridge=String(e&&e.parameter&&e.parameter.bridge||'')==='1';
  if(isBridge) return bridgeHtml_({ok:false,error:'POST required.',requestId:''});
  const p=String(e&&e.parameter&&e.parameter.page||'').toLowerCase();
  const routes={
    '':'index','home':'index','b2c':'index','b2b':'B2B',
    'admin':'Admin','sales':'Sales','picker':'Picker','barcode':'Barcode','inventory':'Inventory',
    'vendor':'VendorOnboarding','vendoronboarding':'VendorOnboarding',
    'b2bdriver':'Driver','driver':'Driver','b2cdelivery':'Delivery','delivery':'Delivery','routeplanner':'Admin'
  };
  const page=routes[p]||'index';
  const out=HtmlService.createTemplateFromFile(page).evaluate()
    .setTitle('Native Elaneeru - '+(page==='index'?'B2C':page))
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport','width=device-width, initial-scale=1, viewport-fit=cover');
  out.append(sharedUxV835_(page));
  return out;
}

// Compatibility override: preserve the existing routing while adding the shell.
doGet = doGetV835_;
