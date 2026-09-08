const CACHE='native-elaneeru-v10.2.0';
const SHELL=['./','./index.html','./login/','./login/index.html','./config.js','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./i18n-v102.js'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
async function injectUx(r){
  const type=String(r.headers.get('content-type')||'');
  if(!type.includes('text/html'))return r;
  let text=await r.text();
  if(!text.includes('i18n-v102.js'))text=text.replace('</body>','<script src="./i18n-v102.js"></script></body>');
  const h=new Headers(r.headers);h.delete('content-length');
  return new Response(text,{status:r.status,statusText:r.statusText,headers:h});
}
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);if(u.origin!==location.origin)return;
  if(e.request.mode==='navigate'){
    e.respondWith(fetch(e.request).then(injectUx).then(r=>{const c=r.clone();caches.open(CACHE).then(x=>x.put('./index.html',c));return r}).catch(()=>caches.match('./index.html')));
    return;
  }
  e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
});