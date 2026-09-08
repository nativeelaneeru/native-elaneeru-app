const CACHE='native-elaneeru-v10.5.1';
const SHELL=[
  './index.html',
  './login/index.html',
  './config.js',
  './manifest.webmanifest',
  './icons/native-elaneeru.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './i18n-v102.js',
  './i18n-v104.js'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));
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

function enhanceHtml(response){
  if(!response) return Promise.reject(new Error('No cached page available'));
  const type=String(response.headers.get('content-type')||'');
  if(!type.includes('text/html')) return Promise.resolve(response);
  return response.text().then(text=>{
    const additions=[];
    if(!text.includes('i18n-v102.js')) additions.push('<script src="./i18n-v102.js"></script>');
    if(!text.includes('i18n-v104.js')) additions.push('<script src="./i18n-v104.js"></script>');
    additions.push(`<script>document.addEventListener('DOMContentLoaded',function(){var brand='./icons/native-elaneeru.svg';document.querySelectorAll('img.logo,img[src*="icon-192.png"]').forEach(function(img){img.src=brand;img.style.objectFit='contain'});setTimeout(function(){var s=document.querySelector('.nel-pwa-splash');if(s){s.style.pointerEvents='none';var i=s.querySelector('img');if(i){i.src=brand;i.style.objectFit='contain';i.style.animationDuration='.45s'}}},40);setTimeout(function(){var s=document.querySelector('.nel-pwa-splash');if(s){s.classList.add('out');setTimeout(function(){if(s&&s.remove)s.remove()},180)}},620)}, {once:true});</script>`);
    const bodyEnd=text.toLowerCase().lastIndexOf('</body>');
    if(bodyEnd>=0) text=text.slice(0,bodyEnd)+additions.join('')+text.slice(bodyEnd);
    else text+=additions.join('');
    const headers=new Headers(response.headers);
    headers.delete('content-length');
    return new Response(text,{status:response.status,statusText:response.statusText,headers});
  });
}

function fetchAndCache(request,key){
  return fetch(request,{cache:'no-store'}).then(response=>{
    if(response&&response.ok){
      const copy=response.clone();
      caches.open(CACHE).then(cache=>cache.put(key||request,copy)).catch(()=>{});
    }
    return response;
  });
}

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin) return;

  if(event.request.mode==='navigate'){
    event.respondWith((async()=>{
      const key=navigationFallback(url);
      const cached=await caches.match(key);
      if(cached){
        event.waitUntil(fetchAndCache(event.request,key).catch(()=>{}));
        return enhanceHtml(cached);
      }
      const network=await fetchAndCache(event.request,key);
      return enhanceHtml(network);
    })().catch(()=>caches.match(navigationFallback(url)).then(enhanceHtml)));
    return;
  }

  if(url.pathname.endsWith('/config.js')){
    event.respondWith(fetchAndCache(event.request).catch(()=>caches.match(event.request)));
    return;
  }

  event.respondWith((async()=>{
    const cached=await caches.match(event.request);
    if(cached){
      event.waitUntil(fetchAndCache(event.request).catch(()=>{}));
      return cached;
    }
    return fetchAndCache(event.request);
  })());
});

self.addEventListener('message',event=>{
  if(event.data==='SKIP_WAITING') self.skipWaiting();
});
