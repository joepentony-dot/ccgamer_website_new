import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const gambler=fs.readFileSync(path.join(root,"js/v10-41-gambler-devroom.js"),"utf8");
const hardening=fs.readFileSync(path.join(root,"js/v10-41-developer-vault-hardening.js"),"utf8");
const catalog=fs.readFileSync(path.join(root,"js/v10-41-developer-asset-catalog.js"),"utf8");
const lake=fs.readFileSync(path.join(root,"js/v10-41-lake-item-safety.js"),"utf8");

assert.match(gambler,/const SPAWN_CHANCE=\.04/,"Gambler must remain a rare dungeon occurrence");
assert.match(gambler,/const STAKE=1000/,"Gambler stake must be exactly 1,000 score");
assert.match(gambler,/const JACKPOT=2000/,"Gambler jackpot must pay exactly 2,000 score");
assert.equal((gambler.match(/id:"health",symbol:"2HP"/g)||[]).length,2,"the six-position reel must contain exactly two 2-HP outcomes");
assert.equal((gambler.match(/id:"jackpot",symbol:"£££"/g)||[]).length,1,"the reel must contain exactly one 2,000-score jackpot position");
assert.equal((gambler.match(/id:"bust",symbol:"X"/g)||[]).length,3,"the reel must contain three no-win positions");
assert.match(gambler,/score=Math\.max\(0,Number\(score\|\|0\)-STAKE\);g\.used=true/,"stake must be deducted and the encounter consumed before animation begins");
assert.match(gambler,/player\.health=Math\.min\(Math\.max\(0,Number\(player\.health\|\|0\)\),2\)/,"health-crash outcome must reduce health to at most 2 HP and never heal a lower-health player");
assert.match(gambler,/!run\.daily/,"Weekly Vault runs must never spawn the Gambler");
assert.match(gambler,/run\?\.gamblerEncountered/,"normal runs must contain at most one Gambler encounter");
assert.match(gambler,/Press G to gamble 1,000 score/,"nearby interaction must explain the G-key wager");
assert.match(gambler,/ccg-gambler-reel/,"Gambler must use the animated reel panel");

assert.match(gambler,/client\.auth\.getSession\(\)/,"Developer Vault must require a real authenticated Supabase session");
assert.match(gambler,/import\("\/admin\/js\/config\.js"\)/,"Developer Vault must reuse canonical admin owner configuration");
assert.match(gambler,/OWNER_EMAILS/,"Developer Vault must check the signed-in user against owner identities");
assert.match(gambler,/event\.ctrlKey&&event\.altKey&&event\.shiftKey&&mode==="menu"/,"developer entrance must remain a hidden menu-only multi-key shortcut");
assert.match(gambler,/OWNER DEVELOPER VAULT/,"authorized developer mode must expose the private spawn console");
assert.match(gambler,/F2 reopens this console/,"developer room must provide a private in-run console shortcut");
assert.match(gambler,/SPAWN ALL ITEMS/,"developer console must spawn all item test types");
assert.match(gambler,/SPAWN ALL STANDARD/,"developer console must spawn all standard enemy test types");
assert.match(gambler,/SPAWN ALL NAMED/,"developer console must spawn every configured named enemy");
assert.match(gambler,/DECOR_TYPES/,"developer console must provide the environment/decor asset set");
assert.match(gambler,/spawnDevSpecial\("gambler"\)/,"Developer Vault must guarantee a Gambler for immediate testing");

assert.match(hardening,/window\.CCGLostSizzlerV141Gambler=Object\.freeze\(\{constants\}\)/,"public Gambler API must not retain mutable developer authorization/spawn controls");
assert.match(hardening,/saveFloorCheckpointDevGuard/,"Developer Vault runs must not be saveable");
assert.match(hardening,/extractRunDevGuard/,"Developer Vault runs must not be banked or extracted");
assert.match(hardening,/descendFloorDevGuard/,"Developer Vault runs must not progress into ordinary floors");
assert.match(hardening,/item\?\.developerSpawn&&String\(item\.kind\|\|""\)==="game"/,"developer-spawned C64 games must not alter the permanent rescued-game collection");
assert.match(hardening,/internal\.dev\.authorized=false/,"owner authorization must be cleared before session revalidation and when leaving developer mode");
assert.match(hardening,/setInterval\(\(\)=>\{void revalidateOwner\(\)\},30000\)/,"active Developer Vault must periodically revalidate the signed-in owner session");

assert.match(catalog,/async function verifyOwner\(\)/,"expanded special-asset actions must independently verify owner access");
assert.match(catalog,/SPAWN ALL SPECIALS/,"developer console must expose a combined special encounter spawn action");
assert.match(catalog,/GILDED ELF/,"developer catalogue must include the rare Gilded Elf");
assert.match(catalog,/DEATH STALKER/,"developer catalogue must include a Death Stalker test asset");
assert.match(catalog,/COUNT LOADULA/,"developer catalogue must include Count Loadula");
assert.match(catalog,/BANISHMENT FLASK/,"developer catalogue must include the Banishment Flask");
assert.match(catalog,/SUPPLY SHOP/,"developer catalogue must include a supply shop");
assert.match(catalog,/SECRET TRADER/,"developer catalogue must include the secret trader");
assert.match(catalog,/DEATH CACHE/,"developer catalogue must include a death cache");
assert.match(catalog,/HEALTH REGEN TILE/,"developer catalogue must include sanctuary regeneration");
assert.match(catalog,/SANCTUARY LAKE SCENE/,"developer catalogue must allow the sanctuary lake scene to be rebuilt for inspection");
assert.match(catalog,/BRONZE DOOR/,"developer catalogue must include bronze-door testing");
assert.match(catalog,/SECRET WALL/,"developer catalogue must include secret-wall testing");
assert.match(catalog,/clearExtras/,"CLEAR SPAWNED ASSETS must remove expanded special test objects too");

assert.match(lake,/const ESSENTIAL=new Set\(\["key","mainKey","bronze","bronzeKey","exitSigil","sigil"\]\)/,"lake safety must protect all key/sigil progression kinds");
assert.match(lake,/reserve\(item,1\)/,"essential items must have a dry one-tile approach apron");
assert.match(lake,/scene\.lake=scene\.lake\.filter/,"conflicting lake tiles must be removed rather than moving progression items");
assert.match(lake,/host\.blockingDecor=.*sanctuaryLake/,"lake collision must be removed when a protected tile is repaired");
assert.match(lake,/setInterval\(tick,300\)/,"lake safety must continue watching for progression items created later in the run");

console.log("Lost Sizzler V10.41 Gambler, hardened owner Developer Vault, expanded asset catalogue and sanctuary lake safety regression checks passed.");