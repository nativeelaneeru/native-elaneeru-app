const CACHE='native-elaneeru-b2b-v2-7';
const SHELL=['./','./index.html','./manifest.webmanifest'];

const BRIDGE_HTML=`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#087f40">
<title>Native Elaneeru Business</title>
<link rel="manifest" href="./manifest.webmanifest">
<style>
html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#f8fbf9}
iframe{display:block;width:100%;height:100%;border:0;background:#f8fbf9}
</style>
</head>
<body>
<iframe src="../b2b/?source=b2b-v2&build=1102" title="Native Elaneeru Business" allow="clipboard-read *; clipboard-write *"></iframe>
</body>
</html>`;

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith('native-elaneeru-b2b-v2-')&&k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of windows){
      try{
        const u=new URL(client.url);
        if(!u.pathname.includes('/b2b-v2/'))continue;
        u.searchParams.set('build','7');
        u.searchParams.set('_r',Date.now().toString());
        await client.navigate(u.href);
      }catch(_){ }
    }
  })());
});

function bridgeResponse(){
  return new Response(BRIDGE_HTML,{
    status:200,
    headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store, max-age=0'}
  });
}

async function navigation(request){
  try{
    const response=await fetch(request,{cache:'no-store'});
    if(response&&response.ok){
      const copy=response.clone();
      caches.open(CACHE).then(cache=>cache.put('./index.html',copy)).catch(()=>{});
    }
  }catch(_){ }
  return bridgeResponse();
}

async function asset(request){
  try{
    const r=await fetch(request,{cache:'no-store'});
    if(r&&r.ok){caches.open(CACHE).then(cache=>cache.put(request,r.clone())).catch(()=>{});return r;}
  }catch(_){ }
  const hit=await caches.match(request);
  if(hit)return hit;
  throw new Error('offline');
}

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const u=new URL(req.url);
  if(u.origin!==self.location.origin)return;
  // Do not intercept the unified production iframe or any sibling app route.
  if(!u.pathname.includes('/b2b-v2/'))return;
  if(req.mode==='navigate'||u.pathname.endsWith('/index.html')){
    event.respondWith(navigation(req));
    return;
  }
  if(u.pathname.endsWith('/manifest.webmanifest')||u.pathname.endsWith('/sw.js')){
    event.respondWith(asset(req));
    return;
  }
  event.respondWith((async()=>{const hit=await caches.match(req);if(hit)return hit;return asset(req)})());
});

self.addEventListener('message',event=>{if(event.data==='SKIP_WAITING')self.skipWaiting()});
