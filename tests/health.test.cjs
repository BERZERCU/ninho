'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {recentBackup,validArtifact}=require('../scripts/health-check.cjs');
const now=Date.parse('2026-10-02T18:00:00Z');
const run=(hours,conclusion='success',extra={})=>({head_branch:'main',status:'completed',conclusion,created_at:new Date(now-hours*3600000).toISOString(),updated_at:new Date(now-hours*3600000).toISOString(),...extra});
test('fails on latest failure even with an older successful backup',()=>assert.throws(()=>recentBackup([run(1,'failure'),run(2)],now)));
test('fails on stale or missing backups',()=>{assert.throws(()=>recentBackup([run(37)],now));assert.throws(()=>recentBackup([],now));});
test('ignores skipped and unfinished runs and other branches',()=>{const good=run(3);assert.equal(recentBackup([run(0,'skipped'),run(1,null,{status:'in_progress'}),run(2,'failure',{head_branch:'qa'}),good],now),good);});
test('requires a nonempty unexpired encrypted artifact',()=>{assert.equal(validArtifact([{name:'ninho-encrypted-backup-1-1',size_in_bytes:10,expired:false}]),true);assert.equal(validArtifact([{name:'ninho-encrypted-backup-1',size_in_bytes:10,expired:true}]),false);assert.equal(validArtifact([{name:'plaintext',size_in_bytes:10,expired:false}]),false);});
