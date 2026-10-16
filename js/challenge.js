(()=>{
 if(!window.NINHO_CONFIG?.avatarFeatures||window.NINHO_CONFIG.supabaseUrl!=='https://cspwqboqchwdsknfdakh.supabase.co')return;
 const choices={movie:'🎬 Escolher o filme',dinner:'🍽️ Escolher o jantar',outing:'🌳 Escolher um passeio'};
 let state=null,owner='',family='',busy=false,version=0,loadSeq=0;
 const allowed=()=>!NINHO_USER.demo&&!!NINHO_USER.id&&!!NINHO_FAMILY.id;
 const context=()=>({user:NINHO_USER.id,family:NINHO_FAMILY.id,version});
 const same=c=>allowed()&&c.user===NINHO_USER.id&&c.family===NINHO_FAMILY.id&&c.version===version;
 const entry=document.createElement('button');entry.type='button';entry.className='round challenge-entry hide';entry.id='challengeBtn';entry.setAttribute('aria-label','Conquista da semana');entry.title='Conquista da semana';entry.textContent='🏆';
 document.querySelector('#activityBtn').before(entry);
 const group=document.createElement('div');group.className='settings-group hide';group.innerHTML='<button class="setting-row" data-challenge-open><i>🏆</i><span><b>Conquista da semana</b><small>Pontos das crianças e momentos em família</small></span><em>›</em></button>';
 document.querySelector('#subscriptionBtn').closest('.settings-group').before(group);
 function visible(){entry.classList.toggle('hide',!allowed());group.classList.toggle('hide',!allowed())}
 function clear(){version++;loadSeq++;busy=false;state=null;owner='';family='';visible();if(document.querySelector('#challengePanel')){document.querySelector('#challengePanel').remove();detailBg.classList.remove('open')}}
 async function rpc(name,args){const r=await NinhoCloud.sb.rpc(name,args);if(r.error)throw r.error;return r.data}
 const date=v=>String(v).slice(0,10).split('-').reverse().join('/');
 function renderPanel(){
  const panel=document.querySelector('#challengePanel');if(!panel||!allowed()||owner!==NINHO_USER.id||family!==NINHO_FAMILY.id||!state)return;
  const best=Math.max(0,...state.ranking.map(r=>Number(r.points)));
  panel.innerHTML=`<div class="challenge-hero"><span>🏆</span><h3>Conquista da semana</h3><p>${date(state.week_on)} a ${date(state.ends_on)}</p><small>Segunda a domingo · horário de Brasília</small></div><p class="plus-note">Cada ajuda conta! No fim da semana, quem somar mais pontos escolhe um momento em família. Em caso de empate, todos em primeiro ganham o direito de escolher.</p><div class="challenge-ranking">${state.ranking.map(r=>`<article class="challenge-person ${r.user_id===state.user_id?'challenge-self':''}"><span aria-hidden="true">${best>0&&Number(r.points)===best?'🌟':'🌱'}</span><b>${esc(r.name)}${r.user_id===state.user_id?' · você':''}</b><strong>${r.points} <small>pontos</small></strong></article>`).join('')||'<p class="plus-empty">As crianças da família aparecerão aqui.</p>'}</div><p class="plus-small">Valem os pontos recebidos por tarefas a partir da chegada desta novidade. Comprar roupas não reduz esta pontuação. A semana começa do zero; o saldo da lojinha é preservado. Sem pontos, não há vencedor.</p><h3>Momentos conquistados</h3><div class="plus-list">${state.winners.map(w=>`<article class="plus-record"><b>🏅 ${esc(w.name)} · ${w.points} pontos</b><small>Semana de ${date(w.week_on)}</small>${w.choice?`<span>${choices[w.choice]||'Escolha registrada'}</span><small>${w.confirmed_at?'Combinado confirmado pelo responsável ✓':'Aguardando combinar com um responsável'}</small>${state.adult&&!w.confirmed_at?`<button data-challenge-confirm="${w.user_id}" data-week="${w.week_on}" ${busy?'disabled':''}>Confirmar combinado</button>`:''}`:w.user_id===state.user_id?`<p>Você conquistou uma escolha!</p><div class="challenge-choices">${Object.entries(choices).map(([key,label])=>`<button data-challenge-choice="${key}" data-week="${w.week_on}" ${busy?'disabled':''}>${label}</button>`).join('')}</div>`:'<span>Aguardando a criança escolher</span>'}</article>`).join('')||'<p class="plus-empty">A primeira conquista aparece depois que a semana terminar.</p>'}</div><p class="plus-small">Filme, jantar ou passeio: a escolha é combinada com os responsáveis, conforme as possibilidades da família. Não há compra ou reserva automática.</p><button class="outline" data-challenge-refresh ${busy?'disabled':''}>Atualizar</button>`;
 }
 async function refresh(){
  visible();if(!allowed()){clear();return}if(!document.querySelector('#challengePanel')||busy)return;
  const c=context(),seq=++loadSeq;try{const next=await rpc('ninho_challenge_state',{p_family:c.family});if(!same(c)||seq!==loadSeq)return;state=next;owner=c.user;family=c.family;renderPanel()}catch(e){if(same(c)&&seq===loadSeq){toast(e.message||'Não foi possível carregar a conquista');if(!state&&document.querySelector('#challengePanel'))document.querySelector('#challengePanel').innerHTML='<p role="alert">Não foi possível carregar. Confira sua conexão.</p><button class="full" data-challenge-refresh>Tentar novamente</button>'}}
 }
 function open(){if(!allowed())return;if(busy){toast('Aguarde o registro da escolha');return}state=null;version++;document.querySelector('#familyBg').classList.remove('open');window.NinhoTutorial?.dismiss(false);openDetail('Conquista da semana','<div id="challengePanel"><p role="status">Carregando...</p></div>');refresh()}
 entry.addEventListener('click',open);group.addEventListener('click',open);
 const oldSettings=refreshSettings;refreshSettings=function(){oldSettings();refresh()};
 detailBg.addEventListener('click',async e=>{
  const b=e.target.closest('button');if(!b||!document.querySelector('#challengePanel')||busy)return;
  if(b.hasAttribute('data-challenge-refresh'))return refresh();
  const choice=b.dataset.challengeChoice,child=b.dataset.challengeConfirm;if(!choice&&!child)return;
  const c=context();if(!same(c)||owner!==c.user||family!==c.family)return;
  const ok=await askConfirm(choice?{title:'Registrar sua escolha?',message:choices[choice]+'. Depois vocês combinam os detalhes com um responsável. A escolha não poderá ser trocada nesta rodada.',confirmLabel:'Escolher',danger:false,icon:'🏆'}:{title:'Confirmar o combinado?',message:'Confirme depois de combinar os detalhes com a criança.',confirmLabel:'Confirmar',danger:false,icon:'🤝'});
  if(!ok||!same(c)||busy)return;busy=true;version++;const action=context();renderPanel();
  try{const next=await rpc(choice?'ninho_challenge_choose':'ninho_challenge_confirm',{p_family:action.family,p_week:b.dataset.week,...(choice?{p_choice:choice}:{p_child:child})});if(same(action)){state=next;toast(choice?'Escolha registrada! Combine com seu responsável ✓':'Combinado confirmado ✓')}}catch(error){if(same(action))toast(error.message||'Não foi possível registrar')}finally{if(same(action)){busy=false;renderPanel()}}
 });
 window.NinhoChallenge={clear,refresh};visible();
})();
