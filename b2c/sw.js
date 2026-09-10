const CACHE='native-elaneeru-b2c-v10.29.0';
const SHELL=[
  './','./index.html','./login/index.html','./config.js','./manifest.webmanifest','./idb-v1.js','./order-sync-v1.js',
  './ui-v108.js','./ui-v110.js','./ui-v111.js','./ui-v112.js','./ui-v113.js','./ui-v125.js','./ui-v126.js','./ui-v127.js',
  './separate-links.js','./update-notifier.js','./i18n-v102.js','./i18n-v104.js',
  './icons/native-elaneeru.svg','./icons/icon-192.png','./icons/icon-512.png'
];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>{
    if(self.registration.active){return self.registration.showNotification('Native Elaneeru update ready',{body:'A new version is ready. Open the app and tap Update now.',tag:'native-elaneeru-update',icon:'./icons/icon-192.png',badge:'./icons/icon-192.png',data:{url:'./'}}).catch(()=>{});}
  }))
});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()))});
function navigationFallback(url){return url.pathname.includes('/login/')?'./login/index.html':'./index.html'}
async function networkFirst(request,fallback){try{const response=await fetch(request,{cache:'no-store'});if(response&&response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy)).catch(()=>{})}return response}catch(err){const cached=await caches.match(request);if(cached)return cached;if(fallback){const page=await caches.match(fallback);if(page)return page}throw err}}
async function cacheFirst(request){const cached=await caches.match(request);if(cached)return cached;const response=await fetch(request);if(response&&response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy)).catch(()=>{})}return response}
self.addEventListener('fetch',event=>{const request=event.request;if(request.method!=='GET')return;const url=new URL(request.url);if(url.origin!==self.location.origin)return;if(request.mode==='navigate'){event.respondWith(networkFirst(request,navigationFallback(url)));return}const critical=/\/(?:config|idb-v1|order-sync-v1|ui-v108|ui-v110|ui-v111|ui-v112|ui-v113|ui-v125|ui-v126|ui-v127|separate-links|update-notifier|i18n-v102|i18n-v104)\.js$/;if(critical.test(url.pathname)||url.pathname.endsWith('/manifest.webmanifest')){event.respondWith(networkFirst(request));return}event.respondWith(cacheFirst(request))});
self.addEventListener('message',event=>{if(event.data==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('notificationclick',event=>{event.notification.close();event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{for(const c of list){if('focus'in c)return c.focus()}return clients.openWindow('./')}))});
