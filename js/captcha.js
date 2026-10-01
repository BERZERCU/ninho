window.NinhoCaptcha=(()=>{
 const cfg=window.NINHO_CONFIG||{};
 const enabled=!!cfg.turnstileSiteKey;
 const states={auth:{token:"",widgetId:null},verify:{token:"",widgetId:null}};
 const el=id=>document.getElementById(id);
 const ids=name=>({container:`${name}Turnstile`,status:`${name}CaptchaStatus`});
 function status(name,message,state=""){
  const node=el(ids(name).status);
  if(!node)return;
  node.textContent=message;
  node.dataset.state=state;
 }
 function render(name="auth"){
  if(!enabled)return;
  const s=states[name],target=el(ids(name).container);
  if(!s||s.widgetId!==null||!window.turnstile||!target)return;
  try{
   s.widgetId=window.turnstile.render(target,{
    sitekey:cfg.turnstileSiteKey,
    theme:"light",
    language:"pt-BR",
    size:"flexible",
    appearance:"interaction-only",
    callback:value=>{s.token=value||"";status(name,"Verificação de segurança concluída ✓","ok")},
    "expired-callback":()=>{s.token="";status(name,"A verificação expirou. Aguarde uma nova validação.","warn")},
    "timeout-callback":()=>{s.token="";status(name,"A verificação expirou. Tente novamente.","warn")},
    "error-callback":()=>{s.token="";status(name,"Não foi possível concluir a verificação de segurança. Tente novamente.","error");return true}
   });
   status(name,"Proteção contra robôs ativa.","ready");
  }catch(err){
   s.widgetId=null;s.token="";
   status(name,"Não foi possível carregar a verificação de segurança. Recarregue a página.","error");
   console.warn("Falha ao carregar Turnstile",err);
  }
 }
 function getToken(name="auth"){
  if(!enabled)return "";
  const s=states[name];
  if(!s?.token){const err=new Error("Conclua a verificação de segurança para continuar.");err.code="captcha_required";throw err}
  return s.token;
 }
 function reset(name="auth"){
  const s=states[name];if(!s)return;
  s.token="";
  if(enabled&&s.widgetId!==null&&window.turnstile){
   try{window.turnstile.reset(s.widgetId);status(name,"Proteção contra robôs ativa.","ready")}catch{}
  }
 }
 return {enabled,render,getToken,reset};
})();
window.NinhoCaptchaOnload=()=>window.NinhoCaptcha?.render("auth");
