const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {draw}=require('../js/avatar-art.js');
test('avatars use deterministic SVG layers and reject arbitrary style markup',()=>{
 const fallback=draw();assert.match(fallback,/viewBox="0 0 120 140"/);assert(!fallback.includes('undefined'));
 const invalid=draw({skin:'<script>alert(1)</script>',equipped:{top:'<img src=x>',hair:'javascript:alert(1)',accessory:'<script>'}});
 assert.equal(invalid,fallback);
 assert.notEqual(draw({skin:'deep',equipped:{top:'top_sun',hair:'hair_curls',accessory:'accessory_cap'}}),fallback);
 for(const a of ['accessory_none','accessory_cap','accessory_glasses','accessory_star'])assert(!draw({equipped:{accessory:a}}).includes('http://',draw().indexOf('xmlns=')+50));
});
test('production avatars reject the QA backend and disabled feature flag',()=>{
 for(const config of [{avatarFeatures:true,supabaseUrl:'https://mqpjujirwooqzzirzwrr.supabase.co'},{avatarFeatures:false,supabaseUrl:'https://cspwqboqchwdsknfdakh.supabase.co'}]){
 const ctx={window:{NINHO_CONFIG:config},document:{createElement(){throw Error('UI must not initialize')}},NinhoCloud:{sb:{rpc(){throw Error('RPC must not run')}}}};
 vm.runInNewContext(fs.readFileSync('js/avatars.js','utf8'),ctx);assert.equal(ctx.window.NinhoAvatar,undefined);
 }
});
test('production keeps its backend and excludes QA credits/simulation',()=>{
 const config=fs.readFileSync('js/config.js','utf8');assert(config.includes('cspwqboqchwdsknfdakh'));assert(!config.includes('mqpjujirwooqzzirzwrr'));
 const file=fs.readdirSync('supabase/migrations').find(n=>n.endsWith('_avatar_plus_release.sql'));const sql=fs.readFileSync('supabase/migrations/'+file,'utf8');assert(!sql.includes('qa_'));assert(!sql.includes('test_point'));assert(!sql.includes('simulate_plan'));assert(!sql.includes('avatar_plans'));
 for(const f of ['js/avatars.js','js/plus.js','js/challenge.js'])assert(!fs.readFileSync(f,'utf8').includes('mqpjujirwooqzzirzwrr'));
});

test('cap tucks hair underneath and removing it restores the chosen hairstyle',()=>{
 const chosen={skin:'medium',equipped:{hair:'hair_curls',accessory:'accessory_cap'}};
 const worn=draw(chosen);assert(!worn.includes('M27 58C17 52'));
 const removed=draw({...chosen,equipped:{...chosen.equipped,accessory:'accessory_none'}});
 assert(removed.includes('M27 58C17 52'));assert.equal(chosen.equipped.hair,'hair_curls');
});

test('complete character sets render safely without altering the custom avatar fallback',()=>{
 const sets=require('../js/avatar-sets-art.js'),art=require('../js/avatar-art.js');
 for(const id of ['set_lisbon','set_jane','set_deku','set_heisenberg','set_gus']){const svg=art.draw({equipped:{set:id,accessory:'accessory_cap'}});assert.match(svg,/viewBox="0 0 160 200"/);assert.doesNotMatch(svg,/script|onload|href=/);assert.equal(svg,sets.draw(id));}
 assert.equal(sets.draw('__proto__'),null);assert.equal(sets.draw('<script>'),null);assert.match(art.draw({equipped:{set:'invalid'}}),/viewBox="0 0 120 140"/);
});
