const C='ninho-mobile-v35-close',A=['./','./index.html','./privacy.html','./terms.html','./delete-account.html','./css/style.css','./js/features.js','./js/push.js','./js/app.js','./js/close-family.js','./js/children.js','./js/cloud.js','./js/config.js','./js/captcha.js','./js/captcha-auth.js','./manifest.webmanifest','./icons/ninho-icon.svg','./icons/ninho-192.png','./icons/ninho-512.png','./icons/apple-touch-icon.png'];
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

self.addEventListener('push',event=>{
 let payload={};try{payload=event.data?.json()||{}}catch{}
 const target=new URL(payload.url||'./',self.location.origin);
 const url=target.origin===self.location.origin?target.href:self.location.origin+'/';
 event.waitUntil(self.registration.showNotification(payload.title||'Ninho 🐣',{
  body:payload.body||'Há uma nova atividade na sua família.',
  icon:'/icons/ninho-192.png',badge:'/icons/ninho-192.png',
  tag:payload.tag||'ninho-family-activity',data:{url}
 }));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 const requested=new URL(event.notification.data?.url||'./',self.location.origin);
 const target=requested.origin===self.location.origin?requested.href:self.location.origin+'/';
 event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(async list=>{
  for(const client of list){
   if(new URL(client.url).origin===self.location.origin&&'focus' in client){await client.navigate(target);return client.focus();}
  }
  return clients.openWindow?clients.openWindow(target):undefined;
 }));
});
