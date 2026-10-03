const CACHE='native-elaneeru-business-install-v11.0.5';
const BUILD='1400';
const SHELL=[
  './',
  './index.html',
  './ui-v1201.css?v=1400',
  './reference-v1300.css?v=1400',
  './reference-v1300.js?v=1400',
  './manifest.webmanifest?v=1400',
  './icons/icon-192.png?v=1400',
  './icons/icon-512.png?v=1400',
  '../b2c/images/tender-coconut-v2.webp',
  '../b2b-approved/login-bg.webp',
  '../b2b-approved/app.js?v=1400',
  '../b2b-approved/market-price-fix.js?v=1400',
  '../b2b-approved/ask-ne-fix.js?v=1400'
];

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE)
      .then(cache=>cache.addAll(SHELL))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)));
    await self.clients.claim();
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of windows){
      try{
        const u=new URL(client.url);
        if(!u.pathname.includes('/b2b/') || u.pathname.includes('/b2b-approved/')) continue;
        if(u.searchParams.get('build')===BUILD) continue;
        u.searchParams.set('build',BUILD);
        u.searchParams.set('_r',Date.now().toString());
        await client.navigate(u.href);
      }catch(_){ }
    }
  })());
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

  const freshUi=
    url.pathname.endsWith('/b2b/ui-v1201.css') ||
    url.pathname.endsWith('/b2b/reference-v1300.css') ||
    url.pathname.endsWith('/b2b/reference-v1300.js') ||
    url.pathname.includes('/b2b-approved/') ||
    url.pathname.endsWith('/b2c/images/tender-coconut-v2.webp') ||
    url.pathname.endsWith('/b2b/manifest.webmanifest');

  if(freshUi){
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
      return clients.openWindow('./?build='+BUILD);
    })
  );
});
