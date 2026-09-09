window.NEL_CONFIG = {
  apiUrl: 'https://script.google.com/macros/s/AKfycby4tO2Y1xWbVv1XqzbIYjuTKOt4XRWPzB9MseMC1x-qc8gbNYPvqvG1z6PuCPGZi5O2/exec',
  appVersion: '10.7.0-pwa',
  supportPhone: '7411807675',
  supportWhatsApp: '917411807675',
  parentCompany: 'Sri Govindadri Ventures',
  softLaunch: true,
  loginMode: 'mobile-device-session-optional-pin',
  paymentMode: 'COD',
  deliveryRadiusKm: 3
};

(function(){
  if(window.NEL_V107_BOOTSTRAP)return;
  window.NEL_V107_BOOTSTRAP=true;
  var pending={},seq=0;
  function digits(v){return String(v||'').replace(/\D/g,'').slice(-10)}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]})}
  function money(v){return '₹'+Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:2})}
  function api(){return String((window.NEL_CONFIG&&window.NEL_CONFIG.apiUrl)||'').trim()}
  function sessionMobile(){try{return digits(localStorage.getItem('nel_b2c_session_mobile')||'')}catch(e){return ''}}
  function readProfile(){try{return JSON.parse(localStorage.getItem('nel_profile_v9')||'{}')||{}}catch(e){return {}}}
  function saveProfileLocal(p){
    p=p||{};var m=sessionMobile()||digits(p.mobile);if(m)p.mobile=m;
    try{localStorage.setItem('nel_profile_v9',JSON.stringify(p));localStorage.setItem('nel_b2c_profile',JSON.stringify(p))}catch(e){}
    return p;
  }
  function toast107(m){try{if(typeof window.toast==='function')return window.toast(m)}catch(e){}var t=document.getElementById('toast');if(t){t.textContent=m;t.classList.add('show');setTimeout(function(){t.classList.remove('show')},2600)}}

  window.addEventListener('message',function(ev){
    var d=ev.data||{};if(d.nelBridge!==true||!d.payload)return;
    var p=d.payload||{},id=String(p.requestId||''),h=pending[id];if(!h)return;
    delete pending[id];clearTimeout(h.timer);setTimeout(function(){try{h.frame.remove();h.form.remove()}catch(e){}},20);
    if(p.ok)h.resolve(p.result);else h.reject(new Error(p.error||'Request failed.'));
  });

  function bridgeRpcV107(method,args){
    args=Array.isArray(args)?args:[];
    return new Promise(function(resolve,reject){
      var u=api();if(!u)return reject(new Error('App API is not configured.'));
      var id='v107-'+Date.now()+'-'+(++seq)+'-'+Math.random().toString(36).slice(2,7);
      var frame=document.createElement('iframe'),form=document.createElement('form'),input=document.createElement('input');
      frame.name='nelv107_'+id;frame.style.cssText='display:none!important;width:0;height:0;border:0';
      form.method='POST';form.target=frame.name;form.action=u+(u.indexOf('?')>=0?'&':'?')+'bridge=1&v=107';form.style.display='none';
      input.type='hidden';input.name='payload';input.value=JSON.stringify({method:String(method||''),args:args,requestId:id});form.appendChild(input);
      (document.body||document.documentElement).appendChild(frame);(document.body||document.documentElement).appendChild(form);
      var timer=setTimeout(function(){if(!pending[id])return;delete pending[id];try{frame.remove();form.remove()}catch(e){}reject(new Error('Connection timed out. Please retry.'))},20000);
      pending[id]={resolve:resolve,reject:reject,timer:timer,frame:frame,form:form};form.submit();
    });
  }
  window.NEL_RPC_V107=bridgeRpcV107;

  function setSessionIdentity(){
    var m=sessionMobile();if(!/^[6-9]\d{9}$/.test(m))return '';
    var p=readProfile();if(digits(p.mobile)!==m){p.mobile=m;saveProfileLocal(p)}
    var input=document.getElementById('mobile');if(input){input.value=m;input.readOnly=true;input.setAttribute('aria-label','Logged-in mobile number');input.style.background='#f3f7f4'}
    return m;
  }

  function setTopActive(key){
    var tabs=document.querySelectorAll('.tabs .tab');
    for(var i=0;i<tabs.length;i++)tabs[i].classList.remove('on');
    var ix={home:0,fresh:0,quick:1,offers:2,shop:3,bulk:3}[key];if(ix!==undefined&&tabs[ix])tabs[ix].classList.add('on');
  }

  function patchNavigation(){
    if(window.NEL_V107_NAV)return;window.NEL_V107_NAV=true;
    var oldGo=window.go;if(typeof oldGo==='function'){
      window.go=function(page){var r=oldGo.apply(this,arguments);if(page==='home')setTopActive('home');else if(page==='offers')setTopActive('offers');else if(page==='shop')setTopActive('bulk');else setTopActive(null);return r};
      try{go=window.go}catch(e){}
    }
    var oldFilter=window.filterProducts;if(typeof oldFilter==='function'){
      window.filterProducts=function(mode,btn){var r=oldFilter.apply(this,arguments);if(mode==='quick')setTopActive('quick');else if(mode==='offers')setTopActive('offers');else if(mode==='bulk')setTopActive('bulk');else setTopActive('home');return r};
      try{filterProducts=window.filterProducts}catch(e){}
    }
    document.querySelectorAll('.tabs .tab').forEach(function(b,i){b.addEventListener('click',function(){setTopActive(['home','quick','offers','bulk'][i])},true)});
  }

  function ensureCss(){
    if(document.getElementById('nel107css'))return;var s=document.createElement('style');s.id='nel107css';s.textContent='.nel107-banners{display:grid;grid-auto-flow:column;grid-auto-columns:min(88%,620px);gap:10px;overflow:auto;scroll-snap-type:x mandatory;padding:10px 14px 3px;scrollbar-width:none}.nel107-banners::-webkit-scrollbar{display:none}.nel107-banner{scroll-snap-align:start;min-height:128px;border-radius:20px;padding:18px;background:linear-gradient(135deg,#075b34,#0b8f50);color:#fff;position:relative;overflow:hidden;cursor:pointer;box-shadow:0 8px 24px #073d2422}.nel107-banner:nth-child(2n){background:linear-gradient(135deg,#ffd84d,#ffe892);color:#17331f}.nel107-banner b{display:block;font-size:22px;line-height:1.05;max-width:70%}.nel107-banner small{display:block;margin-top:6px;font-weight:750;max-width:70%}.nel107-banner em{display:inline-block;margin-top:10px;font-style:normal;font-weight:950;font-size:10px;padding:6px 8px;border-radius:8px;background:#ffffff2b}.nel107-banner img{position:absolute;right:5px;bottom:0;width:34%;height:100%;object-fit:contain}.nel107-error{margin:10px 14px;padding:11px;border-radius:12px;background:#fff3f1;color:#9e3429;border:1px solid #efc9c4;font-size:11px}.nel107-pin input{letter-spacing:5px;text-align:center;font-weight:900}.nel107-pin-status{font-size:10px;color:#657069;margin:5px 0 9px}';document.head.appendChild(s)
  }

  function renderBanners(data){
    ensureCss();var banners=data&&Array.isArray(data.banners)?data.banners:[],home=document.getElementById('homePage');if(!home)return;
    var old=document.getElementById('nel107Banners');if(old)old.remove();if(!banners.length)return;
    var rail=document.createElement('div');rail.id='nel107Banners';rail.className='nel107-banners';
    banners.forEach(function(b){var c=document.createElement('div');c.className='nel107-banner';c.innerHTML='<b>'+esc(b.title||'Native Elaneeru')+'</b><small>'+esc(b.subtitle||'')+'</small>'+(b.offerText?'<em>'+esc(b.offerText)+'</em>':'')+(b.imageUrl?'<img src="'+esc(b.imageUrl)+'" alt="">':'');c.onclick=function(){if(String(b.redirectType||'').toUpperCase()==='PRODUCT'&&typeof window.go==='function')window.go('shop');else if(typeof window.go==='function')window.go('offers')};rail.appendChild(c)});
    var promo=home.querySelector('.promo');if(promo)promo.insertAdjacentElement('afterend',rail);else home.insertBefore(rail,home.firstChild);
  }

  function renderReorder(d){
    var host=document.getElementById('favProducts');if(!host)return;var products=[];try{products=(typeof S!=='undefined'&&S.cfg&&Array.isArray(S.cfg.products))?S.cfg.products:[]}catch(e){}
    if(!products.length)return;var stats={};((d&&d.orders)||[]).forEach(function(o,ix){if(['Cancelled','Failed','Rejected'].indexOf(String(o.status||''))>=0)return;(o.items||[]).forEach(function(it){var k=String(it.name||'').trim().toLowerCase();if(!k)return;if(!stats[k])stats[k]={qty:0,recent:ix};stats[k].qty+=Number(it.qty||0);stats[k].recent=Math.min(stats[k].recent,ix)})});
    var ranked=products.map(function(p){var x=stats[String(p.productName||'').trim().toLowerCase()];return x?{p:p,qty:x.qty,recent:x.recent}:null}).filter(Boolean).sort(function(a,b){return b.qty-a.qty||a.recent-b.recent}).slice(0,6);
    if(!ranked.length){host.innerHTML='<div class="empty">No previous orders yet.</div>';return}
    host.innerHTML=ranked.map(function(x){var p=x.p,img=p.imageUrl?'<img src="'+esc(p.imageUrl)+'" alt="">':'🥥',id=String(p.productId||'').replace(/'/g,"\\'");return '<div class="fav"><div class="favVisual">'+img+'</div><div class="favBody"><b>'+esc(p.productName)+'</b><div class="meta">Most ordered · '+x.qty+' pcs</div><div class="price">'+money(p.price)+' / '+esc(p.unit||'pc')+'</div><button class="add" onclick="add(\''+id+'\')">ADD</button></div></div>'}).join('');
  }

  function hydrateProfile(r){
    if(!r||!r.exists||!r.profile)return;var p=r.profile;p.mobile=sessionMobile()||digits(p.mobile);saveProfileLocal(p);
    ['mobile','name','area','pincode','address'].forEach(function(k){var el=document.getElementById(k);if(el)el.value=p[k]||''});
    try{if(typeof S!=='undefined'){S.lat=p.latitude||'';S.lng=p.longitude||''}}catch(e){}
    var g=document.getElementById('gpsText');if(g&&p.latitude&&p.longitude)g.textContent='GPS saved';setSessionIdentity();
  }

  var pinState={hasPin:false};
  function lang(){try{return localStorage.getItem('nel_b2c_language')||'en'}catch(e){return'en'}}
  function pinText(){var d={en:{title:'🔐 Account PIN',none:'Optional 4-digit PIN is not set.',active:'4-digit PIN protection is active.',current:'Current PIN',next:'New 4-digit PIN',confirm:'Confirm new PIN',create:'Create PIN',change:'Change PIN',saved:'PIN saved ✓',mismatch:'PINs do not match.'},kn:{title:'🔐 ಖಾತೆ PIN',none:'ಐಚ್ಛಿಕ 4 ಅಂಕಿಯ PIN ಹೊಂದಿಸಿಲ್ಲ.',active:'4 ಅಂಕಿಯ PIN ರಕ್ಷಣೆ ಸಕ್ರಿಯವಾಗಿದೆ.',current:'ಪ್ರಸ್ತುತ PIN',next:'ಹೊಸ 4 ಅಂಕಿಯ PIN',confirm:'ಹೊಸ PIN ದೃಢೀಕರಿಸಿ',create:'PIN ರಚಿಸಿ',change:'PIN ಬದಲಿಸಿ',saved:'PIN ಉಳಿಸಲಾಗಿದೆ ✓',mismatch:'PINಗಳು ಹೊಂದಿಕೆಯಾಗುತ್ತಿಲ್ಲ.'},te:{title:'🔐 ఖాతా PIN',none:'ఐచ్ఛిక 4 అంకెల PIN సెట్ చేయలేదు.',active:'4 అంకెల PIN రక్షణ యాక్టివ్‌లో ఉంది.',current:'ప్రస్తుత PIN',next:'కొత్త 4 అంకెల PIN',confirm:'కొత్త PIN నిర్ధారించండి',create:'PIN సృష్టించండి',change:'PIN మార్చండి',saved:'PIN సేవ్ అయింది ✓',mismatch:'PINలు సరిపోలడం లేదు.'},hi:{title:'🔐 अकाउंट PIN',none:'वैकल्पिक 4 अंकों का PIN सेट नहीं है।',active:'4 अंकों की PIN सुरक्षा सक्रिय है।',current:'वर्तमान PIN',next:'नया 4 अंकों का PIN',confirm:'नया PIN पुष्टि करें',create:'PIN बनाएं',change:'PIN बदलें',saved:'PIN सेव हो गया ✓',mismatch:'PIN मेल नहीं खाते।'}};return d[lang()]||d.en}
  function renderPinCard(){
    var acct=document.getElementById('accountPage');if(!acct)return;var old=document.getElementById('nel107PinCard');if(old)old.remove();var t=pinText(),card=document.createElement('div');card.id='nel107PinCard';card.className='card form nel107-pin';
    card.innerHTML='<b>'+t.title+'</b><div class="nel107-pin-status">'+(pinState.hasPin?t.active:t.none)+'</div>'+(pinState.hasPin?'<input id="nel107CurrentPin" class="field" inputmode="numeric" maxlength="4" type="password" placeholder="'+t.current+'">':'')+'<input id="nel107NewPin" class="field" inputmode="numeric" maxlength="4" type="password" placeholder="'+t.next+'"><input id="nel107ConfirmPin" class="field" inputmode="numeric" maxlength="4" type="password" placeholder="'+t.confirm+'"><button id="nel107PinBtn" class="btn" type="button">'+(pinState.hasPin?t.change:t.create)+'</button>';
    var legal=acct.querySelector('.card:nth-of-type(2)');if(legal)acct.insertBefore(card,legal);else acct.appendChild(card);
    card.querySelectorAll('input').forEach(function(i){i.addEventListener('input',function(){this.value=digits(this.value).slice(0,4)})});
    document.getElementById('nel107PinBtn').onclick=savePin;
  }
  function refreshPinStatus(){var m=sessionMobile();if(!/^[6-9]\d{9}$/.test(m))return;bridgeRpcV107('getCustomerPinStatusV107',[m]).then(function(r){pinState.hasPin=!!(r&&r.hasPin);renderPinCard()}).catch(function(){renderPinCard()})}
  function savePin(){var t=pinText(),m=sessionMobile(),n=digits((document.getElementById('nel107NewPin')||{}).value).slice(0,4),c=digits((document.getElementById('nel107ConfirmPin')||{}).value).slice(0,4),old=digits((document.getElementById('nel107CurrentPin')||{}).value).slice(0,4);if(n.length!==4)return toast107('PIN must be exactly 4 digits.');if(n!==c)return toast107(t.mismatch);var b=document.getElementById('nel107PinBtn');if(b)b.disabled=true;bridgeRpcV107('setCustomerPinV107',[m,n,old]).then(function(){pinState.hasPin=true;toast107(t.saved);renderPinCard()}).catch(function(e){toast107(e.message)}).finally(function(){if(b)b.disabled=false})}

  function patchCheckoutIdentity(){
    setSessionIdentity();var old=window.placeOrder;if(typeof old==='function'&&!old._nel107){var wrapped=function(){var m=setSessionIdentity();if(m){var p=readProfile();p.mobile=m;saveProfileLocal(p);var el=document.getElementById('mobile');if(el)el.value=m}return old.apply(this,arguments)};wrapped._nel107=true;window.placeOrder=wrapped;try{placeOrder=wrapped}catch(e){}}
  }

  function showDataError(msg){var h=document.getElementById('homeProducts');if(!h)return;h.innerHTML='<div class="nel107-error"><b>Live catalogue connection failed</b><div style="margin-top:4px">'+esc(msg||'Please retry.')+'</div></div>'}
  function bootstrapData(){
    if(location.pathname.indexOf('/login/')>=0)return;var m=setSessionIdentity();if(!/^[6-9]\d{9}$/.test(m))return;
    bridgeRpcV107('getB2CBootstrapV107',[m]).then(function(r){
      if(r&&r.app){try{if(typeof S!=='undefined')S.cfg=r.app}catch(e){};try{if(typeof renderProducts==='function')renderProducts()}catch(e){};renderBanners(r.app)}
      if(r&&r.auth)hydrateProfile(r.auth);if(r&&r.dashboard)renderReorder(r.dashboard);pinState.hasPin=!!(r&&r.pin&&r.pin.hasPin);renderPinCard();
    }).catch(function(e){showDataError(e.message);toast107(e.message)});
  }

  function setupLogin(){
    if(location.pathname.indexOf('/login/')<0)return;var mobile=document.getElementById('mobile'),btn=document.getElementById('btn'),msg=document.getElementById('msg');if(!mobile||!btn)return;
    var pin=document.getElementById('nel107LoginPin');if(!pin){pin=document.createElement('input');pin.id='nel107LoginPin';pin.className='field';pin.type='password';pin.inputMode='numeric';pin.maxLength=4;pin.placeholder='4 digit PIN';pin.style.display='none';pin.style.marginTop='10px';mobile.insertAdjacentElement('afterend',pin);pin.addEventListener('input',function(){this.value=digits(this.value).slice(0,4)})}
    function say(x){if(msg)msg.textContent=x||''}
    function openApp(m,p){try{localStorage.setItem('nel_b2c_session_mobile',m)}catch(e){};p=p||{mobile:m,name:'',area:'',pincode:'',address:'',latitude:'',longitude:''};p.mobile=m;saveProfileLocal(p);location.replace('../index.html')}
    async function login107(){var m=digits(mobile.value);say('');if(!/^[6-9]\d{9}$/.test(m)){say('Enter a valid 10 digit mobile number.');return}btn.disabled=true;btn.textContent='Checking account…';try{var st=await bridgeRpcV107('getCustomerPinStatusV107',[m]);if(st&&st.hasPin){if(pin.style.display==='none'||digits(pin.value).length!==4){pin.style.display='block';pin.focus();say('Enter your 4 digit PIN to continue.');btn.textContent='Login';return}var r=await bridgeRpcV107('customerLoginWithPinV107',[m,digits(pin.value)]);openApp(m,r.profile);return}var r2=await bridgeRpcV107('customerLoginV95',[m]);openApp(m,r2&&r2.exists?r2.profile:{mobile:m,name:'',area:'',pincode:'',address:'',latitude:'',longitude:''})}catch(e){say(e.message||String(e))}finally{btn.disabled=false;if(pin.style.display==='none')btn.textContent='Continue';else btn.textContent='Login'}}
    btn.onclick=login107;
    function enter(e){if(e.key==='Enter'){e.preventDefault();if(e.stopImmediatePropagation)e.stopImmediatePropagation();login107()}}
    mobile.addEventListener('keydown',enter,true);pin.addEventListener('keydown',enter,true);
  }

  window.addEventListener('load',function(){
    // This listener is registered from config.js before the legacy inline init listener.
    // Make V10.7 the active RPC before any customer data call starts.
    window.rpc=bridgeRpcV107;try{rpc=bridgeRpcV107}catch(e){}
    ensureCss();setupLogin();if(location.pathname.indexOf('/login/')<0){setSessionIdentity();patchNavigation();patchCheckoutIdentity();setTimeout(bootstrapData,120);setTimeout(refreshPinStatus,350)}
  });
})();
