import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const index=fs.readFileSync(path.join(root,"index.html"),"utf8");
const home=fs.readFileSync(path.resolve(root,"../../home.html"),"utf8");
const homeCtaCss=fs.readFileSync(path.resolve(root,"../../resources/css/home-lost-sizzler-cta.css"),"utf8");

assert.match(index,/data-ccg-play-maintenance-gate="true"/,"Dungeon Carnage must retain the production maintenance gate");
assert.match(index,/data-ccg-owner-preview="cheekycommodoregamer"/,"maintenance gate must declare the owner preview identity");
assert.match(index,/ccg-supabase-config\.js/,"owner preview must use the established Supabase auth config");
assert.match(index,/ccg-supabase-client\.js/,"owner preview must use the established Supabase auth client");
assert.match(index,/client\.auth\.getUser\(\)/,"owner preview must validate a live authenticated user");
assert.match(index,/username === "cheekycommodoregamer"/,"owner preview must require the canonical CCG username");
assert.match(index,/displayName === "cheeky commodore gamer"/,"owner preview must require the canonical CCG display name");
assert.match(index,/role === "admin"/,"owner preview must require the admin profile role");
assert.match(index,/window\.location\.replace\("\/games\/ccg-games\/"\)/,"everyone else must remain behind the maintenance hub");
assert.match(index,/c64-dungeon-carnage-home-v2\.webp\?v=b26ce0d2/,"loader must cache-bust the supplied Dungeon Carnage WEBP");
assert.match(home,/c64-dungeon-carnage-home-v2\.webp/,"homepage CTA markup must retain the supplied Dungeon Carnage WEBP");
assert.match(homeCtaCss,/c64-dungeon-carnage-home-v2\.webp\?v=b26ce0d2/,"homepage CTA presentation must force the supplied Dungeon Carnage WEBP through a fresh cache key");
assert.match(homeCtaCss,/visibility:\s*hidden/,"the stale inline image must not cover the cache-busted artwork background");

console.log("Dungeon Carnage owner-only maintenance preview contract passed.");
