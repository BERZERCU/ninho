import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('complete managed child migration installs on empty PostgreSQL and security fixtures roll back', async () => {
  const db = new PGlite();
  try {
    for (const path of ['fixtures/base.sql', 'fixtures/family-rpcs.sql', '../../supabase/migrations/20261008113832_managed_children.sql']) {
      await db.exec(await readFile(new URL(path, import.meta.url), 'utf8'));
    }
    const checks = await db.exec(await readFile(new URL('../children-security.sql', import.meta.url), 'utf8'));
    assert.match(checks.at(-1).rows[0].result, /checks passed/);
    assert.equal((await db.query('select count(*)::int as count from auth.users')).rows[0].count, 0);
    assert.equal((await db.query('select count(*)::int as count from private.managed_children')).rows[0].count, 0);
    assert.equal((await db.query("select relrowsecurity from pg_class where oid='private.managed_children'::regclass")).rows[0].relrowsecurity, true);
  } finally {
    await db.close();
  }
});
