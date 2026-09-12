import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptUrl = new URL('../../../scripts/assemble-lost-sizzler-desktop-staging.mjs', import.meta.url);
const scriptPath = fileURLToPath(scriptUrl);
const source = readFileSync(scriptUrl, 'utf8');

assert.match(source, /APPLICATION_ID = 'uk\.co\.cheekycommodoregamer\.c64-dungeon-carnage'/,
  'desktop staging must keep a stable application identity');
assert.match(source, /PROFILE_ID = 'ccg-c64-dungeon-carnage'/,
  'desktop staging must keep a version-independent persistence identity');
assert.match(source, /mode: 'desktop-offline'/,
  'offline delivery mode must be fixed before a wrapper consumes the staging metadata');
assert.match(source, /entrypoint: ENTRYPOINT/);
assert.match(source, /versionManifest: VERSION_MANIFEST/);
assert.match(source, /catalogue: CATALOGUE/);
assert.match(source, /injectBefore: null/,
  'current verified offline package must not claim an injection target that is absent from the package manifest');
assert.doesNotMatch(source, /ONLINE_GATE|online-services-gate\.js/,
  'desktop staging must not require the unpromoted containment-only online-services gate');
assert.match(source, /onlineScripts: null/,
  'offline staging must not contain online service script locations');
assert.match(source, /websiteRootSupabaseBootstrapAllowed: false/,
  'offline staging must reject website-root Supabase bootstrap');
assert.match(source, /rendererArbitraryFilesystemAccessAllowed: false/);
assert.match(source, /rendererArbitraryProcessExecutionAllowed: false/);
assert.match(source, /externalNavigation: 'system-browser-allowlist'/);
assert.match(source, /nativeBridge: 'narrow-capabilities-only'/);
assert.match(source, /validateHandoff\(handoffRoot\)/,
  'the incoming release handoff must be verified before staging');
assert.match(source, /Verified handoff application check/);
assert.match(source, /Verified handoff provenance check/);
assert.match(source, /Desktop staging output must not already exist/,
  'staging evidence must be immutable rather than silently overwritten');
assert.match(source, /Desktop staging refuses symbolic links/,
  'wrapper input must not inherit symlink escapes');
assert.doesNotMatch(source, /electron|tauri|webview2/i,
  'this boundary must remain framework-neutral');
assert.doesNotMatch(source, /supabase\.co|s3\.|r2\.cloudflarestorage|storage\.googleapis/i,
  'staging must not choose or expose a storage provider');

const run = spawnSync(process.execPath, [scriptPath, '--self-test'], { encoding: 'utf8' });
assert.equal(run.status, 0, `desktop staging self-test failed:\n${run.stderr || run.stdout}`);
assert.match(run.stdout, /desktop staging self-test passed/i);

console.log('C64 Dungeon Carnage desktop staging regression contract passed.');
