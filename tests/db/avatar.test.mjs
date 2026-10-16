import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

test('QA avatars: single reward, assigned recipient, boost, purchases, ownership and access control',async()=>{
 const db=new PGlite();try{
 for(const file of ['fixtures/base.sql','fixtures/family-rpcs.sql'])await db.exec(await readFile(new URL(file,import.meta.url),'utf8'));
 await db.exec('create table public.tasks(id uuid primary key,family_id uuid references public.families(id),title text,assignee_id uuid references auth.users(id),done boolean not null default false,created_by uuid references auth.users(id));');
 await db.exec(await readFile(new URL('../../supabase/experiments/migrations/20261015133506_qa_avatar_rewards.sql',import.meta.url),'utf8'));
 const results=await db.exec(await readFile(new URL('../avatar-security.sql',import.meta.url),'utf8'));
 assert.match(results.at(-1).rows[0].result,/avatar checks passed/);
 assert.equal((await db.query('select count(*)::int as n from auth.users')).rows[0].n,0);
 assert.equal((await db.query('select count(*)::int as n from private.qa_avatar_rewards')).rows[0].n,0);
 assert.equal((await db.query("select count(*)::int as n from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='private' and c.relname like 'qa_avatar_%' and c.relkind='r' and not c.relrowsecurity")).rows[0].n,0);
 }finally{await db.close()}
});
