const C='ninho-mobile-v30',A=['./','./index.html','./privacy.html','./delete-account.html','./css/style.css','./js/app.js','./js/cloud.js','./js/config.js','./js/captcha.js','./js/captcha-auth.js','./manifest.webmanifest','./icons/ninho-icon.svg','./icons/ninho-192.png','./icons/ninho-512.png','./icons/apple-touch-icon.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(A))));
self.addEventListener('activate',e=>e.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==C).map(k=>caches.delete(k))))])));
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 const url=new URL(e.request.url);
 if(url.origin!==location.origin)return;
 e.respondWith(fetch(e.request).then(r=>{
  if(r&&r.ok){const copy=r.clone();caches.open(C).then(c=>c.put(e.request,copy))}
  return r;
 }).catch(()=>caches.match(e.request).then(r=>r||(e.request.mode==='navigate'?caches.match('./index.html'):Response.error()))));
});
