import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const version=JSON.parse(fs.readFileSync(path.join(root,"version.json"),"utf8"));
const bootstrap=fs.readFileSync(path.join(root,"js/v10-42-bootstrap.js"),"utf8");
const guard=fs.readFileSync(path.join(root,"js/v10-41-cache-guard.js"),"utf8");

const BUILD="V10.42 r30";
const CACHE="20260917r30";
const buildMeta=html.match(/<meta name="ccg-lost-sizzler-build" content="([^"]+)"/i)?.[1]||"";
const cacheMeta=html.match(/<meta name="ccg-lost-sizzler-cache" content="([^"]+)"/i)?.[1]||"";
const localAssets=[...html.matchAll(/(?:src|href)="((?:js|css)\/[^"?]+\?v=([^"&]+))"/g)].map(match=>({url:match[1],token:match[2]}));

assert.equal(buildMeta,BUILD,"the blocking page identity must already be the current r30 build before any runtime restamp");
assert.equal(cacheMeta,CACHE,"the cache guard must read the r30 token on its first execution");
assert.equal(version.build,BUILD,"version.json must describe the same current build as the blocking page and bootstrap");
assert.equal(version.cacheToken,CACHE,"version.json must describe the same current cache token as the blocking page and bootstrap");
assert.match(bootstrap,/const BUILD="V10\.42 r30";/,"ordered bootstrap build identity changed unexpectedly");
assert.match(bootstrap,/const CACHE="20260917r30";/,"ordered bootstrap cache identity changed unexpectedly");
assert.match(guard,/ccg-lost-sizzler-cache[^\n]+content/,"cache guard must continue taking its initial token from the blocking page meta");
assert.ok(localAssets.length>=30,`expected the canonical page to expose its local script/style cache tokens, found ${localAssets.length}`);
for(const asset of localAssets)assert.equal(asset.token,CACHE,`${asset.url} is not pinned to the current r30 cache token`);
assert.match(html,/game-local-runtime\.js\?v=20260917r30/,"the extracted current local runtime must not remain under the obsolete September 10 cache key");
assert.match(html,/game-main\.js\?v=20260917r30/,"the current input/frame owner must not remain under the obsolete September 10 cache key");
assert.match(html,/v10-41-cache-guard\.js\?v=20260917r30/,"the cache guard itself must be fetched under the current release token");

console.log("Dungeon Carnage r30 blocking release/cache identity contract passed.");
