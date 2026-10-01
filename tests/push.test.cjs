const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
test('push displays encrypted payload and prevents navigation outside Ninho',async()=>{
 const handlers={},shown=[];
 const context={URL,location:{origin:'https://ninho.example'},self:{location:{origin:'https://ninho.example'},addEventListener:(name,fn)=>handlers[name]=fn,registration:{showNotification:async(...args)=>shown.push(args)}},clients:{},caches:{}};
 vm.runInNewContext(fs.readFileSync('sw.js','utf8'),context);
 let promise;
 handlers.push({data:{json:()=>({title:'Ninho',body:'Miguel concluiu a tarefa',url:'https://other.example'})},waitUntil:p=>promise=p});
 await promise;
 assert.equal(shown[0][1].body,'Miguel concluiu a tarefa');
 assert.equal(shown[0][1].data.url,'https://ninho.example/');
 handlers.push({data:{json:()=>{throw Error('invalid');}},waitUntil:p=>promise=p});
 await promise;assert.equal(shown[1][0],'Ninho 🐣');
});
test('notification click opens the matching screen in an existing window',async()=>{
 const handlers={},calls=[];
 const context={URL,location:{origin:'https://ninho.example'},self:{location:{origin:'https://ninho.example'},addEventListener:(name,fn)=>handlers[name]=fn},clients:{matchAll:async()=>[{url:'https://ninho.example/',navigate:async u=>calls.push(u),focus:async()=>calls.push('focus')}]},caches:{}};
 vm.runInNewContext(fs.readFileSync('sw.js','utf8'),context);
 let promise;handlers.notificationclick({notification:{close:()=>{},data:{url:'/?view=tasks'}},waitUntil:p=>promise=p});
 await promise;assert.deepEqual(calls,['https://ninho.example/?view=tasks','focus']);
});
test('permission tap registers account subscription and sign out removes it first',async()=>{
 const listeners={},calls=[];
 let row=null;
 const sub={endpoint:'https://fcm.googleapis.com/fcm/send/test',toJSON:()=>({endpoint:sub.endpoint,keys:{p256dh:'k',auth:'a'}}),unsubscribe:async()=>calls.push('unsubscribe')};
 const table={select:()=>table,eq:()=>table,maybeSingle:async()=>({data:row}),upsert:async value=>{row=value;calls.push('register:'+value.user_id);return {};},delete:()=>{calls.push('delete');return table;},then:resolve=>resolve({}),update:()=>table};
 const document={readyState:'complete',querySelector:()=>({})};
 const ctx={window:{},document,isSecureContext:true,Notification:{requestPermission:async()=>{calls.push('permission');return 'granted';}},PushManager:{},navigator:{serviceWorker:{getRegistration:async()=>({active:true,pushManager:{getSubscription:async()=>null,subscribe:async()=>sub}})}},NINHO_USER:{id:'user-1'},NINHO_FAMILY:{id:'family-1'},NINHO_CONFIG:{supabaseUrl:'https://backend.example'},NinhoCloud:{enabled:true,sb:{from:()=>table},signOut:async()=>calls.push('signout')},notificationPrefs:()=>({family:true}),detailBg:{addEventListener:(n,fn)=>listeners[n]=fn},setInterval:()=>1,fetch:async()=>({ok:true,json:async()=>({publicKey:'AAAA'})}),atob,Uint8Array,URL,location:{href:'https://ninho.example',pathname:'/'}};
 ctx.window=ctx;vm.runInNewContext(fs.readFileSync('js/push.js','utf8'),ctx);
 await ctx.NinhoPush.enable();assert.equal(calls[0],'permission');assert.equal(row.user_id,'user-1');assert.equal(ctx.NinhoPush.isActive(),true);
 ctx.navigator.serviceWorker.getRegistration=async()=>({pushManager:{getSubscription:async()=>sub}});
 await ctx.NinhoCloud.signOut();assert.deepEqual(calls.slice(-3),['delete','unsubscribe','signout']);
});
