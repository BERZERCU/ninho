const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store'};
const reply=(status,body)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
export function createCloseHandler(admin,forUser){return async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return reply(405,{error:'Método inválido'});
 try{
  const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'');if(!token)return reply(401,{error:'Sessão expirada'});
  const {data,error}=await admin.auth.getUser(token);if(error||!data?.user)return reply(401,{error:'Sessão expirada'});
  const raw=await req.text();if(raw.length>1024)return reply(413,{error:'Solicitação muito grande'});
  let body;try{body=JSON.parse(raw)}catch{return reply(400,{error:'Solicitação inválida'})}
  if(body.confirmation!=='ENCERRAR'||typeof body.familyId!=='string'||!/^[0-9a-f-]{36}$/i.test(body.familyId))return reply(400,{error:'Digite ENCERRAR para confirmar'});
  const result=await forUser(token).rpc('close_single_member_family',{p_family:body.familyId,p_confirmation:body.confirmation});
  if(result.error)return reply(409,{error:result.error.message});
  const cleanup=await admin.rpc('family_closure_cleanup',{p_family:body.familyId,p_owner:data.user.id,p_complete:false});
  if(cleanup.error)return reply(200,{ok:true,cleanupPending:true});
  // Delete only paths belonging to the closed family. Service credentials never reach clients.
  const paths=cleanup.data||[];if(paths.some(path=>!path.startsWith(body.familyId+'/')))return reply(200,{ok:true,cleanupPending:true});
  for(let i=0;i<paths.length;i+=100){const removed=await admin.storage.from('task-proofs').remove(paths.slice(i,i+100));if(removed.error)return reply(200,{ok:true,cleanupPending:true});}
  const marked=await admin.rpc('family_closure_cleanup',{p_family:body.familyId,p_owner:data.user.id,p_complete:true});
  return reply(200,{ok:true,cleanupPending:!!marked.error});
 }catch{return reply(500,{error:'Não foi possível encerrar. Tente novamente'});}
};}
