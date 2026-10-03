const CACHE='native-elaneeru-business-green-v15.0.0';
const BUILD='1500';
const SHELL=['./','./index.html','./manifest.webmanifest?v=1500','./icons/icon-192.png?v=1500','./icons/icon-512.png?v=1500','../icons/native-elaneeru.svg','./payment-upi-v916.js?v=916'];

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

async function staleWhileRevalidate(request,fallback){
  const cached=await caches.match(request);
  const refresh=fetch(request,{cache:'no-store'}).then(response=>{
    if(response&&response.ok){
      const copy=response.clone();
      caches.open(CACHE).then(cache=>cache.put(request,copy)).catch(()=>{});
    }
    return response;
  }).catch(()=>null);

  if(cached){
    refresh.catch(()=>{});
    return cached;
  }

  const fresh=await refresh;
  if(fresh)return fresh;
  if(fallback){
    const page=await caches.match(fallback);
    if(page)return page;
  }
  throw new Error('Navigation unavailable');
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

  const freshUi=
    url.pathname.endsWith('/b2b/ui-v1201.css') ||
    url.pathname.endsWith('/b2b/reference-v1300.css') ||
    url.pathname.endsWith('/b2b/reference-v1300.js') ||
    url.pathname.endsWith('/b2b/base-price-v952.js') ||
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
