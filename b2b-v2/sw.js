const CACHE='native-elaneeru-b2b-v2-5';
const FIX='./layout-fix-v5.css?v=5';
const SHELL=['./','./index.html','./manifest.webmanifest','./layout-fix-v5.css'];

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
    await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
    const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of clients){
      try{
        const u=new URL(client.url);
        if(u.pathname.includes('/b2b-v2/')&&!u.searchParams.has('layoutv')){
          u.searchParams.set('layoutv','5');
          await client.navigate(u.href);
        }
      }catch(e){}
    }
  })());
});

function patchedHtmlResponse(response){
  return response.text().then(html=>{
    if(!html.includes('layout-fix-v5.css')){
      html=html.replace('</head>','<link rel="stylesheet" href="'+FIX+'"></head>');
    }
    const headers=new Headers(response.headers);
    headers.set('content-type','text/html; charset=utf-8');
    headers.set('cache-control','no-cache');
    return new Response(html,{status:response.status,statusText:response.statusText,headers});
  });
}

async function navigation(request){
  try{
    const response=await fetch(request,{cache:'no-store'});
    if(response&&response.ok){
      caches.open(CACHE).then(cache=>cache.put(request,response.clone())).catch(()=>{});
      return patchedHtmlResponse(response);
    }
  }catch(e){}
  const cached=(await caches.match(request))||(await caches.match('./index.html'));
  if(cached)return patchedHtmlResponse(cached);
  throw new Error('offline');
}

async function freshOrCached(request){
  try{
    const response=await fetch(request,{cache:'no-store'});
    if(response&&response.ok){
      caches.open(CACHE).then(cache=>cache.put(request,response.clone())).catch(()=>{});
      return response;
    }
  }catch(e){}
  const cached=await caches.match(request);
  if(cached)return cached;
  throw new Error('offline');
}

async function cacheFirst(request){
  const hit=await caches.match(request);
  if(hit)return hit;
  const response=await fetch(request);
  if(response&&response.ok)caches.open(CACHE).then(cache=>cache.put(request,response.clone())).catch(()=>{});
  return response;
}

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;
  if(req.mode==='navigate'||url.pathname.endsWith('/index.html')){
    event.respondWith(navigation(req));
    return;
  }
  if(url.pathname.endsWith('/manifest.webmanifest')||url.pathname.endsWith('/layout-fix-v5.css')){
    event.respondWith(freshOrCached(req));
    return;
  }
  event.respondWith(cacheFirst(req));
});

self.addEventListener('message',event=>{
  if(event.data==='SKIP_WAITING')self.skipWaiting();
});
