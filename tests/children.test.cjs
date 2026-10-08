const test=require('node:test');
const assert=require('node:assert/strict');
const load=()=>import('../supabase/functions/managed-children/handler.mjs');
const login=()=>import('../supabase/functions/child-login/handler.mjs');
const request=(body,token='guardian')=>new Request('https://qa.invalid',{method:'POST',headers:token?{authorization:'Bearer '+token}:{},body:JSON.stringify(body)});
function mock({user={id:'g',email_confirmed_at:'now',app_metadata:{}},children=[],registerError=null}={}) {
 const calls=[];
 const admin={auth:{getUser:async()=>({data:{user}}),admin:{createUser:async attributes=>{calls.push(['create',attributes]);return {data:{user:{id:'new'}}}},deleteUser:async id=>{calls.push(['delete',id]);return{}},updateUserById:async id=>{calls.push(['reset',id]);return{}}}},rpc:async(name,args)=>{calls.push([name,args]);return name==='managed_children_for_guardian'?{data:children}:{error:registerError}},from:()=>({select:()=>({eq:()=>({eq:()=>({maybeSingle:async()=>({data:{family_id:'f',role:'adult'}})})})})})};
 return {admin,calls};
}
test('anonymous and managed child cannot create child accounts',async()=>{
 const {createHandler}=await load();let m=mock();assert.equal((await createHandler(m.admin)(request({},null))).status,401);
 m=mock({user:{id:'c',email_confirmed_at:'now',app_metadata:{managed_child:true}}});assert.equal((await createHandler(m.admin)(request({action:'create'}))).status,403);assert.equal(m.calls.length,0);
});
test('authorization requires both explicit declarations and current version',async()=>{
 const {createHandler}=await load();const m=mock();for(const fields of [{consent:true},{adult:true},{consent:true,adult:true,consentVersion:'old'}])assert.equal((await createHandler(m.admin)(request({action:'create',...fields}))).status,400);
 assert.ok(!m.calls.some(c=>c[0]==='create'));
});
test('stranger cannot reset or delete another child',async()=>{
 const {createHandler}=await load();const m=mock({children:[{child_id:'owned'}]});for(const action of ['reset','delete'])assert.equal((await createHandler(m.admin)(request({action,childId:'other',password:'validpassword!1',confirmation:'EXCLUIR'}))).status,403);
 assert.ok(!m.calls.some(c=>['reset','delete'].includes(c[0])));
});
test('failed attachment compensates Auth creation and retains managed-child flag',async()=>{
 const {createHandler}=await load();const m=mock({registerError:{message:'race'}});
 const res=await createHandler(m.admin)(request({action:'create',consent:true,adult:true,consentVersion:'2026-10-08',familyId:'f',name:'Child',password:'validpassword!1'}));
 assert.equal(res.status,409);assert.equal(m.calls.find(c=>c[0]==='create')[1].app_metadata.managed_child,true);assert.ok(m.calls.some(c=>c[0]==='delete'&&c[1]==='new'));
});
test('successful create returns code and no password or internal email',async()=>{
 const {createHandler}=await load();const m=mock();const res=await createHandler(m.admin)(request({action:'create',consent:true,adult:true,consentVersion:'2026-10-08',familyId:'f',name:'Child',password:'validpassword!1'}));
 assert.equal(res.status,201);const payload=await res.json();assert.match(payload.child.login_code,/^N[0-9A-F]{16}$/);assert.equal(payload.password,undefined);assert.equal(payload.email,undefined);
});
test('unknown code still passes through Auth with CAPTCHA and returns no session',async()=>{
 const {createLoginHandler}=await login();let attempted;const admin={rpc:async()=>({data:null})};const auth={auth:{signInWithPassword:async args=>{attempted=args;return {error:{status:400}}}}};
 const res=await createLoginHandler(admin,auth)(request({code:'N1234567890ABCDEF',password:'secret',captchaToken:'captcha'}));assert.equal(res.status,401);assert.equal(attempted.options.captchaToken,'captcha');assert.equal((await res.json()).session,undefined);
});
test('login creates a session only for the mapped managed account',async()=>{
 const {createLoginHandler}=await login();const admin={rpc:async()=>({data:'c'}),auth:{admin:{getUserById:async()=>({data:{user:{email:'internal@child.ninho.invalid',app_metadata:{managed_child:true}}}})}}};const auth={auth:{signInWithPassword:async()=>({data:{session:{access_token:'access',refresh_token:'refresh',user:{id:'c',email:'internal'}}}})}};
 const res=await createLoginHandler(admin,auth)(request({code:'N1234567890ABCDEF',password:'secret'}));assert.equal(res.status,200);assert.deepEqual(await res.json(),{session:{access_token:'access',refresh_token:'refresh'}});
});
