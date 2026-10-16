import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
test('production migration: rewards, plans, recurrence, finance privacy, weekly challenge and complete sets',async()=>{
 const db=new PGlite();try{
 for(const f of ['fixtures/base.sql','fixtures/family-rpcs.sql'])await db.exec(await readFile(new URL(f,import.meta.url),'utf8'));
 await db.exec('create table public.tasks(id uuid primary key,family_id uuid references public.families(id),title text,assignee_id uuid references auth.users(id),done boolean not null default false,created_by uuid references auth.users(id));create schema cron;create function cron.schedule(text,text,text) returns bigint language sql as $$select 1::bigint$$;');
 const files=await readdir(new URL('../../supabase/migrations/',import.meta.url));const filename=files.find(f=>f.endsWith('_avatar_plus_release.sql'));
 await db.exec(await readFile(new URL('../../supabase/migrations/'+filename,import.meta.url),'utf8'));
 assert.equal((await db.query("select to_regprocedure('public.ninho_avatar_simulate_plan(uuid,text)') is null as absent")).rows[0].absent,true);
 assert.equal((await db.query("select to_regclass('private.ninho_test_point_users') is null as absent")).rows[0].absent,true);
 for(const suite of ['avatar','plus','challenge','sets']){const r=await db.exec(await readFile(new URL('../'+suite+'-security.sql',import.meta.url),'utf8'));assert.match(r.at(-1).rows[0].result,/checks passed/);}
 assert.equal((await db.query('select count(*)::int n from auth.users')).rows[0].n,0);
 assert.equal((await db.query("select count(*)::int n from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='private' and c.relname like 'ninho_%' and c.relkind='r' and not c.relrowsecurity")).rows[0].n,0);
 }finally{await db.close()}
});
