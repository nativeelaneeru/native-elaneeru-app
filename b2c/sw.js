const CACHE='native-elaneeru-b2c-v10.60.1';
const SHELL=[
  './','./index.html','./login/index.html','./config.js','./manifest.webmanifest','./idb-v1.js','./order-sync-v1.js',
  './boot-recovery-v10360.js','./image-fallback-v918.js','./product-images-v10380.js','./ui-v108.js','./ui-v110.js','./ui-v111.js','./ui-v112.js','./ui-v113.js','./ui-v125.js','./ui-v127.js',
  './separate-links.js','./cart-visibility-v10320.js','./customer-growth-v10330.js','./subscription-schemes-v10580.js','./ux-polish-v10561.js','./clickable-fix-v10573.js','./catalog-filter-v10574.js','./simple-catalog-v10580.js','./referral-reward-v10340.js','./payment-upi-v10350.js','./update-notifier.js','./install-analytics-v10420.js','./coming-soon-banner-v10430.js','./live-pricing-v10440.js','./base-price-v10450.js','./pricing-hierarchy-v10582.js','./stock-status-v10590.js','./i18n-v102.js','./i18n-v104.js',
  './icons/native-elaneeru.svg','./images/tender-coconut-v2.webp','./images/dehusked-coconut-v2.webp'
];

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE)
      .then(cache=>Promise.all(SHELL.map(url=>cache.add(url).catch(()=>null))))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

function navigationFallback(url){
  return url.pathname.includes('/login/')?'./login/index.html':'./index.html';
}

function fetchAndRefreshCache(request){
  return fetch(request,{cache:'no-store'}).then(response=>{
    if(response&&response.ok){
      const copy=response.clone();
      caches.open(CACHE).then(cache=>cache.put(request,copy)).catch(()=>{});
    }
    return response;
  });
}

async function networkFirst(request,fallback){
  let timer;
  try{
    const network=fetchAndRefreshCache(request);
    const response=await Promise.race([
      network,
      new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('network-timeout')),6500);})
    ]);
    clearTimeout(timer);
    return response;
  }catch(err){
    clearTimeout(timer);
    const cached=await caches.match(request);
    if(cached)return cached;
    if(fallback){
      const page=await caches.match(fallback);
      if(page)return page;
    }
    throw err;
  }
}

async function cacheFirst(request){
  const cached=await caches.match(request);
  if(cached)return cached;
  const response=await fetch(request);
  if(response&&response.ok){
    const copy=response.clone();
    caches.open(CACHE).then(cache=>cache.put(request,copy)).catch(()=>{});
  }
  return response;
}

async function staleWhileRevalidate(request,fallback){
  const cached=await caches.match(request);
  const refresh=fetchAndRefreshCache(request).catch(()=>null);
  if(cached){refresh.catch(()=>{});return cached;}
  const response=await refresh;
  if(response)return response;
  if(fallback){const page=await caches.match(fallback);if(page)return page;}
  throw new Error('offline');
}

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;

  if(request.mode==='navigate'){
    event.respondWith(staleWhileRevalidate(request,navigationFallback(url)));
    return;
  }

  // Pricing/config must be fresh on the first online load so base-price changes
  // cannot be hidden behind an older PWA shell. Other runtime assets keep the
  // faster stale-while-revalidate strategy.
  const pricingCritical=/\/(?:config|ui-v125|live-pricing-v10440|base-price-v10450|pricing-hierarchy-v10582)\.js$/;
  if(pricingCritical.test(url.pathname)){
    event.respondWith(networkFirst(request));
    return;
  }

  const critical=/\/(?:boot-recovery-v10360|image-fallback-v918|product-images-v10380|idb-v1|order-sync-v1|ui-v108|ui-v110|ui-v111|ui-v112|ui-v113|ui-v127|separate-links|cart-visibility-v10320|customer-growth-v10330|subscription-schemes-v10580|ux-polish-v10561|clickable-fix-v10573|catalog-filter-v10574|simple-catalog-v10580|referral-reward-v10340|payment-upi-v10350|update-notifier|install-analytics-v10420|coming-soon-banner-v10430|stock-status-v10590|i18n-v102|i18n-v104)\.js$/;
  if(critical.test(url.pathname)||url.pathname.endsWith('/manifest.webmanifest')){
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});

self.addEventListener('message',event=>{
  if(event.data==='SKIP_WAITING')self.skipWaiting();
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
    for(const c of list){if('focus'in c)return c.focus();}
    return clients.openWindow('./');
  }));
});