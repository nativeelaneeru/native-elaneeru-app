const CACHE='native-elaneeru-v10.4.2';
const SHELL=[
  './index.html',
  './login/index.html',
  './config.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './i18n-v102.js',
  './i18n-v104.js'
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

function injectUx(response){
  if(!response) return Promise.reject(new Error('No cached page available'));
  const type=String(response.headers.get('content-type')||'');
  if(!type.includes('text/html')) return Promise.resolve(response);
  return response.text().then(text=>{
    const scripts=[];
    if(!text.includes('i18n-v102.js')) scripts.push('<script src="./i18n-v102.js"></script>');
    if(!text.includes('i18n-v104.js')) scripts.push('<script src="./i18n-v104.js"></script>');
    if(scripts.length){
      const bodyEnd=text.toLowerCase().lastIndexOf('</body>');
      if(bodyEnd>=0) text=text.slice(0,bodyEnd)+scripts.join('')+text.slice(bodyEnd);
      else text+=scripts.join('');
    }
    const headers=new Headers(response.headers);
    headers.delete('content-length');
    return new Response(text,{status:response.status,statusText:response.statusText,headers});
  });
}

function navigationFallback(url){
  return url.pathname.includes('/login/') ? './login/index.html' : './index.html';
}

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin) return;

  if(event.request.mode==='navigate'){
    event.respondWith(
      fetch(event.request,{cache:'no-store'})
        .then(networkResponse=>{
          if(networkResponse && networkResponse.ok){
            const copy=networkResponse.clone();
            caches.open(CACHE).then(cache=>cache.put(navigationFallback(url),copy)).catch(()=>{});
          }
          return injectUx(networkResponse);
        })
        .catch(()=>caches.match(navigationFallback(url)).then(injectUx))
    );
    return;
  }

  event.respondWith(
    fetch(event.request,{cache:'no-store'})
      .then(networkResponse=>{
        if(networkResponse && networkResponse.ok){
          const copy=networkResponse.clone();
          caches.open(CACHE).then(cache=>cache.put(event.request,copy)).catch(()=>{});
        }
        return networkResponse;
      })
      .catch(()=>caches.match(event.request))
  );
});

self.addEventListener('message',event=>{
  if(event.data==='SKIP_WAITING') self.skipWaiting();
});
