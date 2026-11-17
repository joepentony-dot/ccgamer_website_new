import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const api=readFileSync(new URL('../supabase/functions/ccg-arena-submit/index.ts',import.meta.url),'utf8');

test('server validates signed-in identity independently of client-supplied IDs',()=>{
  assert.match(api,/auth\.getUser\(token\)/);
  assert.match(api,/\.eq\('user_id',userId\)/);
  assert.match(api,/SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(api,/userId\s*=\s*input\./);
  assert.doesNotMatch(api,/console\.(log|error|warn)\s*\(/);
});
test('automatic client score submission is quarantined for review, never auto-ranked',()=>{
  assert.match(api,/status:'submitted'/);
  assert.match(api,/status:'pending-review'/);
  assert.match(api,/publicRankingUpdated:false/);
  assert.doesNotMatch(api,/\.from\(['"]ccg_arena_(personal_bests|alltime_public|challenge_bests|challenge_public)['"]\)/);
  assert.doesNotMatch(api,/status\s*:\s*['"]approved['"]/);
});
test('single-use secret and atomic started-only updates protect against replay',()=>{
  assert.match(api,/crypto\.randomUUID\(\)/);
  assert.match(api,/nonce_sha256/);
  assert.match(api,/constantTimeEqual\(/);
  assert.match(api,/\.eq\('status','started'\)/);
  assert.match(api,/\.select\('id'\)\.maybeSingle\(\)/);
  assert.match(api,/maxStartsPerHour/);
});
test('CORS and body bounds reject unexpected browser calls',()=>{
  assert.match(api,/ORIGINS\.has\(origin\)/);
  assert.match(api,/if\(req\.method!=='POST'\)/);
  assert.match(api,/maxRequestBytes/);
  assert.match(api,/raw\)\.byteLength>MAX/);
  assert.match(api,/Access-Control-Allow-Origin/);
});
