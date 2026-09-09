const CACHE='native-elaneeru-v10.20.0';
const SHELL=[
  './index.html','./login/index.html','./config.js','./ui-v110.js','./ui-v111.js','./ui-v112.js','./manifest.webmanifest',
  './icons/native-elaneeru.svg','./icons/icon-192.png','./icons/icon-512.png',
  './i18n-v102.js','./i18n-v104.js','./ui-v108.js'
];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
function fallbackKey(url){return url.pathname.includes('/login/')?'./login/index.html':'./index.html'}
function enhanceHtml(response,isLogin){
  if(!response)return Promise.reject(new Error('No cached page available'));
  const type=String(response.headers.get('content-type')||'');if(!type.includes('text/html'))return Promise.resolve(response);
  if(isLogin)return Promise.resolve(response);
  return response.text().then(text=>{
    const add=[];
    if(!text.includes('i18n-v102.js'))add.push('<script src="./i18n-v102.js"></script>');
    if(!text.includes('i18n-v104.js'))add.push('<script src="./i18n-v104.js"></script>');
    if(!text.includes('ui-v108.js'))add.push('<script src="./ui-v108.js"></script>');
    if(!text.includes('ui-v110.js'))add.push('<script src="./ui-v110.js?v=10160"></script>');
    if(!text.includes('ui-v111.js'))add.push('<script src="./ui-v111.js?v=1011"></script>');
    if(!text.includes('ui-v112.js'))add.push('<script src="./ui-v112.js?v=10160"></script>');
    add.push(`<script>document.addEventListener('DOMContentLoaded',function(){var brand='./icons/native-elaneeru.svg?v=1016';document.querySelectorAll('img.logo,img[src*="icon-192.png"]').forEach(function(img){img.src=brand;img.style.objectFit='contain'});setTimeout(function(){var s=document.querySelector('.nel-pwa-splash');if(s){s.style.pointerEvents='none';var i=s.querySelector('img');if(i){i.src=brand;i.style.objectFit='contain';i.style.animationDuration='.45s'}}},40);setTimeout(function(){var s=document.querySelector('.nel-pwa-splash');if(s){s.classList.add('out');setTimeout(function(){if(s&&s.remove)s.remove()},180)}},620)},{once:true});</script>`);
    if(add.length){const i=text.toLowerCase().lastIndexOf('</body>');text=i>=0?text.slice(0,i)+add.join('')+text.slice(i):text+add.join('')}
    const h=new Headers(response.headers);h.delete('content-length');return new Response(text,{status:response.status,statusText:response.statusText,headers:h});
  });
}
function fetchAndCache(request,key){return fetch(request,{cache:'no-store'}).then(r=>{if(r&&r.ok){const c=r.clone();caches.open(CACHE).then(x=>x.put(key||request,c)).catch(()=>{})}return r})}
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;const url=new URL(event.request.url);if(url.origin!==self.location.origin)return;
  if(event.request.mode==='navigate'){
    event.respondWith((async()=>{const key=fallbackKey(url),isLogin=url.pathname.includes('/login/'),cached=await caches.match(key);if(cached){event.waitUntil(fetchAndCache(event.request,key).catch(()=>{}));return enhanceHtml(cached,isLogin)}return enhanceHtml(await fetchAndCache(event.request,key),isLogin)})().catch(()=>caches.match(fallbackKey(url)).then(r=>enhanceHtml(r,url.pathname.includes('/login/')))));
    return;
  }
  event.respondWith((async()=>{const c=await caches.match(event.request);if(c){event.waitUntil(fetchAndCache(event.request).catch(()=>{}));return c}return fetchAndCache(event.request)})());
});
self.addEventListener('message',event=>{if(event.data==='SKIP_WAITING')self.skipWaiting()});
