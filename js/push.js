/* Device subscriptions are tied to the signed-in account, never to a family code. */
window.NinhoPush=(()=>{
 const supported=()=>isSecureContext&&'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
 let active=false,busy=false;
 async function registration(){
  const reg=await navigator.serviceWorker.getRegistration();
  if(!reg)throw Error('Reabra o Ninho para atualizar o aplicativo');
  return reg;
 }
 async function current(){return supported()?(await registration()).pushManager.getSubscription():null;}
 async function stored(sub){
  if(!sub||!NinhoCloud.enabled||NINHO_USER.demo)return null;
  const {data,error}=await NinhoCloud.sb.from('push_subscriptions').select('enabled').eq('endpoint',sub.endpoint).maybeSingle();
  if(error)throw error;return data;
 }
 function decode(key){const raw=atob(key.replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(raw,c=>c.charCodeAt(0));}
 async function enable(){
  if(!supported())throw Error('Neste iPhone, adicione o Ninho à Tela de Início e abra pelo ícone. Em outros celulares, use um navegador atualizado.');
  if(NINHO_USER.demo||!NINHO_FAMILY.id)throw Error('Entre na sua conta e família para ativar');
  // Request permission directly from the user's tap, before any network request.
  if(await Notification.requestPermission()!=='granted')throw Error('Permita notificações nas configurações do navegador ou celular');
  const reg=await registration();
  if(!reg.active)throw Error('A atualização está terminando. Feche e abra o Ninho novamente.');
  const response=await fetch(NINHO_CONFIG.supabaseUrl+'/functions/v1/family-push',{cache:'no-store'});
  if(!response.ok)throw Error('Notificações indisponíveis. Tente novamente');
  const {publicKey}=await response.json();
  let sub=await reg.pushManager.getSubscription();
  if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decode(publicKey)});
  const value=sub.toJSON();
  const {error}=await NinhoCloud.sb.from('push_subscriptions').upsert({user_id:NINHO_USER.id,endpoint:value.endpoint,p256dh:value.keys.p256dh,auth:value.keys.auth,enabled:notificationPrefs().family,updated_at:new Date().toISOString()},{onConflict:'endpoint'});
  if(error)throw Error('Não foi possível registrar este celular. Saia da conta anterior neste dispositivo e tente novamente.');
  active=notificationPrefs().family;
 }
 async function disable(){
  const sub=await current();
  if(sub){const {error}=await NinhoCloud.sb.from('push_subscriptions').delete().eq('endpoint',sub.endpoint);if(error)throw error;await sub.unsubscribe();}
  active=false;
 }
 async function preference(enabled){
  const sub=await current();if(!sub)return;
  const {error}=await NinhoCloud.sb.from('push_subscriptions').update({enabled,updated_at:new Date().toISOString()}).eq('endpoint',sub.endpoint);
  if(error)throw error;active=enabled&&!!await stored(sub);
 }
 async function screen(){
  const p=notificationPrefs();
  let registered=false,status='Ainda não ativadas neste celular';
  try {const row=await stored(await current());registered=!!row;active=!!row?.enabled;status=registered?(active?'Ativadas neste celular, mesmo com o Ninho fechado':'Pausadas neste celular'):status;}catch{status='Não foi possível verificar. Tente novamente';}
  if(!supported())status='No iPhone/iPad, adicione à Tela de Início e abra pelo ícone para ativar.';
  else if(Notification.permission==='denied')status='Bloqueadas. Permita notificações nas configurações deste navegador ou celular.';
  openDetail('Notificações',`<div class="member-manage"><div>🏡</div><div><b>Atividade da família</b><small>Tarefas, compras, compromissos e alterações dos membros</small></div><input id="notifFamily" type="checkbox" ${p.family?'checked':''}></div><div class="notification-device"><p><b>Notificações neste celular</b><br>${esc(status)}</p><p>Receba avisos de outras pessoas da sua família com o app fechado. Ao tocar, o Ninho abre na tela correspondente.</p>${registered?'<button class="full" id="disableNinhoPush">Desativar neste celular</button>':'<button class="full" id="enableNinhoPush">Ativar notificações neste celular</button>'}<p class="sub">A permissão é individual por dispositivo. Os avisos podem exibir nomes e títulos na tela bloqueada.</p></div>`);
 }
 function install(){
  document.querySelector('#notificationsBtn').onclick=screen;
  detailBg.addEventListener('click',async e=>{
   if(!['enableNinhoPush','disableNinhoPush'].includes(e.target.id)||busy)return;
   busy=true;e.target.disabled=true;
   try{if(e.target.id==='enableNinhoPush'){await enable();toast('Notificações ativadas ✓');}else{await disable();toast('Notificações desativadas ✓');}await screen();}
   catch(err){toast(err.message||'Não foi possível atualizar notificações');e.target.disabled=false;}
   finally{busy=false;}
  });
  detailBg.addEventListener('change',async e=>{
   if(e.target.id!=='notifFamily')return;
   const enabled=e.target.checked;e.target.disabled=true;
   try{await preference(enabled);}catch{const p=notificationPrefs();p.family=!enabled;localStorage.setItem(notificationKey(),JSON.stringify(p));e.target.checked=!enabled;toast('Não foi possível salvar no celular. Tente novamente');}finally{e.target.disabled=false;}
  });
  const signOut=NinhoCloud.signOut;
  NinhoCloud.signOut=async()=>{await disable();return signOut();};
  document.querySelector('#logoutBtn').onclick=async()=>{try{await NinhoCloud.signOut();location.reload();}catch{toast('Não foi possível sair com segurança. Confira a conexão e tente novamente');}};
  // Only read subscription status; never prompt or resubscribe automatically.
  let lastUser='';
  const timer=setInterval(async()=>{
   if(!NINHO_USER.id||NINHO_USER.demo||!NINHO_FAMILY.id)return;
   if(lastUser!==NINHO_USER.id){lastUser=NINHO_USER.id;try{active=!!(await stored(await current()))?.enabled;}catch{active=false;}}
   const view=new URL(location.href).searchParams.get('view');
   if(['today','tasks','agenda','shopping'].includes(view)){
    document.querySelector(`[data-view="${view}"]`)?.click();
    history.replaceState(null,'',location.pathname);clearInterval(timer);
   }
  },1500);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
 return {enable,disable,preference,screen,isActive:()=>active};
})();
