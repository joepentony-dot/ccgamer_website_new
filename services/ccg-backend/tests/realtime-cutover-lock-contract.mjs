import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const SERVICE_ROOT = fileURLToPath(new URL('../', import.meta.url));
const REPO_ROOT = path.resolve(SERVICE_ROOT, '../..');

async function text(relativePath) {
  return readFile(path.join(REPO_ROOT, relativePath), 'utf8');
}

const network = await text('arcade/lost-sizzler/js/network.js');
const page = await text('arcade/lost-sizzler/index.html');
const gate = await text('arcade/lost-sizzler/js/online-services-gate.js');
const config = await text('services/ccg-backend/src/config.mjs');
const server = await text('services/ccg-backend/src/server.mjs');
const migrationPlan = await text('services/ccg-backend/LOST-SIZZLER-REALTIME-MIGRATION.md');

assert.match(network, /async getSupabase\(\)/, 'Production RoomNetwork must remain on the existing provider boundary until cut-over is approved.');
assert.match(network, /joinSupabase\(/, 'Production RoomNetwork must retain its current Supabase-shaped channel path while the compatibility facade remains non-production.');
assert.doesNotMatch(network, /createLostSizzlerRealtimeSupabaseAdapter|services\/ccg-backend|\/v1\/lost-sizzler\/realtime/, 'Production network.js must not directly load the CCG realtime replacement while the cut-over lock is active.');

for (const [label, source] of [
  ['Lost Sizzler page', page],
  ['online-services gate', gate],
]) {
  assert.doesNotMatch(
    source,
    /createLostSizzlerRealtimeSupabaseAdapter|services\/ccg-backend\/client\/lost-sizzler-realtime|CCG_LOST_SIZZLER_REALTIME_ENABLED/,
    `${label} must not activate the CCG realtime replacement while the cut-over lock is active.`
  );
}

assert.match(
  config,
  /lostSizzlerRealtimeEnabled:\s*readBooleanEnv\(['"]CCG_LOST_SIZZLER_REALTIME_ENABLED['"],\s*false\)/,
  'Backend realtime must remain disabled by default.'
);
assert.match(
  server,
  /config\.lostSizzlerRealtimeEnabled\s*\?\s*createLostSizzlerRealtimeWebSocketTransport/,
  'Production server must attach Lost Sizzler realtime only behind the explicit opt-in flag.'
);

assert.match(migrationPlan, /not wired into the live game yet/i);
assert.match(migrationPlan, /Supabase Realtime remains the source\/production provider until that sequence is deliberately accepted/i);

const workflowDir = path.join(REPO_ROOT, '.github/workflows');
for (const entry of await readdir(workflowDir, { withFileTypes: true })) {
  if (!entry.isFile() || !/\.ya?ml$/i.test(entry.name)) continue;
  const workflow = await readFile(path.join(workflowDir, entry.name), 'utf8');
  const enabledAssignment = /CCG_LOST_SIZZLER_REALTIME_ENABLED\s*:\s*['"]?true['"]?/i.test(workflow)
    || /CCG_LOST_SIZZLER_REALTIME_ENABLED=true/i.test(workflow);
  assert.equal(
    enabledAssignment,
    false,
    `${entry.name} must not enable Lost Sizzler realtime from repository CI/deployment automation before explicit cut-over approval.`
  );
}

console.log('Lost Sizzler realtime cut-over lock passed: the CCG replacement remains backend-only, disabled by default, absent from the live page/network provider, and cannot be enabled by current repository workflows.');
