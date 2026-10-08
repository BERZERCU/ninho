(()=>{
 const version='2026-10-08';
 const button=$('#childAccountsBtn');
 const previous=refreshSettings;
 refreshSettings=function(){previous();button.classList.toggle('hide',!canManage());$('#personalDataBtn').classList.toggle('hide',!!NINHO_USER.managedChild);$('#editProfileBtn').classList.toggle('hide',!!NINHO_USER.managedChild);};
 async function showChildren(){
  if(!canManage())return;
  openDetail('Contas infantis','<p role="status">Carregando contas sob sua responsabilidade...</p>');
  try{
   const result=await NinhoCloud.managedChildren({action:'list'});
   openDetail('Contas infantis',`<div class="confirm-box"><p>Crie o acesso apenas se você for responsável legal pela criança. O código identifica a conta; a senha permite entrar. Compartilhe ambos somente com a criança.</p>${(result.children||[]).map(c=>`<div class="card"><b>${esc(c.name)}</b><p>Código: <b>${esc(c.login_code)}</b></p><button class="outline child-reset" data-child="${esc(c.child_id)}">Redefinir senha</button><button class="outline child-delete" data-child="${esc(c.child_id)}">Excluir conta infantil</button></div>`).join('')||'<p>Nenhuma conta infantil criada por você.</p>'}<button class="full" id="newChildAccount">＋ Criar conta infantil</button><p>Para sair da família ou excluir sua própria conta, exclua primeiro as contas infantis sob sua responsabilidade.</p></div>`);
  }catch(err){openDetail('Contas infantis',`<p role="alert">${esc(err.message)}</p>`);}
 }
 button.onclick=showChildren;
 function childForm(id){
  openDetail(id?'Redefinir senha':'Criar conta infantil',`<form class="detail-form" id="childForm">${id?'':'<label>Nome ou apelido da criança<input name="name" maxlength="60" required autocomplete="off"></label>'}<label>${id?'Nova senha':'Senha da criança'}<input name="password" type="password" minlength="12" maxlength="128" autocomplete="new-password" required></label><p>Use pelo menos 12 caracteres. A senha não será guardada neste dispositivo.</p>${id?'':`<p>A criança verá tarefas, agenda, compras e atividades da família. Poderá concluir suas tarefas, anexar comprovantes e marcar compras, com as permissões do papel Criança. Não terá acesso ao código de convite nem poderá administrar a família.</p><p>Leia a <a href="privacy.html" target="_blank" rel="noopener">Política de Privacidade</a>. Para retirar a autorização, exclua a conta nesta tela. Conteúdo compartilhado e backups seguem as condições da política.</p><label><input name="adult" type="checkbox" required> Declaro que tenho 18 anos ou mais e sou responsável legal por esta criança.</label><label><input name="consent" type="checkbox" required> Autorizo a criação da conta e o tratamento dos dados descritos para uso do Ninho pela criança.</label>`}<button class="full">${id?'Salvar nova senha':'Criar acesso'}</button></form>`);
  const form=$('#childForm');
  form.onsubmit=async event=>{
   event.preventDefault();const submit=form.querySelector('button');submit.disabled=true;
   const values=new FormData(form);
   try{
    const result=await NinhoCloud.managedChildren(id?{action:'reset',childId:id,password:values.get('password')}:{action:'create',familyId:NINHO_FAMILY.id,name:values.get('name'),password:values.get('password'),adult:values.get('adult')==='on',consent:values.get('consent')==='on',consentVersion:version});
    form.reset();
    if(id){await showChildren();toast('Senha atualizada ✓');}
    else{openDetail('Acesso infantil criado',`<div class="confirm-box"><p>Código de acesso: <b>${esc(result.child.login_code)}</b></p><p>No dispositivo da criança, abra o Ninho e entre com esse código e a senha que você escolheu. Se esquecer a senha, volte a Contas infantis para redefinir.</p><button class="full" id="backChildren">Voltar às contas infantis</button></div>`);await refreshMembership();}
   }catch(err){toast(err.message);submit.disabled=false;}
  };
 }
 detailBg.addEventListener('click',async event=>{
  const target=event.target;
  if(target.id==='newChildAccount')childForm();
  if(target.id==='backChildren')await showChildren();
  if(target.classList.contains('child-reset'))childForm(target.dataset.child);
  if(target.classList.contains('child-delete')){
   const ok=await askConfirm({title:'Excluir conta infantil?',message:'A criança perderá o acesso. Conteúdo compartilhado pode permanecer para os demais membros, conforme a política de privacidade.',confirmLabel:'Excluir conta'});
   if(!ok)return;
   target.disabled=true;
   try{await NinhoCloud.managedChildren({action:'delete',childId:target.dataset.child,confirmation:'EXCLUIR'});await refreshMembership();await showChildren();toast('Conta infantil excluída ✓');}
   catch(err){toast(err.message);target.disabled=false;}
  }
 });
})();
