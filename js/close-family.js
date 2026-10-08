(()=>{
 const previous=refreshSettings;
 refreshSettings=function(){
  previous();const solo=NINHO_FAMILY.role==='admin'&&data.members.length===1;
  const button=$('#leaveFamilyBtn');button.classList.toggle('hide',NINHO_FAMILY.role==='admin'&&!solo);
  button.querySelector('b').textContent=solo?'Encerrar minha família':'Sair da família';
 };
 const previousLeave=$('#leaveFamilyBtn').onclick;
 async function closeFamily(familyId){
  const {data:result,error}=await NinhoCloud.sb.functions.invoke('close-family',{body:{familyId,confirmation:'ENCERRAR'}});
  if(error){let payload;try{payload=await error.context?.json()}catch{}throw Error(payload?.error||'Não foi possível encerrar a família');}
  if(!result?.ok)throw Error('Não foi possível encerrar a família');
  return result;
 }
 $('#leaveFamilyBtn').onclick=()=>{
  if(NINHO_FAMILY.role!=='admin')return previousLeave();
  const familyId=NINHO_FAMILY.id;
  openDetail('Encerrar minha família',`<form class="detail-form" id="closeFamilyForm"><p><b>Esta ação é permanente.</b> A família, agenda, tarefas, compras, atividades e comprovantes serão excluídos. Sua conta e seu login serão mantidos para criar ou entrar em outra família.</p><p>Só é possível encerrar se você for o único membro. Cópias de segurança seguem a <a href="privacy.html" target="_blank" rel="noopener">Política de Privacidade</a>.</p><label>Digite <b>ENCERRAR</b><input name="confirmation" required autocomplete="off" placeholder="ENCERRAR"></label><button class="full danger">Encerrar família e manter conta</button><p id="closeFamilyStatus" role="status"></p></form>`);
  const form=$('#closeFamilyForm');form.onsubmit=async event=>{
   event.preventDefault();if(new FormData(form).get('confirmation')!=='ENCERRAR')return toast('Digite ENCERRAR para confirmar');
   const button=form.querySelector('button');button.disabled=true;button.textContent='Encerrando...';
   try{
    const result=await closeFamily(familyId);
    localStorage.removeItem(K);
    if(result.cleanupPending){form.innerHTML='<p>Família encerrada e conta preservada. A limpeza das fotos está pendente e será tentada novamente na próxima entrada.</p><button type="button" id="continueAfterClose">Continuar</button>';$('#continueAfterClose').onclick=()=>location.reload();}
    else location.reload();
   }catch(error){$('#closeFamilyStatus').textContent=error.message;button.disabled=false;button.textContent='Encerrar família e manter conta';}
  };
 };
 // Retry only already closed families, so this never silently closes an active family.
 (async()=>{try{if(!NinhoCloud.enabled||!await NinhoCloud.session())return;const {data:pending,error}=await NinhoCloud.sb.rpc('my_pending_family_closures');if(error)return;for(const id of pending||[])await closeFamily(id);}catch{/* The durable queue remains available for the next attempt. */}})();
})();
