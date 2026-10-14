(()=>{
 const getToken=name=>window.NinhoCaptcha?.getToken(name)||"";
 const reset=name=>window.NinhoCaptcha?.reset(name);
 const showVerify=(email,message="")=>{
  pendingVerificationEmail=email;
  $("#verifyEmailAddress").textContent=email;
  authScreen.classList.add("hide");
  verifyEmailScreen.classList.remove("hide");
  if(message)$("#verifyStatus").textContent=message;
  window.NinhoCaptcha?.render("verify");
 };

 $("#authForm").onsubmit=async e=>{
  e.preventDefault();
  if(authBusy)return;
  let securityToken="";
  try{securityToken=getToken("auth")}catch(err){toast(err.message);return}
  const submitBtn=$("#authSubmit");
  authBusy=true;submitBtn.disabled=true;submitBtn.textContent=authMode==="signup"?"Criando conta...":"Entrando...";
  try{
   const email=$("#authEmail").value.trim(),password=$("#authPassword").value;
   const res=authMode==="signup"?await NinhoCloud.signUp(email,password,$("#authName").value.trim(),securityToken):await NinhoCloud.signIn(email,password,securityToken);
   if(authMode==="signup"&&!res.data.session){showVerify(email);return}
   const p=await NinhoCloud.profile();
   NINHO_USER={demo:false,id:p?.id||null,name:p?.name||email.split("@")[0],managedChild:!!p?.managedChild,email:p?.managedChild?"Conta infantil":p?.email||email,phone:p?.phone||""};
   authScreen.classList.add("hide");await bootCloud();
  }catch(err){
   const msg=(err?.message||"").toLowerCase();
   if(msg.includes("email not confirmed")||msg.includes("email_not_confirmed"))showVerify($("#authEmail").value.trim(),"Seu e-mail ainda não foi confirmado. Abra o link enviado ou reenvie abaixo.");
   else if(msg.includes("password should contain")||msg.includes("password should be at least")||err?.code==="weak_password")toast("Senha muito fraca. Use pelo menos 8 caracteres, com maiúscula, minúscula, número e símbolo.");
   else if(msg.includes("captcha"))toast("Verificação de segurança inválida. Tente novamente.");
   else if(err?.status===429||err?.code==="over_email_send_rate_limit"||msg.includes("rate limit")||msg.includes("too many"))toast("Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.");
   else toast(err.message||"Não foi possível entrar");
  }finally{
   reset("auth");authBusy=false;submitBtn.disabled=false;submitBtn.textContent=authMode==="login"?"Entrar":"Criar conta";
  }
 };

 $("#forgotPassword").onclick=async()=>{
  if(forgotBusy)return;
  const email=$("#authEmail").value.trim(),btn=$("#forgotPassword"),status=$("#forgotStatus");
  status.classList.remove("hide");
  if(!email){status.textContent="Informe seu e-mail acima para receber o link de recuperação.";$("#authEmail").focus();return}
  let securityToken="";
  try{securityToken=getToken("auth")}catch(err){status.textContent=err.message;return}
  forgotBusy=true;btn.disabled=true;btn.textContent="Enviando...";status.textContent="Solicitando link de recuperação...";
  try{
   await NinhoCloud.requestPasswordReset(email,securityToken);
   status.classList.add("hide");$("#recoveryEmail").textContent=email;$("#recoverySent").classList.remove("hide");$("#authForm").classList.add("hide");$("#forgotPassword").classList.add("hide");toast("E-mail de recuperação enviado ✓");
  }catch(err){
   const msg=(err?.message||"").toLowerCase();
   if(msg.includes("captcha"))status.textContent="A verificação de segurança falhou. Tente novamente.";
   else if(err?.status===429||err?.code==="over_email_send_rate_limit"||msg.includes("rate limit")||msg.includes("too many"))status.textContent="Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.";
   else status.textContent=err?.message||"Não foi possível enviar o link de recuperação.";
   toast("Não foi possível enviar o link");
  }finally{reset("auth");forgotBusy=false;btn.disabled=false;btn.textContent="Esqueci minha senha"}
 };

 $("#resendVerification").onclick=async()=>{
  const btn=$("#resendVerification");
  try{
   if(!pendingVerificationEmail)return toast("Informe seu e-mail novamente");
   const securityToken=getToken("verify");
   btn.disabled=true;btn.textContent="Enviando...";
   await NinhoCloud.resendConfirmation(pendingVerificationEmail,securityToken);
   $("#verifyStatus").textContent="Novo e-mail enviado ✓ Confira sua caixa de entrada e o spam.";toast("E-mail de confirmação reenviado ✓");
   setTimeout(()=>{btn.disabled=false;btn.textContent="Reenviar e-mail"},3000);
  }catch(err){
   const msg=(err?.message||"").toLowerCase();
   if(err?.code==="captcha_required"||msg.includes("captcha")){$("#verifyStatus").textContent=err?.code==="captcha_required"?err.message:"A verificação de segurança falhou. Tente novamente.";btn.disabled=false;btn.textContent="Reenviar e-mail"}
   else if(err?.status===429||err?.code==="over_email_send_rate_limit"||msg.includes("rate limit")||msg.includes("too many")){$("#verifyStatus").textContent="Limite temporário de e-mails atingido. Aguarde alguns minutos antes de reenviar.";toast("Aguarde antes de solicitar outro e-mail.");setTimeout(()=>{btn.disabled=false;btn.textContent="Reenviar e-mail"},60000)}
   else{btn.disabled=false;btn.textContent="Reenviar e-mail";toast(err.message||"Não foi possível reenviar")}
  }finally{reset("verify")}
 };

 const originalRecoveryBack=$("#recoveryBack").onclick;
 $("#recoveryBack").onclick=()=>{originalRecoveryBack?.();reset("auth")};
 const originalBackToLogin=$("#backToLogin").onclick;
 $("#backToLogin").onclick=()=>{originalBackToLogin?.();reset("verify");reset("auth")};
})();
