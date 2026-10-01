var familyActivityItems=[];
(()=>{
const q=s=>document.querySelector(s);
let confirmResolver=null;
let proofPreviewUrl=null;
let subscribedFamilyId=null;

window.familyActivityItems=familyActivityItems;

window.activityMeta=function(item){
  const actor=item.actor_id===NINHO_USER.id?"Você":mem(item.actor_id).name;
  const title=item.title?`“${item.title}”`:"";
  const labels={task:"tarefa",event:"compromisso",shopping:"item de compras",member:"membro"};
  const label=labels[item.entity_type]||"item";
  let message="";
  if(item.action==="created")message=`${actor} adicionou ${label} ${title}`;
  else if(item.action==="updated")message=`${actor} atualizou ${label} ${title}`;
  else if(item.action==="deleted")message=`${actor} excluiu ${label} ${title}`;
  else if(item.action==="completed"&&item.entity_type==="shopping")message=`${actor} marcou ${title} como comprado`;
  else if(item.action==="reopened"&&item.entity_type==="shopping")message=`${actor} marcou ${title} como pendente`;
  else if(item.action==="completed")message=`${actor} concluiu a tarefa ${title}`;
  else if(item.action==="reopened")message=`${actor} reabriu a tarefa ${title}`;
  else if(item.action==="proof_updated")message=`${actor} adicionou um comprovante à tarefa ${title}`;
  else if(item.action==="member_joined")message=`${item.title||actor} entrou na família`;
  else if(item.action==="member_removed")message=`${actor} removeu ${item.title||"um membro"} da família`;
  else if(item.action==="member_role_changed")message=`${actor} alterou o perfil de ${item.title||"um membro"}`;
  else message=`${actor} atualizou ${label} ${title}`;
  const icon=item.entity_type==="task"?"✓":item.entity_type==="event"?"📅":item.entity_type==="shopping"?"🛒":"🏡";
  return {message:message.replace(/\s+/g," ").trim(),icon};
};

const activitySeenKey=()=>K+"-activity-seen";

window.renderActivity=function(){
  const list=q("#activityList");if(!list)return;
  list.innerHTML=familyActivityItems.length?familyActivityItems.map(item=>{
    const meta=activityMeta(item);
    const when=new Date(item.created_at).toLocaleString("pt-BR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});
    return `<div class="activity-item"><i>${meta.icon}</i><div><b>${esc(meta.message)}</b><small>${esc(when)}</small></div></div>`;
  }).join(""):`<div class="activity-empty">As próximas ações da família aparecerão aqui.</div>`;
};

window.updateActivityBadge=function(){
  const badge=q("#activityBadge");if(!badge)return;
  const seen=localStorage.getItem(activitySeenKey())||"";
  const unread=familyActivityItems.filter(x=>x.actor_id!==NINHO_USER.id&&(!seen||x.created_at>seen)).length;
  badge.textContent=unread>99?"99+":String(unread);
  badge.classList.toggle("hide",unread===0);
};

window.loadActivity=async function(){
  if(!NINHO_FAMILY.id){familyActivityItems=[];window.familyActivityItems=familyActivityItems;renderActivity();updateActivityBadge();return}
  try{
    familyActivityItems=await NinhoCloud.familyActivity(NINHO_FAMILY.id,50);
    window.familyActivityItems=familyActivityItems;
    if(!localStorage.getItem(activitySeenKey())&&familyActivityItems[0])localStorage.setItem(activitySeenKey(),familyActivityItems[0].created_at);
    renderActivity();updateActivityBadge();
  }catch(err){console.warn("Falha ao carregar atividade",err)}
};

async function showDeviceActivityNotification(message){
  if(window.NinhoPush?.isActive())return;
  if(!("Notification" in window)||Notification.permission!=="granted"||document.visibilityState==="visible")return;
  try{
    const reg=await navigator.serviceWorker?.getRegistration();
    if(reg)await reg.showNotification("Ninho · atividade da família",{
      body:message,
      icon:"icons/ninho-192.png",
      badge:"icons/ninho-192.png",
      tag:"ninho-family-activity",
      data:{url:location.origin+location.pathname}
    });
  }catch(err){console.warn("Falha ao mostrar notificação",err)}
}

window.handleActivity=async function(item){
  if(!item||familyActivityItems.some(x=>x.id===item.id))return;
  familyActivityItems.unshift(item);
  familyActivityItems=familyActivityItems.slice(0,50);
  window.familyActivityItems=familyActivityItems;
  renderActivity();updateActivityBadge();
  if(item.actor_id===NINHO_USER.id||!notificationPrefs().family)return;
  const message=activityMeta(item).message;
  toast(message);
  await showDeviceActivityNotification(message);
};

window.askConfirm=function({title="Confirmar ação",message="",confirmLabel="Excluir",icon="🗑️",danger=true}={}){
  if(confirmResolver){confirmResolver(false);confirmResolver=null}
  q("#confirmTitle").textContent=title;
  q("#confirmMessage").textContent=message;
  q("#confirmIcon").textContent=icon;
  const ok=q("#confirmOkBtn");
  ok.textContent=confirmLabel;
  ok.classList.toggle("danger",danger);
  ok.classList.toggle("safe",!danger);
  q("#confirmBg").classList.add("open");
  return new Promise(resolve=>{confirmResolver=resolve});
};

function finishConfirm(value){
  if(!confirmResolver)return;
  const resolve=confirmResolver;
  confirmResolver=null;
  q("#confirmBg").classList.remove("open");
  resolve(value);
}

function clearProofPreview(){
  if(proofPreviewUrl){URL.revokeObjectURL(proofPreviewUrl);proofPreviewUrl=null}
}

function openTaskCompletion(id){
  const task=data.tasks.find(t=>t.id===id);if(!task)return;
  openDetail("Concluir tarefa",`<div class="proof-box"><p class="proof-copy">Tudo pronto com <b>${esc(task.title)}</b>? Você pode adicionar uma foto como comprovante antes de concluir.</p><label class="proof-picker"><b>📷 Foto do que foi feito <span class="sub">(opcional)</span></b><input id="taskProofInput" type="file" accept="image/jpeg,image/png,image/webp" capture="environment"><span class="proof-hint">JPG, PNG ou WebP · máximo 5 MB.</span></label><img id="taskProofPreview" class="proof-preview hide" alt="Prévia do comprovante"><button class="full" id="completeTaskBtn" data-task="${esc(id)}">Concluir tarefa</button></div>`);
}

async function ensureFeatureRealtime(){
  if(!NINHO_FAMILY.id||NINHO_USER.demo||subscribedFamilyId===NINHO_FAMILY.id)return;
  subscribedFamilyId=NINHO_FAMILY.id;
  await loadActivity();
  NinhoCloud.realtime(NINHO_FAMILY.id,refreshShared,refreshMembership,handleActivity);
}

function installFeatureHandlers(){
  const activityBg=q("#activityBg"),confirmBg=q("#confirmBg");
  q("#activityBtn").onclick=async()=>{
    await ensureFeatureRealtime();
    await loadActivity();
    const newest=familyActivityItems[0]?.created_at||new Date().toISOString();
    localStorage.setItem(activitySeenKey(),newest);
    updateActivityBadge();renderActivity();activityBg.classList.add("open");
  };
  q("#closeActivity").onclick=()=>activityBg.classList.remove("open");
  activityBg.onclick=e=>{if(e.target===activityBg)activityBg.classList.remove("open")};
  q("#confirmCancelBtn").onclick=()=>finishConfirm(false);
  q("#confirmOkBtn").onclick=()=>finishConfirm(true);
  confirmBg.onclick=e=>{if(e.target===confirmBg)finishConfirm(false)};

  window.delShop=async id=>{
    if(!canManage())return;
    const item=data.shopping.find(x=>x.id===id);if(!item)return;
    const ok=await askConfirm({title:"Excluir item de compras?",message:`“${item.title}” será removido da lista. Esta ação não pode ser desfeita.`,confirmLabel:"Excluir"});
    if(!ok)return;
    const old=[...data.shopping];
    data.shopping=data.shopping.filter(x=>x.id!==id);render();
    try{await NinhoCloud.deleteShopping(id);toast("Item excluído ✓")}catch(e){data.shopping=old;render();toast("Não foi possível excluir")}
  };

  window.task=async id=>{
    const x=data.tasks.find(t=>t.id===id);
    if(!x||NINHO_FAMILY.role==="child"&&x.member!==NINHO_USER.id)return;
    if(!x.done){openTaskCompletion(id);return}
    try{await NinhoCloud.setTaskDone(id,false);await refreshShared();toast("Tarefa reaberta")}catch(e){toast(e.message||"Não foi possível atualizar")}
  };

  window.viewTaskProof=async id=>{
    const task=data.tasks.find(t=>t.id===id);
    if(!task?.proofPath)return toast("Comprovante indisponível");
    try{
      const url=await NinhoCloud.taskProofUrl(task.proofPath);
      openDetail("Comprovante da tarefa",`<div class="proof-box"><p class="proof-copy"><b>${esc(task.title)}</b></p><img class="proof-preview" src="${esc(url)}" alt="Foto de comprovante da tarefa"><p class="proof-hint">Esta foto fica privada para os membros desta família.</p></div>`);
    }catch(err){toast(err.message||"Não foi possível abrir o comprovante")}
  };

  detailBg.addEventListener("change",e=>{
    if(e.target.id!=="taskProofInput")return;
    clearProofPreview();
    const file=e.target.files?.[0],preview=q("#taskProofPreview");
    if(!file){preview?.classList.add("hide");return}
    if(!["image/jpeg","image/png","image/webp"].includes(file.type)){e.target.value="";return toast("Use uma foto JPG, PNG ou WebP")}
    if(file.size>5*1024*1024){e.target.value="";return toast("A foto deve ter no máximo 5 MB")}
    proofPreviewUrl=URL.createObjectURL(file);
    preview.src=proofPreviewUrl;
    preview.classList.remove("hide");
  });

  detailBg.addEventListener("click",async e=>{
    if(e.target.id==="completeTaskBtn"){
      const btn=e.target,id=btn.dataset.task,file=q("#taskProofInput")?.files?.[0]||null;
      btn.disabled=true;btn.textContent=file?"Enviando foto...":"Concluindo...";
      try{
        await NinhoCloud.completeTask(id,NINHO_FAMILY.id,file);
        clearProofPreview();detailBg.classList.remove("open");
        await refreshShared();
        toast(file?"Tarefa concluída com comprovante ✓":"Tarefa concluída ✓");
      }catch(err){btn.disabled=false;btn.textContent="Concluir tarefa";toast(err.message||"Não foi possível concluir")}
    }
    if(e.target.id==="enableDeviceNotifications"){
      if(!("Notification" in window))return toast("Notificações não são suportadas neste navegador");
      try{
        const permission=await Notification.requestPermission();
        toast(permission==="granted"?"Notificações ativadas ✓":permission==="denied"?"Notificações foram bloqueadas":"Permissão não concedida");
        q("#notificationsBtn").click();
      }catch(err){toast("Não foi possível ativar notificações")}
    }
  });

  window.addEventListener("focus",ensureFeatureRealtime);
  setInterval(()=>{
    if(!NINHO_FAMILY.id){subscribedFamilyId=null;return}
    ensureFeatureRealtime();
  },1500);
}

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",installFeatureHandlers,{once:true});
else installFeatureHandlers();
})();
