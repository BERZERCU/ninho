import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import webpush from 'npm:web-push@3.6.7';

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {auth:{persistSession:false}});
const cors = {'Access-Control-Allow-Origin':'https://ninho-app-zeta.vercel.app','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'GET, POST, OPTIONS'};
const json = (data: unknown, status=200) => new Response(JSON.stringify(data), {status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
function message(a: any, actor: string) {
 const title = `“${String(a.title||'').slice(0,140)}”`;
 const label = ({task:'tarefa',event:'compromisso',shopping:'item de compras',member:'membro'} as any)[a.entity_type] || 'item';
 const verbs: Record<string,string> = {created:'adicionou',updated:'atualizou',deleted:'excluiu',completed:a.entity_type==='shopping'?'comprou':'concluiu',reopened:'reabriu',proof_updated:'adicionou comprovante à'};
 if(a.action==='member_joined') return `${String(a.title||actor).slice(0,80)} entrou na família`;
 if(a.action==='member_removed') return `${actor} removeu ${title} da família`;
 if(a.action==='member_role_changed') return `${actor} alterou o perfil de ${title}`;
 return `${actor} ${verbs[a.action]||'atualizou'} ${label} ${title}`;
}
function allowed(endpoint: string) {
 try {const u=new URL(endpoint);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&(/^(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com)$/.test(u.hostname)||u.hostname==='web.push.apple.com'||u.hostname.endsWith('.push.apple.com')||u.hostname.endsWith('.notify.windows.com'));} catch {return false;}
}
Deno.serve(async req => {
 if(req.method==='OPTIONS') return new Response(null,{headers:cors});
 // GET exposes only the public VAPID key; private material never leaves the worker.
 if(req.method!=='GET'&&req.method!=='POST') return json({error:'Method not allowed'},405);
 try {
  const {data:cfg,error}=await sb.rpc('push_worker_config');
  if(error||!cfg?.ninho_push_public||!cfg?.ninho_push_private||!cfg?.ninho_push_dispatch) return json({error:'Push unavailable'},503);
  if(req.method==='GET') return json({publicKey:cfg.ninho_push_public});
  const token=req.headers.get('x-ninho-push-token')||'';
  if(token.length!==cfg.ninho_push_dispatch.length||token!==cfg.ninho_push_dispatch) return json({error:'Unauthorized'},401);
  const {data:jobs,error:claimError}=await sb.rpc('claim_family_push');
  if(claimError) throw claimError;
  let sent=0,failed=0,skipped=0;
  await Promise.all((jobs||[]).map(async (job:any)=>{
   let status=204,done=true;
   try {
    // Recheck access immediately before sending, including preference changes and removal.
    const [sub,membership]=await Promise.all([
     sb.from('push_subscriptions').select('enabled').eq('id',job.subscription_id).eq('user_id',job.user_id).maybeSingle(),
     sb.from('family_members').select('user_id').eq('family_id',job.activity.family_id).eq('user_id',job.user_id).maybeSingle()
    ]);
    if(sub.error||membership.error) throw Error('Eligibility check failed');
    if(!job.eligible||!sub.data?.enabled||!membership.data||!allowed(job.endpoint)){skipped++;}
    else {
     const view=({task:'tasks',event:'agenda',shopping:'shopping'} as any)[job.activity.entity_type]||'today';
     const payload=JSON.stringify({title:'Ninho 🐣',body:message(job.activity,String(job.actor_name).slice(0,80)),tag:'ninho-'+job.activity.id,url:'/?view='+view});
     const response=await webpush.sendNotification({endpoint:job.endpoint,keys:job.keys},payload,{vapidDetails:{subject:'mailto:supportlevia.ninho@gmail.com',publicKey:cfg.ninho_push_public,privateKey:cfg.ninho_push_private},TTL:3600,urgency:'normal',timeout:10000});
     status=response.statusCode;sent++;
    }
   } catch(e:any) {
    status=Number(e?.statusCode)||0;
    done=status===404||status===410||status===400||status===413;
    if(status===404||status===410) await sb.from('push_subscriptions').delete().eq('id',job.subscription_id);
    failed++;
   }
   const {error:finishError}=await sb.rpc('finish_family_push',{p_delivery:job.delivery_id,p_status:status,p_done:done});
   if(finishError) throw Error('Delivery update failed');
  }));
  return json({ok:true,processed:jobs?.length||0,sent,failed,skipped});
 } catch {return json({error:'Push processing failed'},500);}
});
