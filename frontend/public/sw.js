const CACHE='patkai-shell-v4';
const SHELL=['/','/app','/app/map','/app/report','/app/shelters','/app/alerts','/app/settings'];
self.addEventListener('install',event=>event.waitUntil(
  caches.open(CACHE).then(async cache=>{for(const url of SHELL){try{await cache.add(url)}catch(e){}}}).then(()=>self.skipWaiting())
));
self.addEventListener('activate',event=>event.waitUntil(
  caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('patkai-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())
));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const u=new URL(event.request.url);
  if(u.origin!==self.location.origin)return;
  event.respondWith((async()=>{
    try{
      const response=await fetch(event.request);
      if(response.ok){
        const copy=response.clone();
        event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)).catch(()=>{}));
      }
      return response;
    }catch{
      return (await caches.match(event.request))||caches.match('/app');
    }
  })());
});
