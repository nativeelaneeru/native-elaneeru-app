/*******************************************************************************
 * NATIVE ELANEERU V9.1 — PRODUCT UX + ROLE-SAFE ROUTER
 * - consistent embedded brand mark (no GitHub Pages dependency)
 * - distinct B2C / B2B visual identities
 * - no cross-app switcher on customer/driver/staff screens
 * - Admin remains the only control surface that exposes the whole suite
 *******************************************************************************/

const NEL_V91_LOGO = 'data:image/png;base64,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';

function productUxV91_(page){
  const isB2C=page==='index', isB2B=page==='B2B';
  let theme='';
  if(isB2C) theme=`
    <style id="nel-v91-theme">
      :root{--g:#087a43!important;--g2:#10a45b!important;--bg:#f5faf7!important;--cream:#fff7df!important}
      body{background:linear-gradient(180deg,#f7fcf9 0,#eef7f2 100%)!important}
      .head{background:linear-gradient(135deg,#075b34 0%,#0d8f50 58%,#14a967 100%)!important;box-shadow:0 8px 24px rgba(4,67,38,.22)!important}
      .hero{background:radial-gradient(circle at 90% 15%,rgba(255,208,92,.34),transparent 30%),linear-gradient(135deg,#fffaf0,#e9f8ef)!important;border:0!important;box-shadow:0 14px 35px rgba(8,83,47,.10)!important;min-height:180px!important}
      .hero h1{font-size:31px!important;letter-spacing:-.8px!important}.hero p{font-size:13px!important;line-height:1.55!important}.coco{filter:drop-shadow(0 12px 18px rgba(70,80,55,.18))}
      .product{border:0!important;box-shadow:0 9px 26px rgba(13,77,47,.09)!important;padding:12px!important;transition:transform .18s ease,box-shadow .18s ease!important}.product:hover{transform:translateY(-2px);box-shadow:0 14px 30px rgba(13,77,47,.14)!important}
      .visual{height:150px!important;background:linear-gradient(145deg,#dff4e8,#fff2ca)!important}.price{color:#075b34!important}.add{background:#075b34!important;color:#fff!important;border-color:#075b34!important;padding:10px!important}
      .card{box-shadow:0 8px 22px rgba(13,77,47,.06)!important}.section h2{font-size:20px!important}.nav{box-shadow:0 -8px 25px rgba(17,53,34,.08)!important}.cartBar{background:linear-gradient(135deg,#063f27,#087a43)!important;box-shadow:0 14px 35px rgba(0,0,0,.20)!important}
      @media(max-width:430px){.hero{min-height:145px!important}.hero h1{font-size:27px!important}.visual{height:128px!important}}
    </style>`;
  if(isB2B) theme=`
    <style id="nel-v91-theme">
      :root{--g:#123a5a!important;--g2:#0f7280!important;--bg:#f2f5f8!important;--ink:#172634!important;--muted:#6a7885!important;--line:#dbe3ea!important;--cream:#fff6dc!important}
      body{background:linear-gradient(180deg,#f4f7fa,#edf2f5)!important}
      .login,.head{background:linear-gradient(135deg,#0c2940 0%,#123a5a 52%,#0f7280 100%)!important}.head{box-shadow:0 9px 26px rgba(14,46,70,.25)!important}
      .primary,.add,.call{background:#123a5a!important}.eyebrow,.credit span{color:#c9e5eb!important}.credit div{background:rgba(255,255,255,.10)!important;border-color:rgba(255,255,255,.16)!important}
      .hero{background:radial-gradient(circle at 95% 0,rgba(221,169,62,.24),transparent 35%),linear-gradient(135deg,#fffaf0,#edf5f7)!important;border:0!important;box-shadow:0 12px 32px rgba(18,58,90,.10)!important}.hero .rate,.your b{color:#123a5a!important}
      .product,.card,.metric{border:0!important;box-shadow:0 8px 24px rgba(25,55,77,.08)!important}.visual{background:linear-gradient(145deg,#e3eef4,#fff0c8)!important}.price{color:#123a5a!important}.pbtn{border-color:#123a5a!important;color:#123a5a!important;background:#edf4f7!important}.qty{border-color:#7ba5b6!important}.qty button{background:#edf4f7!important;color:#123a5a!important}
      .nav .on{color:#0f7280!important}.cartBar{background:linear-gradient(135deg,#0c2940,#123a5a)!important}.wa{color:#0f6770!important;background:#e9f5f5!important;border-color:#cde6e7!important}
      .badge,.status{background:#e9f2f6!important;color:#123a5a!important}
    </style>`;
  return `${theme}<style id="nel-v91-brand-css">.nel-v91-brandmark{width:42px;height:42px;border-radius:12px;object-fit:cover;background:#fff;box-shadow:0 3px 12px rgba(0,0,0,.14);vertical-align:middle}.nel-v91-mini{width:34px;height:34px;border-radius:9px}.brandRow>.logo{margin-right:0}</style>
  <script>(function(){
    const LOGO='${NEL_V91_LOGO}';
    const existing=document.querySelector('img.logo,img.headLogo');
    if(existing){
      existing.src=LOGO;
      existing.onerror=null;
      existing.classList.add('nel-v91-brandmark');
      document.querySelectorAll('.nel-v91-brandmark').forEach(function(x){if(x!==existing)x.remove();});
      return;
    }
    const row=document.querySelector('header .brandRow, header .topline, header .headerTop, .top .brand');
    if(row && !row.querySelector('.nel-v91-brandmark')){
      const i=document.createElement('img');
      i.src=LOGO;i.className='nel-v91-brandmark';i.alt='Native Elaneeru';
      row.insertBefore(i,row.firstChild);
    }
  })();</script>`;
}

function doGetV91_(e){
  const isBridge=String(e&&e.parameter&&e.parameter.bridge||'')==='1';
  if(isBridge) return bridgeHtml_({ok:false,error:'POST required.',requestId:''});
  const p=String(e&&e.parameter&&e.parameter.page||'').toLowerCase();
  const routes={
    '':'index','home':'index','b2c':'index','apps':'Apps',
    'b2b':'B2B','admin':'Admin','sales':'Sales','picker':'Picker','barcode':'Barcode','inventory':'Inventory',
    'vendor':'VendorOnboarding','vendoronboarding':'VendorOnboarding',
    'b2bdriver':'Driver','driver':'Driver','b2cdelivery':'Delivery','delivery':'Delivery','routeplanner':'Admin'
  };
  const page=routes[p]||'index';
  const out=HtmlService.createTemplateFromFile(page).evaluate()
    .setTitle('Native Elaneeru - '+(page==='index'?'B2C':page))
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport','width=device-width, initial-scale=1, viewport-fit=cover');
  out.append(productUxV91_(page));
  // Only Admin gets the cross-app switcher. Every other app remains role-isolated.
  if(page==='Admin') out.append(sharedUxV9_(page));
  return out;
}

doGet = doGetV91_;