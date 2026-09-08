/*******************************************************************************
 * NATIVE ELANEERU V9 — SHARED BRAND / ROLE SHELL + ROUTER
 * - Embedded Native Elaneeru logo on every Apps Script screen
 * - B2C and B2B use distinct visual systems
 * - Cross-app switcher is available only inside authenticated Admin
 * - B2B Driver gets a real camera barcode scanner with manual fallback
 *******************************************************************************/

function sharedUxV9_(page){
  const base=ScriptApp.getService().getUrl()||'';
  const logo=brandLogoV9_();
  const isAdmin=page==='Admin';
  const isDriver=page==='Driver';
  const theme=(page==='B2B'||page==='Driver')?'b2b':((page==='index'||page==='Delivery')?'b2c':'ops');

  const apps=[
    ['Apps','apps','▦'],['B2C','b2c','🛒'],['B2B','b2b','🏪'],['Admin','admin','📊'],
    ['Delivery','delivery','🛵'],['Driver','driver','🚚'],['Sales','sales','📈'],
    ['Picker','picker','📦'],['Onboarding','vendor','🤝'],['Barcode','barcode','▦'],['Inventory','inventory','🏬']
  ];
  const items=apps.map(a=>'<a class="nel9-app" target="_top" href="'+base+'?page='+a[1]+'"><span>'+a[2]+'</span><b>'+a[0]+'</b></a>').join('');

  const adminShell=isAdmin?`
    <button id="nel9-launch" type="button" aria-label="Open app switcher"><span>☰</span><span>Apps</span></button>
    <div id="nel9-backdrop"></div>
    <aside id="nel9-drawer" aria-hidden="true">
      <div class="nel9-head"><div class="nel9-headbrand"><img src="${logo}" alt="Native Elaneeru"><div><h2 class="nel9-brand">Native Elaneeru</h2><p class="nel9-sub">Admin app suite · V9</p></div></div><button id="nel9-close" class="nel9-close" type="button">×</button></div>
      <div class="nel9-grid">${items}</div>
      <div class="nel9-foot">Admin-only launcher. Operational and customer apps no longer expose cross-app navigation.</div>
    </aside>`:'';

  const scanner=isDriver?`
    <div id="nel9-scan-modal" class="nel9-scan-modal" aria-hidden="true">
      <div class="nel9-scan-card">
        <div class="nel9-scan-head"><div><b>Scan batch barcode</b><span id="nel9-scan-status">Point the camera at the barcode</span></div><button id="nel9-scan-close" type="button">×</button></div>
        <div class="nel9-video-wrap"><video id="nel9-camera" playsinline muted></video><div class="nel9-scan-line"></div></div>
        <input id="nel9-manual-code" class="nel9-manual" placeholder="Or enter barcode manually" autocomplete="off">
        <div class="nel9-scan-actions"><button id="nel9-photo" type="button" class="nel9-soft">📷 Use phone camera</button><button id="nel9-manual-use" type="button">Verify code</button></div>
        <input id="nel9-photo-input" type="file" accept="image/*" capture="environment" hidden>
        <div class="nel9-scan-note">Camera permission is used only while this scanner is open. Manual entry remains available as a fallback.</div>
      </div>
    </div>`:'';

  return `
  <style id="nel9-runtime-style">
    .nel9-brandmark{width:48px;height:48px;border-radius:14px;object-fit:cover;background:#fff;border:1px solid rgba(255,255,255,.35);box-shadow:0 4px 14px rgba(0,0,0,.13);flex:0 0 auto}
    .nel9-brand-row{display:flex!important;align-items:center!important;gap:10px!important}
    body.nel9-b2c{--g:#075b34;--g2:#149352;--bg:#f6f4ec;--cream:#fff1c8;background:linear-gradient(180deg,#fbfaf5 0,#f1f7f1 48%,#f7f4ea 100%)!important}
    body.nel9-b2c .head,body.nel9-b2c .top,body.nel9-b2c header{background:linear-gradient(135deg,#06442b 0%,#087243 58%,#b28a32 145%)!important}
    body.nel9-b2c .hero{background:linear-gradient(135deg,#fff3cc,#f0faef)!important;border-color:#ead7a0!important;box-shadow:0 14px 34px rgba(55,92,57,.09)!important}
    body.nel9-b2c .product,body.nel9-b2c .card{box-shadow:0 7px 22px rgba(39,70,45,.055)!important}
    body.nel9-b2c .visual{background:linear-gradient(145deg,#e4f5e7,#fff0c8)!important}
    .nel9-trust{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin:10px 0 2px}
    .nel9-trust div{background:#fff;border:1px solid #e8dfc5;border-radius:13px;padding:10px 7px;text-align:center;font-size:10px;font-weight:850;color:#365542;box-shadow:0 4px 14px rgba(52,72,49,.04)}
    .nel9-trust b{display:block;font-size:16px;margin-bottom:2px}

    body.nel9-b2b{--g:#0e5662;--g2:#187b82;--bg:#eef3f5;--ink:#102b33;--line:#d7e2e5;--cream:#fff0ce;background:linear-gradient(180deg,#edf3f5 0,#f6f8f8 55%,#edf1ef 100%)!important}
    body.nel9-b2b .login,body.nel9-b2b .head,body.nel9-b2b .top,body.nel9-b2b header{background:linear-gradient(135deg,#0a2f3d 0%,#0f5965 56%,#1a8387 100%)!important}
    body.nel9-b2b .panel,body.nel9-b2b .card{border-color:#d4e1e4!important;box-shadow:0 8px 24px rgba(10,47,61,.07)!important}
    body.nel9-b2b .hero{background:linear-gradient(135deg,#fff0ce,#eaf5f5)!important;border-color:#dfd6bf!important;box-shadow:0 14px 32px rgba(10,47,61,.08)!important}
    body.nel9-b2b .visual{background:linear-gradient(145deg,#dff1f1,#fff1d4)!important}
    body.nel9-b2b .badge,body.nel9-b2b .status{background:#dff0f1!important;color:#0c5861!important}
    .nel9-biz-ribbon{margin:10px 0 2px;background:linear-gradient(100deg,#0b3442,#12636d);color:#fff;border-radius:16px;padding:11px 13px;display:flex;justify-content:space-between;gap:10px;align-items:center;box-shadow:0 9px 24px rgba(10,47,61,.14)}
    .nel9-biz-ribbon b{font-size:12px}.nel9-biz-ribbon span{font-size:10px;color:#d6ecee}
    .nel9-biz-ribbon i{font-style:normal;background:#d9ae56;color:#17313a;border-radius:999px;padding:6px 8px;font-size:9px;font-weight:950;white-space:nowrap}

    #nel9-launch{position:fixed;right:14px;bottom:16px;z-index:2147483000;border:0;background:#075b34;color:#fff;height:50px;padding:0 15px;border-radius:999px;box-shadow:0 12px 30px rgba(7,91,52,.28);font-weight:900;display:none;align-items:center;gap:8px;cursor:pointer}
    #nel9-backdrop{position:fixed;inset:0;background:rgba(8,28,17,.45);backdrop-filter:blur(3px);z-index:2147483001;display:none}
    #nel9-drawer{position:fixed;right:0;top:0;bottom:0;width:min(420px,92vw);background:#fff;z-index:2147483002;transform:translateX(105%);transition:transform .22s ease;box-shadow:-20px 0 50px rgba(8,28,17,.20);padding:20px;overflow:auto;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif}
    #nel9-drawer.open{transform:translateX(0)}#nel9-backdrop.open{display:block}.nel9-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:18px}.nel9-headbrand{display:flex;align-items:center;gap:10px}.nel9-headbrand img{width:52px;height:52px;border-radius:14px;object-fit:cover}.nel9-brand{font-size:20px;font-weight:950;color:#075b34;margin:0}.nel9-sub{font-size:12px;color:#66736b;margin:4px 0 0}.nel9-close{border:0;background:#eef6f1;color:#075b34;width:42px;height:42px;border-radius:50%;font-size:20px}.nel9-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.nel9-app{text-decoration:none;color:#17211b;border:1px solid #e3e9e5;background:#fff;border-radius:15px;padding:13px;min-height:78px;display:flex;flex-direction:column;justify-content:center;gap:5px}.nel9-app:hover{background:#f1faf4;border-color:#b9dcc6}.nel9-app span{font-size:22px}.nel9-app b{font-size:13px}.nel9-foot{margin-top:16px;padding:12px;border-radius:14px;background:#f0f8f3;color:#476154;font-size:12px;line-height:1.5}

    .nel9-scan-modal{position:fixed;inset:0;z-index:2147483640;background:rgba(1,17,23,.82);display:none;align-items:flex-end;justify-content:center;padding:12px}.nel9-scan-modal.open{display:flex}.nel9-scan-card{width:min(620px,100%);background:#f7fafb;border-radius:24px;padding:14px;box-shadow:0 24px 70px rgba(0,0,0,.36)}.nel9-scan-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:10px}.nel9-scan-head b{font-size:18px;color:#103641}.nel9-scan-head span{display:block;font-size:11px;color:#718087;margin-top:3px}.nel9-scan-head button{width:38px;height:38px;padding:0;border-radius:50%;background:#e1ecee;color:#174e58}.nel9-video-wrap{position:relative;background:#071b21;border-radius:18px;overflow:hidden;aspect-ratio:4/3;display:grid;place-items:center}.nel9-video-wrap video{width:100%;height:100%;object-fit:cover}.nel9-scan-line{position:absolute;left:12%;right:12%;top:50%;height:2px;background:#f3c85d;box-shadow:0 0 12px #f3c85d;animation:nel9scan 1.8s ease-in-out infinite alternate}@keyframes nel9scan{from{transform:translateY(-70px)}to{transform:translateY(70px)}}.nel9-manual{width:100%;margin-top:10px;border:1px solid #d1dfe2;border-radius:12px;padding:12px;background:#fff}.nel9-scan-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:9px}.nel9-scan-actions button{width:100%;border:0;border-radius:12px;padding:12px;background:#0e5964;color:#fff;font-weight:900}.nel9-scan-actions .nel9-soft{background:#e2eff1;color:#0e5964}.nel9-scan-note{font-size:10px;color:#768489;line-height:1.45;margin-top:8px}
    @media(max-width:640px){#nel9-launch{right:10px;bottom:10px}.nel9-grid{grid-template-columns:repeat(2,1fr)}.nel9-scan-modal{padding:0}.nel9-scan-card{border-radius:22px 22px 0 0;padding-bottom:calc(14px + env(safe-area-inset-bottom))}.nel9-trust{grid-template-columns:repeat(3,1fr)}}
  </style>
  ${adminShell}${scanner}
  <script>(function(){
    var PAGE='${page}',THEME='${theme}',LOGO='${logo}';
    if(document.body)document.body.classList.add('nel9-'+THEME);

    function brandImages(){
      document.querySelectorAll('img.logo,img.headLogo,img.nel-brand-logo').forEach(function(img){img.src=LOGO;img.onerror=null;});
      document.querySelectorAll('.brand').forEach(function(el){
        if(el.querySelector('img.nel9-brandmark'))return;
        var text=el.textContent||'';
        if(text.indexOf('Native Elaneeru')<0)return;
        Array.prototype.slice.call(el.childNodes).forEach(function(n){if(n.nodeType===3)n.nodeValue=n.nodeValue.replace(/^\s*🥥\s*/,'');});
        var img=document.createElement('img');img.src=LOGO;img.alt='Native Elaneeru';img.className='nel9-brandmark';el.insertBefore(img,el.firstChild);el.classList.add('nel9-brand-row');
      });
    }
    brandImages();
    new MutationObserver(brandImages).observe(document.body,{childList:true,subtree:true});

    if(PAGE==='index'&&!document.getElementById('nel9-trust')){
      var hero=document.querySelector('#homePage .hero');
      if(hero){var trust=document.createElement('div');trust.id='nel9-trust';trust.className='nel9-trust';trust.innerHTML='<div><b>🥥</b>Fresh stock</div><div><b>✓</b>Quality checked</div><div><b>🛵</b>Local delivery</div>';hero.insertAdjacentElement('afterend',trust);}
    }
    if(PAGE==='B2B'&&!document.getElementById('nel9-biz-ribbon')){
      var wrap=document.querySelector('#app .wrap');
      if(wrap){var ribbon=document.createElement('div');ribbon.id='nel9-biz-ribbon';ribbon.className='nel9-biz-ribbon';ribbon.innerHTML='<div><b>Native Elaneeru Business Supply</b><span>Negotiated pricing · MOQ ordering · scheduled delivery</span></div><i>B2B</i>';wrap.insertBefore(ribbon,wrap.firstChild);}
    }

    var launch=document.getElementById('nel9-launch'),drawer=document.getElementById('nel9-drawer'),closeBtn=document.getElementById('nel9-close'),backdrop=document.getElementById('nel9-backdrop');
    function openDrawer(){if(!drawer)return;drawer.classList.add('open');backdrop.classList.add('open');drawer.setAttribute('aria-hidden','false');}
    function closeDrawer(){if(!drawer)return;drawer.classList.remove('open');backdrop.classList.remove('open');drawer.setAttribute('aria-hidden','true');}
    if(launch&&drawer){launch.onclick=openDrawer;closeBtn.onclick=closeDrawer;backdrop.onclick=closeDrawer;document.addEventListener('keydown',function(e){if(e.key==='Escape')closeDrawer();});
      var syncAdmin=function(){var app=document.getElementById('app');launch.style.display=(app&&!app.classList.contains('hide'))?'flex':'none';};syncAdmin();var adminApp=document.getElementById('app');if(adminApp)new MutationObserver(syncAdmin).observe(adminApp,{attributes:true,attributeFilter:['class']});}

    if(PAGE==='Driver'){
      var originalScan=typeof window.scan==='function'?window.scan:null;
      var modal=document.getElementById('nel9-scan-modal'),video=document.getElementById('nel9-camera'),status=document.getElementById('nel9-scan-status'),manual=document.getElementById('nel9-manual-code'),fileInput=document.getElementById('nel9-photo-input');
      var activeStop='',stream=null,detector=null,timer=null;
      function setStatus(s){if(status)status.textContent=s;}
      function stopCamera(){if(timer){clearTimeout(timer);timer=null;}if(stream){stream.getTracks().forEach(function(t){t.stop();});stream=null;}if(video)video.srcObject=null;}
      function closeScanner(){stopCamera();if(modal){modal.classList.remove('open');modal.setAttribute('aria-hidden','true');}}
      async function makeDetector(){if(!('BarcodeDetector' in window))return null;try{if(BarcodeDetector.getSupportedFormats){var supported=await BarcodeDetector.getSupportedFormats();var wanted=['code_128','code_39','ean_13','ean_8','upc_a','upc_e','itf','codabar','qr_code'].filter(function(x){return supported.indexOf(x)>=0;});return wanted.length?new BarcodeDetector({formats:wanted}):new BarcodeDetector();}return new BarcodeDetector();}catch(e){try{return new BarcodeDetector();}catch(_){return null;}}}
      async function detectLoop(){if(!stream||!detector||!video)return;try{var codes=await detector.detect(video);if(codes&&codes.length&&codes[0].rawValue){acceptCode(codes[0].rawValue);return;}}catch(e){}timer=setTimeout(detectLoop,280);}
      async function startCamera(){
        setStatus('Requesting camera permission…');
        if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){setStatus('Live camera is not supported here. Tap “Use phone camera”.');return;}
        try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false});video.srcObject=stream;await video.play();detector=await makeDetector();if(detector){setStatus('Camera live · hold barcode inside the frame');detectLoop();}else setStatus('Camera live · automatic decoding unavailable. Use phone camera or manual code.');}
        catch(e){setStatus('Camera permission was blocked. Tap “Use phone camera” or enter the code manually.');}
      }
      function acceptCode(code){code=String(code||'').trim();if(!code)return;var field=document.getElementById('bc_'+activeStop);if(field)field.value=code;if(manual)manual.value=code;closeScanner();if(originalScan)originalScan(activeStop);}
      window.scan=function(id){activeStop=String(id||'');var field=document.getElementById('bc_'+activeStop);if(manual)manual.value=field?field.value:'';modal.classList.add('open');modal.setAttribute('aria-hidden','false');setStatus('Point the camera at the barcode');startCamera();};
      document.getElementById('nel9-scan-close').onclick=closeScanner;
      document.getElementById('nel9-manual-use').onclick=function(){var code=manual.value.trim();if(!code){setStatus('Enter a barcode first.');return;}acceptCode(code);};
      document.getElementById('nel9-photo').onclick=function(){fileInput.click();};
      fileInput.onchange=async function(){var file=fileInput.files&&fileInput.files[0];if(!file)return;detector=detector||await makeDetector();if(!detector){setStatus('Photo captured. Automatic decoding is not supported on this browser; enter the printed code manually.');return;}try{var bmp=await createImageBitmap(file);var codes=await detector.detect(bmp);if(codes&&codes.length&&codes[0].rawValue)acceptCode(codes[0].rawValue);else setStatus('Barcode not found in photo. Try again or enter the code manually.');}catch(e){setStatus('Could not read that photo. Try again or enter the code manually.');}};
      function relabel(){document.querySelectorAll('.scanbox button').forEach(function(b){if((b.getAttribute('onclick')||'').indexOf('scan(')>=0)b.textContent='📷 Scan Barcode';});}
      relabel();new MutationObserver(relabel).observe(document.body,{childList:true,subtree:true});
    }
  })();</script>`;
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
    .addMetaTag('viewport','width=device-width, initial-scale=1, viewport-fit=cover');
  out.append(sharedUxV9_(page));
  return out;
}

// Override older router definitions without changing the stable V8 engine.
doGet = doGetV9_;
