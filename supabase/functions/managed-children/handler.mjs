const CONSENT_VERSION = '2026-10-08';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Cache-Control': 'no-store' };
const reply = (status, body) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
export function createHandler(admin, random = crypto) {
 return async req => {
  if (req.method === 'OPTIONS') return new Response('ok', {headers: cors});
  if (req.method !== 'POST') return reply(405, {error:'Método inválido'});
  try {
   const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
   if (!token) return reply(401,{error:'Entre na sua conta de responsável'});
   const {data:auth,error:authError} = await admin.auth.getUser(token);
   const guardian = auth?.user;
   if (authError || !guardian) return reply(401,{error:'Sessão expirada'});
   if (!guardian.email_confirmed_at || guardian.app_metadata?.managed_child) return reply(403,{error:'Use uma conta de responsável com e-mail confirmado'});
   const text = await req.text();
   if (text.length > 4096) return reply(413,{error:'Solicitação muito grande'});
   let body; try {body=JSON.parse(text)} catch {return reply(400,{error:'Solicitação inválida'})}
   const {data:children,error:listError} = await admin.rpc('managed_children_for_guardian',{p_guardian:guardian.id});
   if(listError) return reply(503,{error:'Cadastro infantil indisponível'});
   if(body.action==='list') return reply(200,{children});
   if(body.action==='create') {
    if(body.consent!==true || body.adult!==true || body.consentVersion!==CONSENT_VERSION) return reply(400,{error:'Leia e confirme a autorização como responsável legal maior de 18 anos'});
    const name = typeof body.name==='string'?body.name.trim():'';
    if(!name || name.length>60 || typeof body.password!=='string' || body.password.length<12 || body.password.length>128) return reply(400,{error:'Informe um nome de até 60 caracteres e uma senha de 12 a 128 caracteres'});
    if(children.length>=5) return reply(409,{error:'Limite de cinco contas infantis por responsável'});
    const {data:member,error:memberError}=await admin.from('family_members').select('family_id,role').eq('user_id',guardian.id).eq('family_id',body.familyId).maybeSingle();
    if(memberError || !member || !['admin','adult'].includes(member.role)) return reply(403,{error:'Você precisa ser Adulto ou Administrador dessa família'});
    const code='N'+Array.from(random.getRandomValues(new Uint8Array(8)),n=>n.toString(16).padStart(2,'0')).join('').toUpperCase();
    // Internal Auth identifier only. It is never a mail recipient or a recovery channel.
    const email=random.randomUUID()+'@child.ninho.invalid';
    const {data:created,error:createError}=await admin.auth.admin.createUser({email,password:body.password,email_confirm:true,app_metadata:{managed_child:true},user_metadata:{name}});
    if(createError || !created?.user) return reply(400,{error:'Não foi possível criar a conta. Confira a senha e tente novamente'});
    const id=created.user.id;
    const {error:registerError}=await admin.rpc('register_managed_child',{p_child:id,p_guardian:guardian.id,p_family:member.family_id,p_code:code});
    if(registerError){await admin.auth.admin.deleteUser(id);return reply(409,{error:'Não foi possível vincular a criança. Atualize a família e tente novamente'});}
    return reply(201,{ok:true,child:{child_id:id,login_code:code,name,family_id:member.family_id}});
   }
   const child=children.find(c=>c.child_id===body.childId);
   if(!child) return reply(403,{error:'Conta infantil não autorizada'});
   if(body.action==='reset') {
    if(typeof body.password!=='string'||body.password.length<12||body.password.length>128) return reply(400,{error:'Use uma senha de 12 a 128 caracteres'});
    const {error}=await admin.auth.admin.updateUserById(child.child_id,{password:body.password});
    if(error)return reply(400,{error:'Não foi possível atualizar a senha'});
    return reply(200,{ok:true});
   }
   if(body.action==='delete'&&body.confirmation==='EXCLUIR') {
    const {error}=await admin.auth.admin.deleteUser(child.child_id);
    if(error)return reply(409,{error:'Não foi possível excluir a conta infantil'});
    return reply(200,{ok:true});
   }
   return reply(400,{error:'Ação inválida'});
  } catch {return reply(500,{error:'Não foi possível concluir. Tente novamente'});}
 };
}
