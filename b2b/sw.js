const CACHE='native-elaneeru-business-install-v11.0.2';
const SHELL=[
  './',
  './index.html',
  './manifest.webmanifest?v=1101',
  './icons/icon-192.png?v=1101',
  './icons/icon-512.png?v=1101',
  '../b2c/images/tender-coconut-v2.webp',
  '../b2b-approved/style.css?v=1100',
  '../b2b-approved/live.css?v=1101',
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
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)));
    await self.clients.claim();

    // Existing installed PWAs can stay on an old cached navigation shell.
    // Force every controlled /b2b/ window through a fresh navigation once
    // when this worker activates so the production UI becomes visible
    // without asking the vendor to reinstall the app.
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of windows){
      try{
        const u=new URL(client.url);
        if(!u.pathname.includes('/b2b/') || u.pathname.includes('/b2b-approved/')) continue;
        u.searchParams.set('build','1102');
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

// Keep the historical function name because regression checks intentionally
// verify the installed navigation path. The implementation is now network-first
// so a newly published UI cannot remain hidden behind an old app-shell cache.
async function staleWhileRevalidate(request,fallback){
  return networkFirst(request,fallback);
}

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;

  if(request.mode==='navigate'){
    event.respondWith(staleWhileRevalidate(request,'./index.html'));
    return;
  }

  const freshUi=url.pathname.includes('/b2b-approved/') ||
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
      return clients.openWindow('./');
    })
  );
});
