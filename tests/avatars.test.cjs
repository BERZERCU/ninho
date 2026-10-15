const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {draw}=require('../js/avatar-art.js');
test('avatars use deterministic SVG layers and reject arbitrary style markup',()=>{
 const fallback=draw();assert.match(fallback,/viewBox="0 0 120 140"/);assert(!fallback.includes('undefined'));
 const invalid=draw({skin:'<script>alert(1)</script>',equipped:{top:'<img src=x>',hair:'javascript:alert(1)',accessory:'<script>'}});
 assert.equal(invalid,fallback);
 assert.notEqual(draw({skin:'deep',equipped:{top:'top_sun',hair:'hair_curls',accessory:'accessory_cap'}}),fallback);
 for(const a of ['accessory_none','accessory_cap','accessory_glasses','accessory_star'])assert(!draw({equipped:{accessory:a}}).includes('http://',draw().indexOf('xmlns=')+50));
});
test('avatar experiment cannot initialize on original backend or without its flag',()=>{
 for(const config of [{avatarExperiment:true,supabaseUrl:'https://cspwqboqchwdsknfdakh.supabase.co'},{avatarExperiment:false,supabaseUrl:'https://mqpjujirwooqzzirzwrr.supabase.co'}]){
 const ctx={window:{NINHO_CONFIG:config},document:{createElement(){throw Error('UI must not initialize')}},NinhoCloud:{sb:{rpc(){throw Error('RPC must not run')}}}};
 vm.runInNewContext(fs.readFileSync('js/avatars.js','utf8'),ctx);assert.equal(ctx.window.NinhoAvatar,undefined);
 }
});
test('QA config stays isolated and experiment migration cannot be auto-applied to production',()=>{
 const src=fs.readFileSync('js/config.js','utf8');assert(src.includes('mqpjujirwooqzzirzwrr'));assert(!src.includes('cspwqboqchwdsknfdakh'));
 assert.equal(fs.readdirSync('supabase/migrations').filter(n=>n.includes('avatar')).length,0);
 assert(fs.readdirSync('supabase/experiments/migrations').some(n=>n.includes('qa_avatar_rewards')));
});
