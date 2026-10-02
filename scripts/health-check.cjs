'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const SITE = 'https://ninho-app-zeta.vercel.app';
function recentBackup(runs, now = Date.now()) {
  const completed = runs.filter(r => r.head_branch === 'main' && r.status === 'completed' && r.conclusion !== 'skipped').sort((a,b) => Date.parse(b.created_at)-Date.parse(a.created_at));
  if (!completed.length) throw Error('Nenhum backup concluído encontrado');
  const latest = completed[0];
  if (latest.conclusion !== 'success') throw Error('A última execução de backup falhou');
  const age = now - Date.parse(latest.updated_at);
  if (!Number.isFinite(age) || age < 0 || age > 36*3600000) throw Error('Backup sem sucesso nas últimas 36 horas');
  return latest;
}
function validArtifact(artifacts) {
  return artifacts.some(a => !a.expired && a.size_in_bytes > 0 && /^ninho-encrypted-backup-/.test(a.name));
}
async function request(url, headers = {}) {
  const response = await fetch(url, {headers, signal: AbortSignal.timeout(20000), cache:'no-store'});
  if (!response.ok) throw Error('HTTP '+response.status);
  return response;
}
async function main() {
  const context = {window:{}};
  vm.runInNewContext(fs.readFileSync('js/config.js','utf8'),context,{timeout:1000});
  const cfg = context.window.NINHO_CONFIG;
  if (cfg.supabaseUrl !== 'https://cspwqboqchwdsknfdakh.supabase.co') throw Error('Monitor requer configuração de produção');
  const results = [];
  async function check(label, task) {
    const started=Date.now();
    try { await task(); results.push({label,ok:true,ms:Date.now()-started}); }
    catch(error) { results.push({label,ok:false,ms:Date.now()-started,reason:error.message}); }
  }
  await Promise.all([
    check('Site e scripts essenciais',async()=>{
      const html=await (await request(SITE+'/')).text();
      if (!html.includes('js/config.js') || !html.includes('js/app.js')) throw Error('HTML sem scripts esperados');
      await Promise.all(['js/app.js','js/cloud.js','js/push.js','sw.js'].map(async path=>{
        const response=await request(SITE+'/'+path);
        if (!(response.headers.get('content-type')||'').includes('javascript')) throw Error('Tipo de script inesperado');
        if (!(await response.text()).trim()) throw Error('Script vazio');
      }));
      const deployed=await (await request(SITE+'/js/config.js')).text();
      if (!deployed.includes(cfg.supabaseUrl) || !deployed.includes(cfg.supabasePublishableKey)) throw Error('Configuração publicada difere da produção');
    }),
    check('Supabase Auth',async()=>{
      const settings=await (await request(cfg.supabaseUrl+'/auth/v1/settings',{apikey:cfg.supabasePublishableKey})).json();
      if (!settings || typeof settings.external !== 'object') throw Error('Resposta Auth inesperada');
    }),
    check('Banco e Data API',async()=>{
      const rows=await (await request(cfg.supabaseUrl+'/rest/v1/profiles?select=id&limit=0',{apikey:cfg.supabasePublishableKey})).json();
      if (!Array.isArray(rows) || rows.length) throw Error('Resposta Data API inesperada');
    }),
    check('Endpoint público do Push',async()=>{
      const config=await (await request(cfg.supabaseUrl+'/functions/v1/family-push')).json();
      if (typeof config.publicKey !== 'string' || !/^[A-Za-z0-9_-]{80,100}$/.test(config.publicKey)) throw Error('Chave pública Push indisponível');
    }),
    check('Backup recente e arquivo disponível',async()=>{
      if (process.env.NINHO_BACKUP_ENABLED !== 'true') throw Error('Agendamento de backup desativado');
      const token=process.env.GITHUB_TOKEN;
      if (!token) throw Error('Token de leitura Actions indisponível');
      const headers={Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
      const base='https://api.github.com/repos/'+process.env.GITHUB_REPOSITORY;
      const response=await request(base+'/actions/workflows/backup.yml/runs?branch=main&per_page=100',headers);
      const run=recentBackup((await response.json()).workflow_runs);
      const artifacts=await (await request(base+'/actions/runs/'+run.id+'/artifacts',headers)).json();
      if (!validArtifact(artifacts.artifacts)) throw Error('Backup sem arquivo criptografado disponível');
    })
  ]);
  for (const row of results) console.log(JSON.stringify(row));
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
    '# Saúde do Ninho\n\n'+results.map(r=>'- '+(r.ok?'✅':'❌')+' '+r.label+' ('+r.ms+' ms)'+(r.reason?': '+r.reason:'')).join('\n')+'\n\nVerificação de disponibilidade; não substitui testes de login, permissões, Realtime ou entrega de e-mail/Push.\n');
  if (results.some(r=>!r.ok)) process.exitCode=1;
}
module.exports={recentBackup,validArtifact};
if(require.main===module) main().catch(()=>{console.error('Falha ao iniciar monitor; confira a configuração.');process.exitCode=1;});
