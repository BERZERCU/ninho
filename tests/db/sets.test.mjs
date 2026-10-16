import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
test('complete sets are one purchase, single debit, owned equip, persistence and family-isolated',async()=>{
 const db=new PGlite();try{
 for(const f of ['fixtures/base.sql','fixtures/family-rpcs.sql'])await db.exec(await readFile(new URL(f,import.meta.url),'utf8'));
 await db.exec('create table public.tasks(id uuid primary key,family_id uuid references public.families(id),title text,assignee_id uuid references auth.users(id),done boolean not null default false,created_by uuid references auth.users(id));');
 for(const f of ['20261015133506_qa_avatar_rewards.sql','20261016122618_qa_avatar_complete_sets.sql'])await db.exec(await readFile(new URL('../../supabase/experiments/migrations/'+f,import.meta.url),'utf8'));
 const r=await db.exec(await readFile(new URL('../sets-security.sql',import.meta.url),'utf8'));assert.match(r.at(-1).rows[0].result,/checks passed/);
 assert.equal((await db.query('select count(*)::int n from auth.users')).rows[0].n,0);
 }finally{await db.close()}
});
