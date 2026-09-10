const CACHE='patkai-shell-v2';
const SHELL=['/','/app','/app/map','/app/report','/app/shelters','/app/alerts'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(async cache=>{for(const url of SHELL){try{await cache.add(url)}catch(e){}}}).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;const u=new URL(event.request.url);if(u.origin!==self.location.origin)return;event.respondWith(fetch(event.request).then(response=>{if(response.ok)caches.open(CACHE).then(c=>c.put(event.request,response.clone()));return response}).catch(()=>caches.match(event.request).then(r=>r||caches.match('/app'))));});
