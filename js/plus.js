(()=>{
 if(!window.NINHO_CONFIG?.avatarExperiment||window.NINHO_CONFIG.supabaseUrl!=='https://mqpjujirwooqzzirzwrr.supabase.co')return;
 const {cents,money,editMoney}=window.NinhoPlusUtils;
 const categories={groceries:'Mercado',housing:'Casa',transport:'Transporte',health:'Saúde',leisure:'Lazer',other:'Outros'};
 const frequencies={daily:'Todos os dias',weekly:'Toda semana',monthly:'Todo mês'};
 let state=null,identity='',family='',page='plans',month=iso().slice(0,7),busy=false,loading=null;
 const adult=()=>!NINHO_USER.demo&&NINHO_USER.id&&NINHO_FAMILY.id&&canManage();
 const context=()=>({user:NINHO_USER.id,family:NINHO_FAMILY.id});
 const unchanged=c=>adult()&&c.user===NINHO_USER.id&&c.family===NINHO_FAMILY.id;
 const current=()=>adult()&&identity===NINHO_USER.id&&family===NINHO_FAMILY.id;
 const group=document.createElement('div');group.className='settings-group hide';group.innerHTML='<span class="settings-label">NINHO+ · TESTE</span><button class="setting-row" data-plus-open="routines"><i>🔁</i><span><b>Rotinas recorrentes</b><small>Tarefas que nascem automaticamente</small></span><em>›</em></button><button class="setting-row" data-plus-open="finance"><i>💰</i><span><b>Finanças da casa</b><small>Gastos do mês e metas de economia</small></span><em>›</em></button><button class="setting-row" data-plus-open="plans"><i>👥</i><span><b>Plano e integrantes</b><small>Simular benefícios sem cobrança</small></span><em>›</em></button>';
 document.querySelector('#subscriptionBtn').closest('.settings-group').before(group);
 const oldSettings=refreshSettings;refreshSettings=function(){oldSettings();if(adult()){document.querySelector('#planName').textContent='Ninho+ em teste';document.querySelector('#planStatus').textContent='Ver plano simulado e benefícios'}group.classList.toggle('hide',!adult());if(!adult())clear();else if(detailBg.classList.contains('open')&&document.querySelector('#plusPanel')&&!document.querySelector('[data-plus-form]')&&!busy)refresh()};
 function clear(){state=null;identity='';family='';const panel=document.querySelector('#plusPanel');if(panel){panel.remove();detailBg.classList.remove('open')}}
 async function rpc(name,args){const r=await NinhoCloud.sb.rpc(name,args);if(r.error)throw r.error;return r.data}
 async function refresh(force=false){
  if(!adult()){clear();return null}const c=context();if(loading){await loading;if(!unchanged(c))return null;if(!force&&current()&&state?.month?.slice(0,7)===month)return state;return refresh(force)}
  const requestedMonth=month;
  loading=(async()=>{try{const result=await rpc('qa_plus_state',{p_family:c.family,p_month:requestedMonth+'-01'});if(!unchanged(c)||month!==requestedMonth)return null;if(!result.adult){clear();return null}state=result;identity=c.user;family=c.family;if(document.querySelector('#plusPanel'))renderPanel();return state}catch(e){if(unchanged(c))toast(e.message||'Não foi possível carregar o Ninho+');return null}finally{loading=null}})();return loading;
 }
 function note(){return state.mode==='plus'?'<p class="plus-note">Ninho+ simulado ativo · sem cobrança.</p>':'<p class="plus-note">Ative o Ninho+ simulado em Plano e integrantes para criar ou alterar estes registros. O histórico continua disponível.</p>'}
 function renderPanel(){
  const panel=document.querySelector('#plusPanel');if(!panel||!current()||!state)return;
  const enabled=state.mode==='plus',disabled=enabled&&!busy?'':'disabled';
  if(page==='plans'){
   panel.innerHTML=`<div class="plus-heading"><span>UMA FAMÍLIA, MAIS POSSIBILIDADES</span><h3>Experimente o Ninho+</h3><p>Esta é uma simulação no ambiente de teste. Nenhuma cobrança é realizada.</p></div><div class="plus-capacity"><b>${state.member_count} de ${state.member_limit}</b><span>integrantes no plano ${enabled?'Ninho+':'gratuito'} simulado</span></div><ul class="plus-benefits"><li>🔁 Rotinas diárias, semanais e mensais</li><li>💰 Gastos por categoria e metas da casa</li><li>✨ 2 pontos por tarefa para toda a família</li><li>👥 Até 12 integrantes (gratuito: 4)</li></ul>${state.member_count>state.member_limit?'<p class="plus-note">Sua família continua conectada. Novas entradas ficam bloqueadas enquanto o número de membros estiver acima do limite do plano.</p>':''}${state.can_simulate?`<div class="plus-plan-actions"><button class="outline" data-plus-plan="free" ${busy||!enabled?'disabled':''}>Simular gratuito</button><button class="full" data-plus-plan="plus" ${busy||enabled?'disabled':''}>Simular Ninho+</button></div>`:'<p class="plus-note">Peça ao Admin para trocar o plano simulado.</p>'}<p class="plus-small">Limites provisórios para avaliação. Nenhum membro é removido ao voltar ao gratuito; roupas, pontos e histórico financeiro são preservados.</p>`;
  }else if(page==='routines'){
   panel.innerHTML=`${note()}<button class="full" data-plus-new="routine" ${disabled}>＋ Nova rotina</button><p class="plus-small">As tarefas são geradas automaticamente a cada 10 minutos, no horário de Brasília. Uma rotina iniciada hoje já gera a primeira tarefa.</p><div class="plus-list">${state.routines.map(r=>`<article class="plus-record"><b>${esc(r.title)}</b><span>${frequencies[r.frequency]} · ${esc(data.members.find(m=>m.id===r.assignee_id)?.name||'Sem responsável')}</span><small>${!enabled?'Suspensa pelo plano':r.active?'Próxima: '+formatDate(r.next_on):'Pausada'}</small><div><button data-plus-edit-routine="${r.id}" ${disabled}>Editar</button><button data-plus-toggle="${r.id}" ${disabled}>${r.active?'Pausar':'Retomar'}</button></div></article>`).join('')||'<p class="plus-empty">Que tal começar com regar as plantas ou organizar os brinquedos?</p>'}</div>`;
  }else{
   const expenses=state.expenses,total=expenses.reduce((n,e)=>n+e.amount_cents,0);
   panel.innerHTML=`${note()}<label class="plus-month">Mês dos gastos<input type="month" id="plusMonth" value="${month}" required></label><div class="plus-total"><span>GASTOS DO MÊS</span><b>${money(total)}</b></div><div class="plus-categories">${Object.entries(categories).map(([key,label])=>{const value=expenses.filter(e=>e.category===key).reduce((n,e)=>n+e.amount_cents,0);return value?`<div><span>${label}</span><b>${money(value)}</b><progress max="${Math.max(1,total)}" value="${value}" aria-label="${label}"></progress></div>`:''}).join('')}</div><button class="full" data-plus-new="expense" ${disabled}>＋ Registrar gasto</button><div class="plus-list">${expenses.map(e=>`<article class="plus-record"><b>${esc(e.title)} · ${money(e.amount_cents)}</b><span>${categories[e.category]} · ${formatDate(e.spent_on)}</span><div><button data-plus-edit-expense="${e.id}" ${disabled}>Editar</button><button data-plus-archive="${e.id}" data-kind="expense" ${disabled}>Arquivar</button></div></article>`).join('')||'<p class="plus-empty">Nenhum gasto registrado neste mês.</p>'}</div><div class="plus-section"><h3>Metas da casa</h3><button data-plus-new="goal" ${disabled}>＋ Nova meta</button></div><div class="plus-list">${state.goals.map(g=>`<article class="plus-record"><b>${esc(g.title)}</b><span>${money(g.saved_cents)} de ${money(g.target_cents)}${g.saved_cents>=g.target_cents?' · Meta atingida!':''}</span><progress max="${g.target_cents}" value="${Math.min(g.saved_cents,g.target_cents)}" aria-label="Progresso da meta"></progress><div><button data-plus-edit-goal="${g.id}" ${disabled}>Atualizar</button><button data-plus-archive="${g.id}" data-kind="goal" ${disabled}>Arquivar</button></div></article>`).join('')||'<p class="plus-empty">Escolham uma conquista para realizar juntos.</p>'}</div><p class="plus-small">Os valores são registros manuais. O Ninho não movimenta dinheiro e não se conecta ao seu banco.</p>`;
  }
 }
 function formatDate(value){return String(value).slice(0,10).split('-').reverse().join('/')}
 async function open(which){
  if(!adult())return;page=which;document.querySelector('#familyBg').classList.remove('open');window.NinhoTutorial?.dismiss(false);
  openDetail(which==='routines'?'Rotinas recorrentes':which==='finance'?'Finanças da casa':'Ninho+ em teste','<div id="plusPanel"><p role="status">Carregando...</p></div>');
  const result=await refresh();if(!result&&document.querySelector('#plusPanel'))document.querySelector('#plusPanel').innerHTML='<p role="alert">Não foi possível carregar. Confira sua conexão.</p><button class="full" data-plus-retry> Tentar novamente</button>';
 }
 function form(kind,item){
  if(!current()||state.mode!=='plus')return;const id=item?.id||'';let fields='';
  if(kind==='routine')fields=`<label>Nome da rotina<input name="title" required maxlength="140" value="${esc(item?.title||'')}" placeholder="Ex.: Regar as plantas"></label><label>Repetir<select name="frequency">${Object.entries(frequencies).map(([key,label])=>`<option value="${key}" ${item?.frequency===key?'selected':''}>${label}</option>`).join('')}</select></label><label>Primeiro dia<input type="date" name="start" required value="${item?.starts_on||iso()}"></label><label>Responsável<select name="assignee"><option value="">Sem responsável</option>${data.members.map(m=>`<option value="${m.id}" ${item?.assignee_id===m.id?'selected':''}>${esc(m.name)}</option>`).join('')}</select></label><p class="plus-small">Se o primeiro dia já passou, a rotina começa pela próxima data prevista. Mensais mantêm o dia original, ajustando meses curtos. Mudanças valem para as próximas gerações; tarefas já criadas são preservadas.</p>`;
  else if(kind==='expense')fields=`<label>Descrição<input name="title" required maxlength="140" value="${esc(item?.title||'')}" placeholder="Ex.: Compra do mercado"></label><label>Valor (R$)<input name="amount" inputmode="decimal" required value="${item?editMoney(item.amount_cents):''}" placeholder="0,00"></label><label>Categoria<select name="category">${Object.entries(categories).map(([key,label])=>`<option value="${key}" ${item?.category===key?'selected':''}>${label}</option>`).join('')}</select></label><label>Data<input type="date" name="date" required value="${item?.spent_on||iso()}"></label>`;
  else fields=`<label>Nome da meta<input name="title" required maxlength="140" value="${esc(item?.title||'')}" placeholder="Ex.: Férias em família"></label><label>Objetivo (R$)<input name="target" inputmode="decimal" required value="${item?editMoney(item.target_cents):''}" placeholder="0,00"></label><label>Já guardado (R$)<input name="saved" inputmode="decimal" required value="${item?editMoney(item.saved_cents):'0,00'}"></label>`;
  document.querySelector('#plusPanel').innerHTML=`<form class="detail-form plus-form" data-plus-form="${kind}" data-id="${id}">${fields}<button class="full" type="submit">Salvar</button><button class="outline" type="button" data-plus-back>Voltar</button></form>`;
 }
 async function mutate(name,args){const c=context();if(busy||!unchanged(c))return;let committed=false,keepNotice=false;busy=true;document.querySelectorAll('#plusPanel button').forEach(b=>b.disabled=true);try{await rpc(name,{p_family:c.family,...args});committed=true;if(!unchanged(c))return;const updated=await refresh(true);if(!updated)throw Error('Registrado, mas não foi possível atualizar a tela');if(!unchanged(c))return;window.NinhoAvatar?.refresh();await refreshShared();toast('Atualizado no Ninho de teste ✓')}catch(e){if(unchanged(c)){toast(e.message||'Não foi possível salvar');if(committed){const panel=document.querySelector('#plusPanel');if(panel)panel.innerHTML='<p role="status">O registro foi salvo. Atualize a visualização antes de fazer outra alteração.</p><button class="full" data-plus-retry>Atualizar visualização</button>';keepNotice=true;return}const button=document.querySelector('#plusPanel button[type="submit"]');if(button)button.disabled=false;else renderPanel()}}finally{busy=false;if(unchanged(c)&&!keepNotice&&!document.querySelector('[data-plus-form]'))renderPanel();document.querySelector('#plusPanel [data-plus-back]')?.removeAttribute('disabled')}}
 group.addEventListener('click',e=>{const b=e.target.closest('[data-plus-open]');if(b)open(b.dataset.plusOpen)});
 document.querySelector('#subscriptionBtn').onclick=()=>{if(adult())open('plans')};
 detailBg.addEventListener('click',async e=>{
  const b=e.target.closest('button');if(!b||!document.querySelector('#plusPanel')||busy)return;
  if(b.hasAttribute('data-plus-retry'))return open(page);
  if(b.hasAttribute('data-plus-back'))return renderPanel();
  if(!current()||!state)return;
  if(b.dataset.plusNew)return form(b.dataset.plusNew);
  if(b.dataset.plusEditRoutine)return form('routine',state.routines.find(r=>r.id===b.dataset.plusEditRoutine));
  if(b.dataset.plusEditExpense)return form('expense',state.expenses.find(r=>r.id===b.dataset.plusEditExpense));
  if(b.dataset.plusEditGoal)return form('goal',state.goals.find(r=>r.id===b.dataset.plusEditGoal));
  if(b.dataset.plusPlan)return mutate('qa_avatar_simulate_plan',{p_mode:b.dataset.plusPlan});
  if(b.dataset.plusToggle){const r=state.routines.find(r=>r.id===b.dataset.plusToggle);if(r)return mutate('qa_routine_toggle',{p_id:r.id,p_active:!r.active})}
  if(b.dataset.plusArchive){const c=context();const ok=await askConfirm({title:'Arquivar registro?',message:'O registro sai desta visão, mas permanece guardado no histórico do teste.',confirmLabel:'Arquivar',danger:false,icon:'📁'});if(ok&&unchanged(c))return mutate('qa_finance_archive',{p_id:b.dataset.plusArchive,p_kind:b.dataset.kind})}
 });
 detailBg.addEventListener('change',async e=>{if(e.target.id==='plusMonth'&&/^\d{4}-\d{2}$/.test(e.target.value)){month=e.target.value;await refresh()}});
 detailBg.addEventListener('submit',async e=>{
  const f=e.target;if(!f.dataset.plusForm)return;e.preventDefault();if(busy||!current())return;const values=Object.fromEntries(new FormData(f)),p_id=f.dataset.id||null;
  try{
   if(f.dataset.plusForm==='routine')await mutate('qa_routine_save',{p_title:values.title,p_frequency:values.frequency,p_start:values.start,p_assignee:values.assignee||null,p_id});
   else if(f.dataset.plusForm==='expense')await mutate('qa_expense_save',{p_title:values.title,p_amount:cents(values.amount),p_category:values.category,p_date:values.date,p_id});
   else await mutate('qa_goal_save',{p_title:values.title,p_target:cents(values.target),p_saved:cents(values.saved),p_id});
  }catch(error){toast(error.message)}
 });
 window.NinhoPlus={clear};group.classList.toggle('hide',!adult());
})();
