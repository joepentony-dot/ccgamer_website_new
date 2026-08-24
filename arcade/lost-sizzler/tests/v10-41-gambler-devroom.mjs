import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const gambler=fs.readFileSync(path.join(root,"js/v10-41-gambler-devroom.js"),"utf8");
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

assert.match(lake,/const ESSENTIAL=new Set\(\["key","mainKey","bronze","bronzeKey","exitSigil","sigil"\]\)/,"lake safety must protect all key/sigil progression kinds");
assert.match(lake,/reserve\(item,1\)/,"essential items must have a dry one-tile approach apron");
assert.match(lake,/scene\.lake=scene\.lake\.filter/,"conflicting lake tiles must be removed rather than moving progression items");
assert.match(lake,/host\.blockingDecor=.*sanctuaryLake/,"lake collision must be removed when a protected tile is repaired");
assert.match(lake,/setInterval\(tick,300\)/,"lake safety must continue watching for progression items created later in the run");

console.log("Lost Sizzler V10.41 Gambler, owner Developer Vault and sanctuary lake safety regression checks passed.");
