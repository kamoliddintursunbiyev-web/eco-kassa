// Ilova qobig'ini keshda saqlaydi: internetsiz ham ochiladi. Yangi versiya bo'lsa, internetdan oladi.
const C='eco-kassa-v19'; const FILES=['./','./index.html','./manifest.json','./icon-192.png','./icon-512.png','./shop.html','./logo.png','./fonts/golos-text-latin-wght-normal.woff2','./fonts/golos-text-latin-ext-wght-normal.woff2','./fonts/golos-text-cyrillic-wght-normal.woff2'];
self.addEventListener('install',e=>{ self.skipWaiting(); e.waitUntil(caches.open(C).then(c=>c.addAll(FILES))); });
self.addEventListener('activate',e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch',e=>{ const u=new URL(e.request.url); if(e.request.method!=='GET'||u.origin!==location.origin) return;
  e.respondWith(fetch(e.request).then(r=>{ const cp=r.clone(); caches.open(C).then(c=>c.put(e.request,cp)); return r; }).catch(()=>caches.match(e.request,{ignoreSearch:true}).then(r=>r||caches.match('./index.html')))); });
