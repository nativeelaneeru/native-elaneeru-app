/*******************************************************************************
 * NATIVE ELANEERU V10.4 — IN-PLACE LANGUAGE SWITCH
 * Prevents Apps Script blank screen caused by location.reload().
 ******************************************************************************/
function b2cLanguageInPlaceV104_(){
  return `<script>(function(){
    if(window.NEL104_LANG_INPLACE)return;window.NEL104_LANG_INPLACE=true;
    var K='nel_b2c_language';
    var D={
      en:{fresh:'Fresh',quick:'Quick Delivery',offers:'Offers',bulk:'Bulk Packs',search:'Search tender coconut',all:'ALL',freshToday:'FRESH TODAY',best:'BESTSELLERS',bulkOrder:'BULK ORDER',reorder:'Reorder from favourites',based:'Based on your orders',freshTitle:'Fresh today',viewShop:'View shop',shopFresh:'Shop fresh coconuts',liveCat:'Live catalogue',yourOrders:'Your orders',refresh:'Refresh',account:'Your account',mobile:'Mobile number',name:'Your name',area:'Area',pin:'Pincode',address:'Full delivery address',gps:'Use GPS',save:'Save profile',legal:'🛡 Legal & Food Safety',legalSub:'Business registration, FSSAI, GST, grievance and invoice information',view:'View →',help:'Need help?',call:'Call',whatsapp:'WhatsApp',logout:'Log out',offersYou:'Offers for you',liveOffers:'Live offers from Native Elaneeru',shopOffers:'Shop offers',home:'Home',shop:'Shop',orders:'Orders',accountNav:'Account',welcome:'Welcome to Native Elaneeru',loginDesc:'Enter your mobile number once. This device will keep you signed in until you choose Log out.',continue:'Continue',support:'☎ Support',add:'ADD',tender:'Tender Coconut',dehusked:'Dehusked Coconut',noFav:'No reorder history yet.'},
      kn:{fresh:'ತಾಜಾ',quick:'ತ್ವರಿತ ವಿತರಣೆ',offers:'ಆಫರ್‌ಗಳು',bulk:'ಬಲ್ಕ್ ಪ್ಯಾಕ್‌ಗಳು',search:'ತೆಂಗಿನಕಾಯಿ ಹುಡುಕಿ',all:'ಎಲ್ಲಾ',freshToday:'ಇಂದಿನ ತಾಜಾ',best:'ಅತ್ಯಧಿಕ ಮಾರಾಟ',bulkOrder:'ಬಲ್ಕ್ ಆರ್ಡರ್',reorder:'ಮತ್ತೆ ಆರ್ಡರ್ ಮಾಡಿ',based:'ನಿಮ್ಮ ಹಿಂದಿನ ಆರ್ಡರ್‌ಗಳ ಆಧಾರದಲ್ಲಿ',freshTitle:'ಇಂದು ತಾಜಾ',viewShop:'ಶಾಪ್ ನೋಡಿ',shopFresh:'ತಾಜಾ ತೆಂಗಿನಕಾಯಿ ಖರೀದಿ',liveCat:'ಲೈವ್ ಕ್ಯಾಟಲಾಗ್',yourOrders:'ನಿಮ್ಮ ಆರ್ಡರ್‌ಗಳು',refresh:'ರಿಫ್ರೆಶ್',account:'ನಿಮ್ಮ ಖಾತೆ',mobile:'ಮೊಬೈಲ್ ಸಂಖ್ಯೆ',name:'ನಿಮ್ಮ ಹೆಸರು',area:'ಪ್ರದೇಶ',pin:'ಪಿನ್‌ಕೋಡ್',address:'ಪೂರ್ಣ ವಿತರಣೆ ವಿಳಾಸ',gps:'GPS ಬಳಸಿ',save:'ಪ್ರೊಫೈಲ್ ಉಳಿಸಿ',legal:'🛡 ಕಾನೂನು ಮತ್ತು ಆಹಾರ ಸುರಕ್ಷತೆ',legalSub:'ವ್ಯಾಪಾರ ನೋಂದಣಿ, FSSAI, GST, ದೂರು ಮತ್ತು ಇನ್ವಾಯ್ಸ್ ಮಾಹಿತಿ',view:'ನೋಡಿ →',help:'ಸಹಾಯ ಬೇಕೇ?',call:'ಕರೆ',whatsapp:'ವಾಟ್ಸಾಪ್',logout:'ಲಾಗ್ ಔಟ್',offersYou:'ನಿಮಗಾಗಿ ಆಫರ್‌ಗಳು',liveOffers:'Native Elaneeru ಲೈವ್ ಆಫರ್‌ಗಳು',shopOffers:'ಆಫರ್‌ಗಳನ್ನು ಖರೀದಿ ಮಾಡಿ',home:'ಹೋಮ್',shop:'ಶಾಪ್',orders:'ಆರ್ಡರ್‌ಗಳು',accountNav:'ಖಾತೆ',welcome:'Native Elaneeru ಗೆ ಸ್ವಾಗತ',loginDesc:'ನಿಮ್ಮ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯನ್ನು ಒಮ್ಮೆ ನಮೂದಿಸಿ. ನೀವು ಲಾಗ್ ಔಟ್ ಮಾಡುವವರೆಗೆ ಈ ಸಾಧನ ನಿಮ್ಮ ಲಾಗಿನ್ ಉಳಿಸುತ್ತದೆ.',continue:'ಮುಂದುವರಿಸಿ',support:'☎ ಸಹಾಯ',add:'ಸೇರಿಸಿ',tender:'ಎಳನೀರು ತೆಂಗಿನಕಾಯಿ',dehusked:'ಸಿಪ್ಪೆ ತೆಗೆಯಲಾದ ತೆಂಗಿನಕಾಯಿ',noFav:'ಮರುಆರ್ಡರ್ ಇತಿಹಾಸ ಇನ್ನೂ ಇಲ್ಲ.'},
      te:{fresh:'తాజా',quick:'త్వరిత డెలివరీ',offers:'ఆఫర్లు',bulk:'బల్క్ ప్యాక్స్',search:'కొబ్బరి కోసం వెతకండి',all:'అన్నీ',freshToday:'ఈరోజు తాజా',best:'బెస్ట్ సెల్లర్స్',bulkOrder:'బల్క్ ఆర్డర్',reorder:'మళ్లీ ఆర్డర్ చేయండి',based:'మీ గత ఆర్డర్ల ఆధారంగా',freshTitle:'ఈరోజు తాజా',viewShop:'షాప్ చూడండి',shopFresh:'తాజా కొబ్బరికాయలు కొనండి',liveCat:'లైవ్ కాటలాగ్',yourOrders:'మీ ఆర్డర్లు',refresh:'రిఫ్రెష్',account:'మీ ఖాతా',mobile:'మొబైల్ నంబర్',name:'మీ పేరు',area:'ప్రాంతం',pin:'పిన్‌కోడ్',address:'పూర్తి డెలివరీ చిరునామా',gps:'GPS ఉపయోగించండి',save:'ప్రొఫైల్ సేవ్ చేయండి',legal:'🛡 చట్టపరమైన & ఆహార భద్రత',legalSub:'వ్యాపార నమోదు, FSSAI, GST, ఫిర్యాదు మరియు ఇన్వాయిస్ సమాచారం',view:'చూడండి →',help:'సహాయం కావాలా?',call:'కాల్',whatsapp:'వాట్సాప్',logout:'లాగ్ అవుట్',offersYou:'మీ కోసం ఆఫర్లు',liveOffers:'Native Elaneeru లైవ్ ఆఫర్లు',shopOffers:'ఆఫర్లను కొనండి',home:'హోమ్',shop:'షాప్',orders:'ఆర్డర్లు',accountNav:'ఖాతా',welcome:'Native Elaneeru కు స్వాగతం',loginDesc:'మీ మొబైల్ నంబర్‌ను ఒక్కసారి నమోదు చేయండి. మీరు లాగ్ అవుట్ చేసే వరకు ఈ పరికరం మీ లాగిన్‌ను గుర్తుంచుకుంటుంది.',continue:'కొనసాగించండి',support:'☎ సహాయం',add:'జోడించు',tender:'లేత కొబ్బరి',dehusked:'తొక్క తీసిన కొబ్బరి',noFav:'మళ్లీ ఆర్డర్ చరిత్ర ఇంకా లేదు.'},
      hi:{fresh:'ताज़ा',quick:'त्वरित डिलीवरी',offers:'ऑफ़र',bulk:'बल्क पैक',search:'नारियल खोजें',all:'सभी',freshToday:'आज का ताज़ा',best:'बेस्टसेलर',bulkOrder:'बल्क ऑर्डर',reorder:'फिर से ऑर्डर करें',based:'आपके पिछले ऑर्डर के आधार पर',freshTitle:'आज ताज़ा',viewShop:'शॉप देखें',shopFresh:'ताज़ा नारियल खरीदें',liveCat:'लाइव कैटलॉग',yourOrders:'आपके ऑर्डर',refresh:'रिफ्रेश',account:'आपका खाता',mobile:'मोबाइल नंबर',name:'आपका नाम',area:'क्षेत्र',pin:'पिनकोड',address:'पूरा डिलीवरी पता',gps:'GPS उपयोग करें',save:'प्रोफ़ाइल सेव करें',legal:'🛡 कानूनी और खाद्य सुरक्षा',legalSub:'व्यवसाय पंजीकरण, FSSAI, GST, शिकायत और इनवॉइस जानकारी',view:'देखें →',help:'मदद चाहिए?',call:'कॉल',whatsapp:'व्हाट्सऐप',logout:'लॉग आउट',offersYou:'आपके लिए ऑफ़र',liveOffers:'Native Elaneeru के लाइव ऑफ़र',shopOffers:'ऑफ़र खरीदें',home:'होम',shop:'शॉप',orders:'ऑर्डर',accountNav:'खाता',welcome:'Native Elaneeru में आपका स्वागत है',loginDesc:'अपना मोबाइल नंबर एक बार दर्ज करें। जब तक आप लॉग आउट नहीं करते, यह डिवाइस आपका लॉगिन याद रखेगा।',continue:'जारी रखें',support:'☎ सहायता',add:'जोड़ें',tender:'टेंडर कोकोनट',dehusked:'छिला हुआ नारियल',noFav:'अभी कोई रीऑर्डर इतिहास नहीं है।'}
    };
    function all(s){return Array.prototype.slice.call(document.querySelectorAll(s))}
    function normalize(){
      var rev={};Object.keys(D).forEach(function(l){Object.keys(D[l]).forEach(function(k){rev[D[l][k]]=D.en[k]})});
      all('h1,h2,h3,button,span,b,p,.meta,.pname,.favBody b').forEach(function(el){if(el.closest&&el.closest('#nel102Splash'))return;var v=(el.textContent||'').trim();if(rev[v])el.textContent=rev[v]});
    }
    function apply(code){
      code=D[code]?code:'en';
      try{localStorage.setItem(K,code)}catch(e){}
      normalize();
      if(typeof window.nel102SetLanguage==='function')window.nel102SetLanguage(code);
    }
    function refreshData(code){
      try{if(typeof window.loadCatalogue==='function')window.loadCatalogue()}catch(e){}
      try{if(typeof window.loadCustomer==='function')window.loadCustomer(false)}catch(e){}
      [180,480,950,1600].forEach(function(ms){setTimeout(function(){apply(code)},ms)});
    }
    document.addEventListener('change',function(ev){
      var sel=ev.target;
      if(!sel||sel.id!=='nel102Lang')return;
      ev.preventDefault();ev.stopPropagation();if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();
      var code=sel.value||'en';
      apply(code);refreshData(code);
    },true);
  })();</script>`;
}
function doGetV104_(e){
  var out=doGetV103_(e);
  var isBridge=String(e&&e.parameter&&e.parameter.bridge||'')==='1';
  var p=String(e&&e.parameter&&e.parameter.page||'').toLowerCase();
  if(!isBridge && (p===''||p==='home'||p==='b2c')) out.append(b2cLanguageInPlaceV104_());
  return out;
}
doGet=doGetV104_;
