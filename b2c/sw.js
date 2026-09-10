const CACHE='native-elaneeru-b2c-v10.24.0';
const SHELL=[
  './',
  './index.html',
  './login/index.html',
  './config.js',
  './manifest.webmanifest',
  './ui-v108.js',
  './ui-v110.js',
  './ui-v111.js',
  './ui-v112.js',
  './ui-v113.js',
  './separate-links.js',
  './i18n-v102.js',
  './i18n-v104.js',
  './icons/native-elaneeru.svg',
  './icons/icon-192.png',
  './icons/icon-512.png'
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

function navigationFallback(url){
  return url.pathname.includes('/login/') ? './login/index.html' : './index.html';
}

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
    event.respondWith(networkFirst(request,navigationFallback(url)));
    return;
  }

  const critical=/\/(?:config|ui-v108|ui-v110|ui-v111|ui-v112|ui-v113|separate-links|i18n-v102|i18n-v104)\.js$/;
  if(critical.test(url.pathname)||url.pathname.endsWith('/manifest.webmanifest')){
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});

self.addEventListener('message',event=>{
  if(event.data==='SKIP_WAITING')self.skipWaiting();
});
