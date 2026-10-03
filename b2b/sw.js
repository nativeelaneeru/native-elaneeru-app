const CACHE='native-elaneeru-business-install-v11.0.0';
const SHELL=[
  './',
  './index.html',
  './manifest.webmanifest?v=1100',
  './icons/icon-192.png?v=1100',
  './icons/icon-512.png?v=1100',
  '../icons/native-elaneeru.svg',
  '../b2c/images/tender-coconut-v2.webp',
  '../b2b-approved/style.css?v=1100',
  '../b2b-approved/live.css?v=1100',
  '../b2b-approved/login-bg.webp',
  '../b2b-approved/app.js?v=1100',
  '../b2b-approved/market-price-fix.js?v=1100',
  '../b2b-approved/ask-ne-fix.js?v=1100'
];

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE)
      .then(cache=>cache.addAll(SHELL))
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

async function networkFirst(request,fallback){
  try{
    const response=await fetch(request,{cache:'no-store'});
    if(response&&response.ok){
      const copy=response.clone();
      caches.open(CACHE).then(cache=>cache.put(request,copy)).catch(()=>{});
    }
    return response;
  }catch(err){
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

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;

  if(request.mode==='navigate'){
    event.respondWith(networkFirst(request,'./index.html'));
    return;
  }

  const isApprovedUi=url.pathname.includes('/b2b-approved/') ||
    url.pathname.endsWith('/icons/native-elaneeru.svg') ||
    url.pathname.endsWith('/b2c/images/tender-coconut-v2.webp') ||
    url.pathname.endsWith('/b2b/manifest.webmanifest');

  if(isApprovedUi){
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});

self.addEventListener('message',event=>{
  if(event.data==='SKIP_WAITING')self.skipWaiting();
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  event.waitUntil(
    clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
      for(const c of list){if('focus' in c)return c.focus();}
      return clients.openWindow('./');
    })
  );
});