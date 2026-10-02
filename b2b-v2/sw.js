const CACHE='native-elaneeru-b2b-v2-6';
const SHELL=['./','./index.html','./manifest.webmanifest'];
const INLINE_FIX='<style id="nel-v6-layout-fix">#appShell{width:min(100%,430px)!important;margin:0 auto!important;min-height:100vh!important;min-height:100dvh!important;background:var(--bg,#f5f7f4)!important;position:relative!important;overflow-x:hidden!important}.shell{width:100%!important;max-width:430px!important;margin:0 auto!important}.top .shell{min-height:0!important;background:transparent!important}.top{min-height:0!important}.content{min-height:calc(100vh - 54px)!important;min-height:calc(100dvh - 54px)!important;background:var(--bg,#f5f7f4)!important;padding:10px 11px 92px!important}</style>';

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith('native-elaneeru-b2b-v2-')&&k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
    const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of clients){
      try{
        const u=new URL(client.url);
        if(!u.pathname.includes('/b2b-v2/'))continue;
        u.searchParams.set('build','6');
        u.searchParams.set('_r',Date.now().toString());
        await client.navigate(u.href);
      }catch(e){}
    }
  })());
});

async function patchHtml(response){
  const html=await response.text();
  let out=html;
  if(!out.includes('nel-v6-layout-fix')) out=out.replace('</head>',INLINE_FIX+'</head>');
  out=out.replace('.shell{width:min(100%,430px);margin:auto;background:var(--bg);min-height:100vh}', '#appShell{width:min(100%,430px);margin:auto;background:var(--bg);min-height:100vh;position:relative;overflow-x:hidden}.shell{width:100%;max-width:430px;margin:auto}');
  const headers=new Headers(response.headers);
  headers.set('content-type','text/html; charset=utf-8');
  headers.set('cache-control','no-store, max-age=0');
  return new Response(out,{status:response.status,statusText:response.statusText,headers});
}

async function navigation(request){
  try{
    const r=await fetch(request,{cache:'no-store'});
    if(r&&r.ok){
      const copy=r.clone();
      caches.open(CACHE).then(cache=>cache.put('./index.html',copy)).catch(()=>{});
      return patchHtml(r);
    }
  }catch(e){}
  const cached=await caches.match('./index.html');
  if(cached)return patchHtml(cached);
  throw new Error('offline');
}

async function asset(request){
  try{
    const r=await fetch(request,{cache:'no-store'});
    if(r&&r.ok){caches.open(CACHE).then(cache=>cache.put(request,r.clone())).catch(()=>{});return r;}
  }catch(e){}
  const hit=await caches.match(request);
  if(hit)return hit;
  throw new Error('offline');
}

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const u=new URL(req.url);
  if(u.origin!==self.location.origin)return;
  if(req.mode==='navigate'||u.pathname.endsWith('/index.html')){event.respondWith(navigation(req));return;}
  if(u.pathname.endsWith('/manifest.webmanifest')||u.pathname.endsWith('/sw.js')){event.respondWith(asset(req));return;}
  event.respondWith((async()=>{const hit=await caches.match(req);if(hit)return hit;return asset(req)})());
});

self.addEventListener('message',event=>{if(event.data==='SKIP_WAITING')self.skipWaiting()});
