import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const gameRoot=path.resolve(here,"..");
const repoRoot=path.resolve(here,"../../..");
const serviceWorker=fs.readFileSync(path.join(repoRoot,"service-worker.js"),"utf8");
const cacheGuard=fs.readFileSync(path.join(gameRoot,"js/v10-41-cache-guard.js"),"utf8");

for(const prefix of ["/arcade/lost-sizzler/","/games/ccg-games/cheeky-commodore-quest/"]){
  assert.ok(serviceWorker.includes(`\"${prefix}\"`),`service worker must recognise Lost Sizzler path ${prefix}`);
  assert.ok(cacheGuard.includes(`\"${prefix}\"`),`in-page cache guard must recognise Lost Sizzler path ${prefix}`);
}

assert.match(serviceWorker,/const lostSizzler = isLostSizzlerPath\(url\.pathname\)/,"navigation routing must identify Lost Sizzler before selecting a cache strategy");
assert.match(serviceWorker,/fetch\(request, lostSizzler \? \{ cache: "reload" \} : undefined\)/,"Lost Sizzler navigation must bypass stale browser HTTP cache entries");
assert.match(serviceWorker,/if \(CODE_ASSET_PATTERN\.test\(url\.pathname\)\) \{\s*event\.respondWith\(networkFirstAsset\(request\)\)/,"code assets must remain network-first");
assert.match(serviceWorker,/if \(STATIC_ASSET_PATTERN\.test\(url\.pathname\)\) \{\s*event\.respondWith\(isLostSizzlerPath\(url\.pathname\) \? networkFirstAsset\(request\) : cacheFirstAsset\(request\)\)/,"Lost Sizzler images, audio, fonts and other static assets must be network-first while unrelated site assets retain cache-first behaviour");
assert.match(serviceWorker,/async function deleteLostSizzlerCacheEntries\(\)/,"service worker must retain a targeted Lost Sizzler cache purge path");
assert.match(cacheGuard,/if\(!gamePath\(request\?\.url\)\)continue;/,"in-page sanitation must delete only matching Lost Sizzler cache entries");
assert.match(cacheGuard,/registration\.update\(\)/,"in-page sanitation must request the current service-worker script when the release cache changes");

console.log("Lost Sizzler V10.41 page, code and static-asset cache-stack hardening checks passed.");