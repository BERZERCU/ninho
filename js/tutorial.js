(()=>{
 const version='v1',seenInSession=new Set();
 const root=document.createElement('div');
 root.id='tutorialOverlay';root.className='tutorial-overlay hide';
 root.innerHTML='<div class="tutorial-spotlight" aria-hidden="true"></div><section class="tutorial-card" role="dialog" aria-modal="true" aria-labelledby="tutorialTitle" aria-describedby="tutorialText" tabindex="-1"><div class="tutorial-top"><span id="tutorialProgress"></span><button type="button" id="tutorialClose" aria-label="Fechar tutorial">×</button></div><div class="tutorial-icon" id="tutorialIcon" aria-hidden="true"></div><div aria-live="polite" aria-atomic="true"><h2 id="tutorialTitle"></h2><p id="tutorialText"></p></div><p class="tutorial-tip" id="tutorialTip"></p><div class="tutorial-dots" id="tutorialDots" aria-hidden="true"></div><div class="tutorial-actions"><button type="button" id="tutorialBack" class="outline">Voltar</button><button type="button" id="tutorialNext" class="full">Próximo</button></div><button type="button" id="tutorialSkip" class="demo-btn">Agora não</button></section>';
 document.body.appendChild(root);
 const q=id=>root.querySelector('#'+id);
 let current=null,index=0,steps=[],previousFocus=null;
 const card=root.querySelector('.tutorial-card'),spotlight=root.querySelector('.tutorial-spotlight');
 const arrow=document.createElement('span');arrow.className='tutorial-arrow';arrow.setAttribute('aria-hidden','true');root.appendChild(arrow);
 const identity=()=>!NINHO_USER.demo&&NINHO_USER.id&&NINHO_FAMILY.id?{user:NINHO_USER.id,family:NINHO_FAMILY.id,role:NINHO_FAMILY.role,child:!!NINHO_USER.managedChild||NINHO_FAMILY.role==='child'}:null;
 const key=id=>'ninho-tutorial-'+version+'-'+id;
 function seen(id){if(seenInSession.has(id))return true;try{return localStorage.getItem(key(id))==='seen'}catch{return false}}
 function build(child,role){const list=[
  {icon:'🏡',title:'Bem-vindo ao seu Ninho',text:'A rotina fica mais leve quando todo mundo participa. Vamos conhecer os espaços da sua família?',tip:'É rapidinho. Você pode pular e rever em Configurações → Primeiros passos.',view:'today',target:'#hello'},
  {icon:'☀️',title:'Hoje: o dia em um olhar',text:'Na tela Hoje, acompanhe os próximos compromissos e as tarefas da família. Use o menu de baixo para mudar de espaço.',tip:'Comece por aqui para saber o que precisa de atenção.',view:'today',target:'#nextEvent'},
  {icon:'✓',title:'Tarefas: cada um faz sua parte',text:child?'Veja as tarefas e toque no círculo para marcar uma conclusão. Se aparecer um pedido de comprovante, siga as instruções da tela.':'Toque no +, escolha Tarefa e indique quem vai cuidar dela. Marque o círculo quando terminar; use o lápis para editar.',tip:child?'Você pode concluir tarefas, mas não criar, editar ou excluir.':'As mudanças aparecem para a família quando os dispositivos estão conectados.',view:'tasks',target:'.nav[data-view="tasks"]'},
  {icon:'📅',title:'Agenda: ninguém esquece',text:child?'Consulte os compromissos da família e use as setas para ver outros meses. Para mudar um compromisso, peça a um adulto.':'Use as setas para navegar pelos meses. Para agendar algo, toque no + e escolha Compromisso.',tip:child?'Sua conta pode consultar a agenda, sem criar, editar ou excluir compromissos.':'Escolha a data, o horário e a pessoa do compromisso.',view:'agenda',target:'.nav[data-view="agenda"]'},
  {icon:'🛒',title:'Compras: uma lista para todos',text:child?'Toque no círculo de um item para marcar como comprado. Toque de novo se precisar deixá-lo pendente.':'Toque no + e escolha Compra para adicionar um item. Marque o círculo ao comprar; toque novamente para desmarcar.',tip:child?'Só os adultos podem adicionar, editar ou excluir itens.':'A lista é compartilhada: confira o que já foi comprado antes de sair.',view:'shopping',target:'.nav[data-view="shopping"]'},
  {icon:'🌱',title:child?'Seu espaço na família':'Traga sua família para perto',text:child?'Seu responsável cuida da sua conta e pode redefinir sua senha. Para sair do aplicativo, abra sua foto no topo e toque em Sair da conta.':'Toque na sua foto no topo para abrir Configurações. Em Convidar alguém, compartilhe o código com quem vai participar. Para uma criança, use Contas infantis.',tip:child?'Conta infantil não cria famílias. Para entrar em outra, seu responsável precisa participar dela.':role==='admin'?'Como Admin, você também pode gerenciar os papéis dos membros.':'Como Adulto, você organiza tarefas, compromissos e compras.',view:'today',target:'#profile'},
  {icon:'🔔',title:'Pronto para a rotina!',text:'Se quiser receber avisos, abra Configurações → Notificações e ative neste dispositivo. Você pode rever este guia em Primeiros passos.',tip:'Agora é com vocês. Comecem com uma tarefa simples para a família.',view:'today',target:'#profile'}
 ];if(!child)list.splice(3,0,{icon:'＋',title:'O + é o seu ponto de partida',text:'Toque aqui quando quiser adicionar uma tarefa, um compromisso ou um item de compras. Depois, preencha as informações e salve.',tip:'Neste passeio, nenhum item será criado. É só para conhecer o caminho.',view:'tasks',target:'#fab'});return list;}
 function dismiss(remember=true){
  if(!current)return;
  if(remember){seenInSession.add(current.user);try{localStorage.setItem(key(current.user),'seen')}catch{}}
  current=null;root.classList.add('hide');document.querySelector('.app').inert=false;
  if(previousFocus?.isConnected)previousFocus.focus();
 }
 function position(){
  if(!current)return;
  const target=document.querySelector(steps[index].target);if(!target)return;
  const r=target.getBoundingClientRect(),w=window.innerWidth,h=window.innerHeight;
  spotlight.style.left=Math.max(3,r.left-5)+'px';spotlight.style.top=Math.max(3,r.top-5)+'px';
  spotlight.style.width=Math.min(w-6,r.width+10)+'px';spotlight.style.height=(r.height+10)+'px';
  const cw=card.offsetWidth,ch=card.offsetHeight,below=h-r.bottom-18,above=r.top-18;
  const down=below>=ch||(below>above);
  const left=Math.max(12,Math.min(w-cw-12,r.left+r.width/2-cw/2));
  const top=Math.max(12,Math.min(h-ch-12,down?r.bottom+18:r.top-ch-18));
  card.style.left=left+'px';card.style.top=top+'px';
  card.dataset.side=down?'below':'above';
  arrow.style.display='block';arrow.style.left=Math.max(left+15,Math.min(left+cw-29,r.left+r.width/2-7))+'px';arrow.style.top=(down?top-6:top+ch-8)+'px';
  card.style.setProperty('--arrow-x',Math.max(22,Math.min(cw-22,r.left+r.width/2-left))+'px');
 }
 function render(){
  const id=identity();
  if(!id||!current||id.user!==current.user||id.family!==current.family||id.role!==current.role){dismiss(false);return}
  const step=steps[index];setView(step.view);
  q('tutorialProgress').textContent=`Passo ${index+1} de ${steps.length}`;
  q('tutorialIcon').textContent=step.icon;q('tutorialTitle').textContent=step.title;
  q('tutorialText').textContent=step.text;q('tutorialTip').textContent=step.tip;
  q('tutorialDots').innerHTML=steps.map((_,i)=>`<span class="${i===index?'active':''}"></span>`).join('');
  q('tutorialBack').disabled=index===0;
  q('tutorialNext').textContent=index===steps.length-1?'Começar a usar':index===0?'Vamos conhecer':'Próximo';
  q('tutorialSkip').textContent=index===0?'Agora não':'Pular tutorial';
  position();
 }
 function start(){
  const id=identity();if(!id)return;
  previousFocus=document.activeElement;
  document.querySelector('#familyBg')?.classList.remove('open');
  document.querySelector('#detailBg')?.classList.remove('open');
  current=id;index=0;steps=build(id.child,id.role);document.querySelector('.app').inert=true;root.classList.remove('hide');render();
  q('tutorialNext').focus();
 }
 function maybeStart(){
  const id=identity();
  if(current){if(!id||id.user!==current.user||id.family!==current.family||id.role!==current.role)dismiss(false);else return}
  if(id&&!seen(id.user))start();
 }
 q('tutorialNext').onclick=()=>{if(index===steps.length-1){dismiss();return}index++;render()};
 q('tutorialBack').onclick=()=>{if(index>0){index--;render()}};
 q('tutorialClose').onclick=()=>dismiss();q('tutorialSkip').onclick=()=>dismiss();
 root.addEventListener('keydown',e=>{
  if(e.key==='Escape'){e.preventDefault();dismiss();return}
  if(e.key!=='Tab')return;
  const buttons=[...root.querySelectorAll('button')].filter(b=>!b.disabled);
  const first=buttons[0],last=buttons[buttons.length-1];
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
 });
 window.addEventListener('resize',position);window.addEventListener('scroll',position,true);
 document.querySelector('#tutorialBtn').onclick=start;
 window.NinhoTutorial={start,maybeStart,dismiss};
 maybeStart();
})();
