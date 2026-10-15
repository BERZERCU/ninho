import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
test('weekly challenge: real reward ledger, spending independence, ties, rollover, choices and family isolation',async()=>{
 const db=new PGlite();try{
 for(const f of ['fixtures/base.sql','fixtures/family-rpcs.sql'])await db.exec(await readFile(new URL(f,import.meta.url),'utf8'));
 await db.exec('create table public.tasks(id uuid primary key,family_id uuid references public.families(id),title text,assignee_id uuid references auth.users(id),done boolean not null default false,created_by uuid references auth.users(id));');
 for(const f of ['20261015133506_qa_avatar_rewards.sql','20261015155325_qa_plus_features.sql','20261015174357_qa_weekly_challenge.sql'])await db.exec(await readFile(new URL('../../supabase/experiments/migrations/'+f,import.meta.url),'utf8'));
 const result=await db.exec(await readFile(new URL('../challenge-security.sql',import.meta.url),'utf8'));assert.match(result.at(-1).rows[0].result,/checks passed/);
 assert.equal((await db.query('select count(*)::int as n from auth.users')).rows[0].n,0);
 assert.equal((await db.query("select count(*)::int as n from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='private' and c.relname like 'qa_challenge_%' and c.relkind='r' and not c.relrowsecurity")).rows[0].n,0);
 assert.equal((await db.query("select date_trunc('week','2026-10-19 02:59:59+00'::timestamptz at time zone 'America/Sao_Paulo')::date::text as w")).rows[0].w,'2026-10-12');
 assert.equal((await db.query("select date_trunc('week','2026-10-19 03:00:00+00'::timestamptz at time zone 'America/Sao_Paulo')::date::text as w")).rows[0].w,'2026-10-19');
 }finally{await db.close()}
});
