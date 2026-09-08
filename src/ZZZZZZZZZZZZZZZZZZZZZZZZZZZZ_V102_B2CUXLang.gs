/*******************************************************************************
 * NATIVE ELANEERU V10.2 — B2C UX + LANGUAGE LAYER
 * English / Kannada / Telugu / Hindi
 ******************************************************************************/
function b2cUxLanguageV102_(){
  var logo='';
  try{ logo=b2cBrandLogoV100_()||''; }catch(e){}
  return `<style>
  @keyframes nel102LogoPop{0%{opacity:0;transform:scale(.55) rotate(-12deg)}55%{opacity:1;transform:scale(1.12) rotate(4deg)}75%{transform:scale(.96) rotate(-2deg)}100%{opacity:1;transform:scale(1) rotate(0)}}
  @keyframes nel102SplashOut{to{opacity:0;visibility:hidden;pointer-events:none}}
  @keyframes nel102Glow{0%,100%{box-shadow:0 8px 26px #002b1b22}50%{box-shadow:0 10px 34px #37dc8855}}
  .logo,.loginLogo{animation:nel102LogoPop .9s cubic-bezier(.2,.8,.2,1) both}
  .nel102-splash{position:fixed;inset:0;z-index:20000;background:linear-gradient(150deg,#033d23,#087844 60%,#12a85f);display:flex;align-items:center;justify-content:center;color:#fff;transition:opacity .35s ease}
  .nel102-splash.out{animation:nel102SplashOut .38s ease forwards}
  .nel102-splash-inner{text-align:center;padding:28px}
  .nel102-splash-logo{width:104px;height:104px;border-radius:26px;background:#fff;object-fit:cover;animation:nel102LogoPop 1s cubic-bezier(.2,.8,.2,1) both,nel102Glow 1.6s ease-in-out infinite}
  .nel102-splash-title{font-size:26px;font-weight:950;margin-top:14px}.nel102-splash-sub{font-size:11px;color:#d8eee1;margin-top:5px}
  .brandRow{flex-wrap:wrap}.nel102-lang{margin-left:auto;display:flex;align-items:center;gap:5px}
  .nel102-lang select{appearance:none;-webkit-appearance:none;border:1px solid #ffffff4f;background:#ffffff16;color:#fff;border-radius:11px;padding:8px 26px 8px 9px;font-size:10px;font-weight:900;outline:0;background-image:linear-gradient(45deg,transparent 50%,#fff 50%),linear-gradient(135deg,#fff 50%,transparent 50%);background-position:calc(100% - 12px) 50%,calc(100% - 8px) 50%;background-size:4px 4px,4px 4px;background-repeat:no-repeat}
  .nel102-lang select option{color:#172019;background:#fff}
  .tabs .tab{transition:background .18s ease,color .18s ease,transform .18s ease,box-shadow .18s ease}
  .tabs .tab.on{background:#fff!important;color:#075b34!important;box-shadow:0 9px 24px #002a1930!important;transform:translateY(-1px)}
  .tabs .tab:not(.on){background:#ffffff12!important;color:#dcefe3!important}
  @media(max-width:520px){.support{order:3}.nel102-lang{order:2}.brandRow{gap:7px}.nel102-lang select{max-width:118px}.tabs .tab{min-height:75px}}
  </style>
  <script>(function(){
    if(window.NEL102_READY)return;window.NEL102_READY=true;
    var LANG_KEY='nel_b2c_language';
    var D={
      en:{fresh:'Fresh',quick:'Quick Delivery',offers:'Offers',bulk:'Bulk Packs',search:'Search tender coconut',all:'ALL',freshToday:'FRESH TODAY',best:'BESTSELLERS',bulkOrder:'BULK ORDER',reorder:'Reorder from favourites',based:'Based on your orders',freshTitle:'Fresh today',viewShop:'View shop',shopFresh:'Shop fresh coconuts',liveCat:'Live catalogue',yourOrders:'Your orders',refresh:'Refresh',account:'Your account',mobile:'Mobile number',name:'Your name',area:'Area',pin:'Pincode',address:'Full delivery address',gps:'Use GPS',save:'Save profile',legal:'🛡 Legal & Food Safety',legalSub:'Business registration, FSSAI, GST, grievance and invoice information',view:'View →',help:'Need help?',call:'Call',whatsapp:'WhatsApp',logout:'Log out',offersYou:'Offers for you',liveOffers:'Live offers from Native Elaneeru',shopOffers:'Shop offers',home:'Home',shop:'Shop',orders:'Orders',accountNav:'Account',welcome:'Welcome to Native Elaneeru',loginDesc:'Enter your mobile number once. This device will keep you signed in until you choose Log out.',continue:'Continue',support:'☎ Support',add:'ADD',tender:'Tender Coconut',dehusked:'Dehusked Coconut',noFav:'No reorder history yet.',language:'Language'},
      kn:{fresh:'ತಾಜಾ',quick:'ತ್ವರಿತ ವಿತರಣೆ',offers:'ಆಫರ್‌ಗಳು',bulk:'ಬಲ್ಕ್ ಪ್ಯಾಕ್‌ಗಳು',search:'ತೆಂಗಿನಕಾಯಿ ಹುಡುಕಿ',all:'ಎಲ್ಲಾ',freshToday:'ಇಂದಿನ ತಾಜಾ',best:'ಅತ್ಯಧಿಕ ಮಾರಾಟ',bulkOrder:'ಬಲ್ಕ್ ಆರ್ಡರ್',reorder:'ಮತ್ತೆ ಆರ್ಡರ್ ಮಾಡಿ',based:'ನಿಮ್ಮ ಹಿಂದಿನ ಆರ್ಡರ್‌ಗಳ ಆಧಾರದಲ್ಲಿ',freshTitle:'ಇಂದು ತಾಜಾ',viewShop:'ಶಾಪ್ ನೋಡಿ',shopFresh:'ತಾಜಾ ತೆಂಗಿನಕಾಯಿ ಖರೀದಿ',liveCat:'ಲೈವ್ ಕ್ಯಾಟಲಾಗ್',yourOrders:'ನಿಮ್ಮ ಆರ್ಡರ್‌ಗಳು',refresh:'ರಿಫ್ರೆಶ್',account:'ನಿಮ್ಮ ಖಾತೆ',mobile:'ಮೊಬೈಲ್ ಸಂಖ್ಯೆ',name:'ನಿಮ್ಮ ಹೆಸರು',area:'ಪ್ರದೇಶ',pin:'ಪಿನ್‌ಕೋಡ್',address:'ಪೂರ್ಣ ವಿತರಣೆ ವಿಳಾಸ',gps:'GPS ಬಳಸಿ',save:'ಪ್ರೊಫೈಲ್ ಉಳಿಸಿ',legal:'🛡 ಕಾನೂನು ಮತ್ತು ಆಹಾರ ಸುರಕ್ಷತೆ',legalSub:'ವ್ಯಾಪಾರ ನೋಂದಣಿ, FSSAI, GST, ದೂರು ಮತ್ತು ಇನ್ವಾಯ್ಸ್ ಮಾಹಿತಿ',view:'ನೋಡಿ →',help:'ಸಹಾಯ ಬೇಕೇ?',call:'ಕರೆ',whatsapp:'ವಾಟ್ಸಾಪ್',logout:'ಲಾಗ್ ಔಟ್',offersYou:'ನಿಮಗಾಗಿ ಆಫರ್‌ಗಳು',liveOffers:'Native Elaneeru ಲೈವ್ ಆಫರ್‌ಗಳು',shopOffers:'ಆಫರ್‌ಗಳನ್ನು ಖರೀದಿ ಮಾಡಿ',home:'ಹೋಮ್',shop:'ಶಾಪ್',orders:'ಆರ್ಡರ್‌ಗಳು',accountNav:'ಖಾತೆ',welcome:'Native Elaneeru ಗೆ ಸ್ವಾಗತ',loginDesc:'ನಿಮ್ಮ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯನ್ನು ಒಮ್ಮೆ ನಮೂದಿಸಿ. ನೀವು ಲಾಗ್ ಔಟ್ ಮಾಡುವವರೆಗೆ ಈ ಸಾಧನ ನಿಮ್ಮ ಲಾಗಿನ್ ಉಳಿಸುತ್ತದೆ.',continue:'ಮುಂದುವರಿಸಿ',support:'☎ ಸಹಾಯ',add:'ಸೇರಿಸಿ',tender:'ಎಳನೀರು ತೆಂಗಿನಕಾಯಿ',dehusked:'ಸಿಪ್ಪೆ ತೆಗೆಯಲಾದ ತೆಂಗಿನಕಾಯಿ',noFav:'ಮರುಆರ್ಡರ್ ಇತಿಹಾಸ ಇನ್ನೂ ಇಲ್ಲ.',language:'ಭಾಷೆ'},
      te:{fresh:'తాజా',quick:'త్వరిత డెలివరీ',offers:'ఆఫర్లు',bulk:'బల్క్ ప్యాక్స్',search:'కొబ్బరి కోసం వెతకండి',all:'అన్నీ',freshToday:'ఈరోజు తాజా',best:'బెస్ట్ సెల్లర్స్',bulkOrder:'బల్క్ ఆర్డర్',reorder:'మళ్లీ ఆర్డర్ చేయండి',based:'మీ గత ఆర్డర్ల ఆధారంగా',freshTitle:'ఈరోజు తాజా',viewShop:'షాప్ చూడండి',shopFresh:'తాజా కొబ్బరికాయలు కొనండి',liveCat:'లైవ్ కాటలాగ్',yourOrders:'మీ ఆర్డర్లు',refresh:'రిఫ్రెష్',account:'మీ ఖాతా',mobile:'మొబైల్ నంబర్',name:'మీ పేరు',area:'ప్రాంతం',pin:'పిన్‌కోడ్',address:'పూర్తి డెలివరీ చిరునామా',gps:'GPS ఉపయోగించండి',save:'ప్రొఫైల్ సేవ్ చేయండి',legal:'🛡 చట్టపరమైన & ఆహార భద్రత',legalSub:'వ్యాపార నమోదు, FSSAI, GST, ఫిర్యాదు మరియు ఇన్వాయిస్ సమాచారం',view:'చూడండి →',help:'సహాయం కావాలా?',call:'కాల్',whatsapp:'వాట్సాప్',logout:'లాగ్ అవుట్',offersYou:'మీ కోసం ఆఫర్లు',liveOffers:'Native Elaneeru లైవ్ ఆఫర్లు',shopOffers:'ఆఫర్లను కొనండి',home:'హోమ్',shop:'షాప్',orders:'ఆర్డర్లు',accountNav:'ఖాతా',welcome:'Native Elaneeru కు స్వాగతం',loginDesc:'మీ మొబైల్ నంబర్‌ను ఒక్కసారి నమోదు చేయండి. మీరు లాగ్ అవుట్ చేసే వరకు ఈ పరికరం మీ లాగిన్‌ను గుర్తుంచుకుంటుంది.',continue:'కొనసాగించండి',support:'☎ సహాయం',add:'జోడించు',tender:'లేత కొబ్బరి',dehusked:'తొక్క తీసిన కొబ్బరి',noFav:'మళ్లీ ఆర్డర్ చరిత్ర ఇంకా లేదు.',language:'భాష'},
      hi:{fresh:'ताज़ा',quick:'त्वरित डिलीवरी',offers:'ऑफ़र',bulk:'बल्क पैक',search:'नारियल खोजें',all:'सभी',freshToday:'आज का ताज़ा',best:'बेस्टसेलर',bulkOrder:'बल्क ऑर्डर',reorder:'फिर से ऑर्डर करें',based:'आपके पिछले ऑर्डर के आधार पर',freshTitle:'आज ताज़ा',viewShop:'शॉप देखें',shopFresh:'ताज़ा नारियल खरीदें',liveCat:'लाइव कैटलॉग',yourOrders:'आपके ऑर्डर',refresh:'रिफ्रेश',account:'आपका खाता',mobile:'मोबाइल नंबर',name:'आपका नाम',area:'क्षेत्र',pin:'पिनकोड',address:'पूरा डिलीवरी पता',gps:'GPS उपयोग करें',save:'प्रोफ़ाइल सेव करें',legal:'🛡 कानूनी और खाद्य सुरक्षा',legalSub:'व्यवसाय पंजीकरण, FSSAI, GST, शिकायत और इनवॉइस जानकारी',view:'देखें →',help:'मदद चाहिए?',call:'कॉल',whatsapp:'व्हाट्सऐप',logout:'लॉग आउट',offersYou:'आपके लिए ऑफ़र',liveOffers:'Native Elaneeru के लाइव ऑफ़र',shopOffers:'ऑफ़र खरीदें',home:'होम',shop:'शॉप',orders:'ऑर्डर',accountNav:'खाता',welcome:'Native Elaneeru में आपका स्वागत है',loginDesc:'अपना मोबाइल नंबर एक बार दर्ज करें। जब तक आप लॉग आउट नहीं करते, यह डिवाइस आपका लॉगिन याद रखेगा।',continue:'जारी रखें',support:'☎ सहायता',add:'जोड़ें',tender:'टेंडर कोकोनट',dehusked:'छिला हुआ नारियल',noFav:'अभी कोई रीऑर्डर इतिहास नहीं है।',language:'भाषा'}
    };
    function q(s){return document.querySelector(s)}function qa(s){return Array.prototype.slice.call(document.querySelectorAll(s))}
    function setText(el,txt){if(el&&txt!=null&&el.textContent!==txt)el.textContent=txt}
    function lang(){var x='en';try{x=localStorage.getItem(LANG_KEY)||'en'}catch(e){}return D[x]?x:'en'}
    function replaceExact(root,map){if(!root)return;qa('h1,h2,h3,button,span,b,p,.meta,.pname,.favBody b').forEach(function(el){if(el.closest&&el.closest('#nel102Splash'))return;var v=(el.textContent||'').trim();if(map[v])el.textContent=map[v]})}
    function applyLanguage(code){code=D[code]?code:'en';try{localStorage.setItem(LANG_KEY,code)}catch(e){}document.documentElement.lang=code==='kn'?'kn':code==='te'?'te':code==='hi'?'hi':'en';var t=D[code],en=D.en;
      var tabs=qa('.tabs .tab');if(tabs[0])tabs[0].innerHTML='<b>🥥</b>'+t.fresh;if(tabs[1])tabs[1].innerHTML='<b>⚡</b>'+t.quick;if(tabs[2])tabs[2].innerHTML='<b>🎁</b>'+t.offers;if(tabs[3])tabs[3].innerHTML='<b>📦</b>'+t.bulk;
      var si=q('#searchInput');if(si)si.placeholder=t.search;
      var fs=qa('.filters .filter');if(fs[0])fs[0].textContent='▦ '+t.all;if(fs[1])fs[1].textContent='🌿 '+t.freshToday;if(fs[2])fs[2].textContent='🏷 '+t.offers;if(fs[3])fs[3].textContent='✓ '+t.best;if(fs[4])fs[4].textContent='XL '+t.bulkOrder;
      var nav=qa('.nav button');if(nav[0])nav[0].innerHTML='<b>⌂</b>'+t.home;if(nav[1])nav[1].innerHTML='<b>🥥</b>'+t.shop;if(nav[2])nav[2].innerHTML='<b>▣</b>'+t.orders;if(nav[3])nav[3].innerHTML='<b>◉</b>'+t.accountNav;if(nav[4])nav[4].innerHTML='<b>🎁</b>'+t.offers;
      var lm=q('#loginMobile');if(lm)lm.placeholder=t.mobile;var nm=q('#name');if(nm)nm.placeholder=t.name;var ar=q('#area');if(ar)ar.placeholder=t.area;var pi=q('#pincode');if(pi)pi.placeholder=t.pin;var ad=q('#address');if(ad)ad.placeholder=t.address;
      var lsel=q('#nel102Lang');if(lsel)lsel.value=code;
      var map={};Object.keys(en).forEach(function(k){map[en[k]]=t[k]});replaceExact(document,map);
      window.setTimeout(function(){replaceExact(document,map)},350);window.setTimeout(function(){replaceExact(document,map)},1100);
    }
    window.nel102SetLanguage=applyLanguage;
    function installLang(){var row=q('.brandRow');if(!row||q('#nel102Lang'))return;var wrap=document.createElement('div');wrap.className='nel102-lang';wrap.innerHTML='<select id="nel102Lang" aria-label="Language"><option value="en">EN · English</option><option value="kn">ಕನ್ನಡ</option><option value="te">తెలుగు</option><option value="hi">हिन्दी</option></select>';var support=q('.support');if(support)row.insertBefore(wrap,support);else row.appendChild(wrap);q('#nel102Lang').addEventListener('change',function(){applyLanguage(this.value)});}
    function installActiveTabs(){qa('.tabs .tab').forEach(function(b){b.addEventListener('click',function(){qa('.tabs .tab').forEach(function(x){x.classList.remove('on')});b.classList.add('on')})});}
    function splash(){if(q('#nel102Splash'))return;var d=document.createElement('div');d.id='nel102Splash';d.className='nel102-splash';d.innerHTML='<div class="nel102-splash-inner"><img class="nel102-splash-logo" src="${logo}" alt="Native Elaneeru"><div class="nel102-splash-title">Native Elaneeru</div><div class="nel102-splash-sub">Sri Govindadri Ventures · Farm fresh daily</div></div>';document.body.appendChild(d);setTimeout(function(){d.classList.add('out');setTimeout(function(){if(d.parentNode)d.parentNode.removeChild(d)},450)},1250)}
    function wrapAsync(name){var fn=window[name];if(typeof fn!=='function'||fn._nel102)return;var w=function(){var r=fn.apply(this,arguments);setTimeout(function(){applyLanguage(lang())},250);setTimeout(function(){applyLanguage(lang())},900);return r};w._nel102=true;window[name]=w}
    function boot(){splash();installLang();installActiveTabs();applyLanguage(lang());['go','loadCatalogue','loadCustomer','customerLogin','setFilter'].forEach(wrapAsync);setTimeout(function(){applyLanguage(lang())},800);setTimeout(function(){applyLanguage(lang())},1800)}
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  })();</script>`;
}
function doGetV102_(e){
  var out=doGetV101_(e);
  var isBridge=String(e&&e.parameter&&e.parameter.bridge||'')==='1';
  var p=String(e&&e.parameter&&e.parameter.page||'').toLowerCase();
  if(!isBridge && (p===''||p==='home'||p==='b2c')) out.append(b2cUxLanguageV102_());
  return out;
}
doGet=doGetV102_;
