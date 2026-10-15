const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function harness({deleted=false,offline=false,child=true}={}){
 const elements=new Map();
 const $=selector=>{if(!elements.has(selector)){const classes=new Set(['hide','open']);elements.set(selector,{value:'OLD-CODE',textContent:'',classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),toggle:(x,v)=>v?classes.add(x):classes.delete(x)}})}return elements.get(selector)};
 let signedOut=0,channels=[];
 const context={$, $$:()=>[],NINHO_USER:{id:'child',managedChild:child},NINHO_FAMILY:{id:'old',role:child?'child':'adult'},K:'old-data',data:{},familyActivityItems:[],emptyData:()=>({members:[],tasks:[],events:[],shopping:[]}),useUserStorage(){},localStorage:{removeItem(){},setItem(){}},render(){},updateActivityBadge(){},refreshSettings(){},console,
 NinhoCloud:{async user(){if(offline)throw Error('network unavailable');return deleted?null:{id:'child'}},async loadFamily(){return null},realtime:id=>channels.push(id),async signOut(){signedOut++}},
 authScreen:$('#authScreen'),verifyEmailScreen:$('#verifyEmailScreen'),resetPasswordScreen:$('#resetPasswordScreen'),onboarding:$('#onboarding')};
 const src=fs.readFileSync('js/app.js','utf8');vm.createContext(context);vm.runInContext(src.slice(src.indexOf('function showFamilyOnboarding()'),src.indexOf('$("#createFamily").onclick=')),context);
 return {context,$,signedOut:()=>signedOut,channels};
}
test('detached child sees join and exit, no create, and old code is cleared',async()=>{const h=harness();await h.context.bootCloud();assert.equal(h.$('#createFamily').classList.contains('hide'),true);assert.equal(h.$('#onboarding').classList.contains('hide'),false);assert.equal(h.$('#inviteCode').value,'');assert.deepEqual(h.channels,[null]);assert.equal(typeof h.$('#onboardingLogout').onclick,'function')});
test('deleted child exits session and onboarding instead of getting stuck',async()=>{const h=harness({deleted:true});await h.context.refreshMembership();assert.equal(h.signedOut(),1);assert.equal(h.context.NINHO_USER.id,null);assert.equal(h.$('#onboarding').classList.contains('hide'),true);assert.equal(h.$('#authScreen').classList.contains('hide'),false)});
test('onboarding exit works without a family',async()=>{const h=harness();await h.context.bootCloud();await h.$('#onboardingLogout').onclick();assert.equal(h.signedOut(),1);assert.equal(h.$('#onboarding').classList.contains('hide'),true)});
test('network failure does not sign out an offline user',async()=>{const h=harness({offline:true});await assert.rejects(h.context.refreshMembership(),/network/);assert.equal(h.signedOut(),0);assert.equal(h.context.NINHO_USER.id,'child')});
test('adult onboarding retains family creation',async()=>{const h=harness({child:false});await h.context.bootCloud();assert.equal(h.$('#createFamily').classList.contains('hide'),false)});
test('Auth deletion clears identity but a network error is propagated',async()=>{
 let response={data:{user:null},error:{status:404,code:'user_not_found'}};
 const sb={auth:{getUser:async()=>response}};
 const context={window:{NINHO_CONFIG:{supabaseUrl:'https://backend.example',supabasePublishableKey:'public'},supabase:{createClient:()=>sb},localStorage:{}}};
 vm.runInNewContext(fs.readFileSync('js/cloud.js','utf8'),context);
 assert.equal(await context.window.NinhoCloud.user(),null);
 response={data:{user:null},error:{name:'AuthRetryableFetchError',status:0}};
 await assert.rejects(context.window.NinhoCloud.user());
});
