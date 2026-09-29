window.NinhoCloud=(()=>{
 const cfg=window.NINHO_CONFIG||{};
 const enabled=!!(cfg.supabaseUrl&&cfg.supabasePublishableKey&&window.supabase);
 const sb=enabled?window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storage:window.localStorage}}):null;
 let channel=null;
 async function signUp(email,password,name){if(!enabled)throw Error("Nuvem indisponível");const redirectTo=(location.protocol==="http:"||location.protocol==="https:")?(location.origin+location.pathname):undefined;const options={data:{name}};if(redirectTo)options.emailRedirectTo=redirectTo;const r=await sb.auth.signUp({email,password,options});if(r.error)throw r.error;if(r.data.session&&r.data.user){const pr=await sb.from("profiles").upsert({id:r.data.user.id,name:name||"",updated_at:new Date().toISOString()});if(pr.error)throw pr.error}return r}
 async function signIn(email,password){const r=await sb.auth.signInWithPassword({email,password});if(r.error)throw r.error;return r}
 async function resendConfirmation(email){if(!enabled)throw Error("Nuvem indisponível");const redirectTo=(location.protocol==="http:"||location.protocol==="https:")?(location.origin+location.pathname):undefined;const options={};if(redirectTo)options.emailRedirectTo=redirectTo;const {error}=await sb.auth.resend({type:"signup",email,options});if(error)throw error;return true}
 async function signOut(){return sb.auth.signOut()}
 async function session(){return (await sb.auth.getSession()).data.session}
 async function user(){return (await sb.auth.getUser()).data.user}
 async function profile(){const u=await user();if(!u)return null;let {data,error}=await sb.from("profiles").select("name,phone").eq("id",u.id).maybeSingle();if(error)throw error;if(!data){const name=u.user_metadata?.name||"";const ins=await sb.from("profiles").upsert({id:u.id,name,updated_at:new Date().toISOString()}).select("name,phone").single();if(!ins.error)data=ins.data}return {id:u.id,email:u.email,name:data?.name||u.user_metadata?.name||"",phone:data?.phone||""}}
 async function updateProfile({name,phone,email}){const u=await user();if(!u)throw Error("Sessão expirada");const {error}=await sb.from("profiles").upsert({id:u.id,name:name||"",phone:phone||null,updated_at:new Date().toISOString()});if(error)throw error;if(email&&email!==u.email){const x=await sb.auth.updateUser({email});if(x.error)throw x.error}await sb.auth.updateUser({data:{name:name||""}});return profile()}
 async function loadFamily(){const {data,error}=await sb.rpc("my_family");if(error)throw error;const f=Array.isArray(data)?data[0]:data;if(!f)return null;return {family_id:f.family_id,family_name:f.family_name,invite_code:f.invite_code,plan:f.plan,role:f.role,payload:f.payload}}
 async function saveFamily(familyId,payload){const {error}=await sb.from("family_snapshots").upsert({family_id:familyId,payload,updated_at:new Date().toISOString()});if(error)throw error}
 async function createFamily(name){const {data,error}=await sb.rpc("create_family",{family_name:name});if(error)throw error;return data}
 async function joinFamily(code){const {data,error}=await sb.rpc("join_family",{join_code:code.toUpperCase()});if(error)throw error;return data}
 function realtime(familyId,onChange){if(!familyId)return;if(channel)sb.removeChannel(channel);channel=sb.channel("family-"+familyId).on("postgres_changes",{event:"*",schema:"public",table:"family_snapshots",filter:`family_id=eq.${familyId}`},p=>onChange(p.new?.payload)).subscribe()}
 return {enabled,sb,signUp,signIn,resendConfirmation,signOut,session,user,profile,updateProfile,loadFamily,saveFamily,createFamily,joinFamily,realtime};
})();