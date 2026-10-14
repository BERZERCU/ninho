const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store'};
const reply=(status,body)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
export function createLoginHandler(admin,authClient) {
 return async req=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(req.method!=='POST')return reply(405,{error:'Método inválido'});
  try{
   const text=await req.text();if(text.length>4096)return reply(413,{error:'Solicitação muito grande'});
   let body;try{body=JSON.parse(text)}catch{return reply(400,{error:'Solicitação inválida'})}
   const code=typeof body.code==='string'?body.code.trim().toUpperCase():'';
   if(!/^N[0-9A-F]{16}$/.test(code)||typeof body.password!=='string'||body.password.length>128)return reply(400,{error:'Código ou senha inválidos'});
   const {data:id,error:lookupError}=await admin.rpc('managed_child_lookup',{p_code:code});
   if(lookupError)return reply(503,{error:'Acesso infantil indisponível'});
   let email='unknown@child.ninho.invalid';
   if(id){const {data,error}=await admin.auth.admin.getUserById(id);if(!error&&data?.user?.app_metadata?.managed_child)email=data.user.email;}
   // Both known and unknown codes go through Auth, including its CAPTCHA/rate limits.
   const {data,error}=await authClient.auth.signInWithPassword({email,password:body.password,options:{captchaToken:body.captchaToken}});
   if(error||!id||!data?.session||data.session.user?.id!==id)return reply(error?.status===429?429:401,{error:'Código, senha ou verificação de segurança inválidos'});
   return reply(200,{session:{access_token:data.session.access_token,refresh_token:data.session.refresh_token}});
  }catch{return reply(500,{error:'Não foi possível entrar'});}
 };
}
