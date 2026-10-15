(()=>{
 // This experiment cannot initialize against the original backend.
 if(window.NINHO_CONFIG?.avatarExperiment!==true||window.NINHO_CONFIG?.supabaseUrl!=='https://mqpjujirwooqzzirzwrr.supabase.co')return;
 let state=null,owner='',family='',tab='owned',slot='top',busy=false,loading=null;
 const draw=window.NinhoAvatarArt.draw;
 const valid=()=>!NINHO_USER.demo&&NINHO_USER.id&&NINHO_FAMILY.id;
 const current=()=>valid()&&owner===NINHO_USER.id&&family===NINHO_FAMILY.id;
 const context=()=>({user:NINHO_USER.id,family:NINHO_FAMILY.id});
 const unchanged=c=>valid()&&c.user===NINHO_USER.id&&c.family===NINHO_FAMILY.id;
 const entry=document.createElement('button');entry.type='button';entry.className='avatar-entry';entry.id='avatarEntry';entry.innerHTML='<span class="avatar-entry-picture"></span><span><small>SEU CANTINHO</small><b>Meu avatar</b><span id="avatarEntryPoints">Conclua tarefas e conquiste seu estilo</span></span><span class="avatar-entry-chevron">›</span>';
 document.querySelector('#today').prepend(entry);
 const settings=document.createElement('button');settings.type='button';settings.className='setting-row';settings.innerHTML='<i>✨</i><span><b>Meu avatar e pontos</b><small>Guarda-roupa e lojinha da família</small></span><em>›</em>';
 document.querySelector('#tutorialBtn').before(settings);
 const clear=()=>{window.NinhoPointEffects?.clear();state=null;owner='';family='';entry.classList.add('hide');entry.querySelector('.avatar-entry-picture').innerHTML='';const closet=document.querySelector('#avatarCloset');if(closet)closet.innerHTML=''};
 async function rpc(name,args){const r=await NinhoCloud.sb.rpc(name,args);if(r.error)throw r.error;return r.data}
 function setState(next,c){if(!unchanged(c))return false;const previous=current()?state:null;state=next;owner=c.user;family=c.family;entry.classList.remove('hide');entry.querySelector('.avatar-entry-picture').innerHTML=draw(state);document.querySelector('#avatarEntryPoints').textContent=`${state.balance} ${state.balance===1?'ponto':'pontos'} · ${state.mode==='plus'?'bônus 2×':'1 ponto por tarefa'}`;render();requestAnimationFrame(()=>{if(unchanged(c))window.NinhoPointEffects?.play(previous,next)});return true}
 async function refresh(){
  if(!valid()){clear();return null}
  const c=context();if(loading&&loading.user===c.user&&loading.family===c.family)return loading.promise;
  const request={...c};request.promise=(async()=>{try{const next=await rpc('qa_avatar_state',{p_family:c.family});if(setState(next,c)&&document.querySelector('#avatarCloset'))renderCloset();return next}catch(e){if(unchanged(c)){clear();entry.classList.remove('hide');document.querySelector('#avatarEntryPoints').textContent='Toque para tentar carregar seu avatar'}return null}finally{if(loading===request)loading=null}})();loading=request;return request.promise;
 }
 function member(m){if(!current()||!state)return null;const avatar=state.members.find(x=>x.id===m?.id);return avatar?`<span class="avatar avatar-person">${draw(avatar)}</span>`:null}
 const pointLabel=n=>`${n} ${n===1?'ponto':'pontos'}`;
 function renderCloset(){
  if(!current()||!state||!document.querySelector('#avatarCloset'))return;
  const items=state.catalog.filter(c=>c.slot===slot&&(tab==='shop'||c.owned));
  document.querySelector('#avatarCloset').innerHTML=`<div class="avatar-hero"><div class="avatar-hero-picture">${draw(state)}</div><div><span class="avatar-kicker">DO SEU JEITO</span><h3>Pequenas tarefas.<br>Grandes conquistas.</h3><div class="avatar-balance">✦ ${pointLabel(state.balance)}</div><p>${pointLabel(state.earned)} conquistados ao todo</p></div></div>
  <p class="avatar-rules">${state.mode==='plus'?'Bônus Ninho+ simulado: 2 pontos':'Gratuito: 1 ponto'} por tarefa, uma única vez, para o responsável pela tarefa. Sem responsável definido, ganha quem concluir.</p>
  <div class="avatar-skin"><b>Tom de pele</b>${['light','medium','deep'].map((s,i)=>`<button type="button" data-avatar-skin="${s}" aria-label="Tom ${['claro','médio','escuro'][i]}" aria-pressed="${state.skin===s}" class="skin-${s} ${state.skin===s?'selected':''}" ${busy?'disabled':''}></button>`).join('')}</div>
  <div class="avatar-tabs" role="group" aria-label="Guarda-roupa ou lojinha"><button type="button" data-avatar-tab="owned" aria-pressed="${tab==='owned'}" class="${tab==='owned'?'active':''}">Meu guarda-roupa</button><button type="button" data-avatar-tab="shop" aria-pressed="${tab==='shop'}" class="${tab==='shop'?'active':''}">Lojinha ✦</button></div>
  <div class="avatar-filters" role="group" aria-label="Tipo de item">${[['top','Roupas'],['hair','Cabelos'],['accessory','Acessórios']].map(([s,l])=>`<button type="button" data-avatar-slot="${s}" aria-pressed="${slot===s}" class="${slot===s?'active':''}">${l}</button>`).join('')}</div>
  <div class="avatar-items">${items.map(item=>{const equipped=state.equipped[item.slot]===item.id;const preview={skin:state.skin,equipped:{...state.equipped,[item.slot]:item.id}};const afford=state.balance>=item.price;return `<article class="avatar-item"><div class="avatar-item-picture">${draw(preview)}</div><b>${esc(item.name)}</b><small>${item.owned?'Já é seu':pointLabel(item.price)}</small><button type="button" class="${equipped?'wearing':''}" data-avatar-${item.owned?'equip':'buy'}="${esc(item.id)}" ${busy||equipped||(!item.owned&&!afford)?'disabled':''}>${equipped?'Usando ✓':item.owned?'Vestir':afford?'Trocar por '+pointLabel(item.price):'Faltam '+pointLabel(item.price-state.balance)}</button></article>`}).join('')||'<p class="avatar-empty">Seu próximo estilo está na lojinha. Conclua tarefas para conquistar pontos!</p>'}</div>
  <div class="avatar-family"><b>Nosso Ninho</b><div>${state.members.map(m=>`<span>${draw(m)}<small>${esc(m.name)}</small></span>`).join('')}</div></div>
  ${state.can_simulate?`<details class="avatar-simulation"><summary>Experimentar o bônus Ninho+</summary><p>Somente neste ambiente de teste. Não muda a assinatura e não gera cobrança. O bônus vale para novas conclusões de toda a família.</p><div><button type="button" data-avatar-plan="free" ${busy||state.mode==='free'?'disabled':''}>Gratuito · 1 ponto</button><button type="button" data-avatar-plan="plus" ${busy||state.mode==='plus'?'disabled':''}>Ninho+ · 2 pontos</button></div></details>`:''}
  <p class="avatar-footnote">Roupas conquistadas continuam suas ao trocar de plano. Pontos são virtuais, sem valor em dinheiro.</p>`;
 }
 async function open(){
  if(!valid())return;tab='owned';slot='top';document.querySelector('#familyBg').classList.remove('open');
  window.NinhoTutorial?.dismiss(false);openDetail('Meu avatar e pontos','<div id="avatarCloset"><p role="status">Preparando seu cantinho...</p></div>');
  const next=await refresh();if(!next&&document.querySelector('#avatarCloset'))document.querySelector('#avatarCloset').innerHTML='<p role="alert">Não foi possível carregar o avatar. Confira sua conexão e tente novamente.</p><button class="full" id="avatarRetry">Tentar novamente</button>';
 }
 entry.onclick=open;settings.onclick=open;
 detailBg.addEventListener('click',async e=>{
  const b=e.target.closest('button');if(!b||!document.querySelector('#avatarCloset'))return;
  if(b.id==='avatarRetry'){await open();return}
  if(b.dataset.avatarTab){tab=b.dataset.avatarTab;renderCloset();return}
  if(b.dataset.avatarSlot){slot=b.dataset.avatarSlot;renderCloset();return}
  if(busy||!current()||!state)return;
  let name,args;const c=context();
  if(b.dataset.avatarBuy){window.NinhoPointEffects?.remember(b);const item=state.catalog.find(i=>i.id===b.dataset.avatarBuy);if(!item)return;const ok=await askConfirm({title:'Trocar seus pontos?',message:`${item.name} custa ${pointLabel(item.price)} e ficará no seu guarda-roupa.`,confirmLabel:'Trocar pontos',icon:'✦',danger:false});if(!ok||!unchanged(c))return;name='qa_avatar_buy';args={p_item:item.id}}
  else if(b.dataset.avatarEquip){name='qa_avatar_equip';args={p_item:b.dataset.avatarEquip}}
  else if(b.dataset.avatarSkin){name='qa_avatar_skin';args={p_skin:b.dataset.avatarSkin}}
  else if(b.dataset.avatarPlan){name='qa_avatar_simulate_plan';args={p_mode:b.dataset.avatarPlan}}
  else return;
  busy=true;renderCloset();
  try{const next=await rpc(name,{p_family:c.family,...args});if(setState(next,c))toast(name==='qa_avatar_buy'?'Item guardado! Agora você pode vestir ✓':name==='qa_avatar_simulate_plan'?'Simulação atualizada, sem cobrança ✓':'Avatar atualizado ✓')}
  catch(err){if(unchanged(c))toast(err.message||'Não foi possível atualizar seu avatar')}
  finally{busy=false;if(unchanged(c))renderCloset()}
 });
 document.addEventListener('click',e=>{const button=e.target.closest?.('#completeTaskBtn,button[onclick^="task("]');if(button)window.NinhoPointEffects?.remember(button)},true);
 window.NinhoAvatar={refresh,clear,member};refresh();
})();
