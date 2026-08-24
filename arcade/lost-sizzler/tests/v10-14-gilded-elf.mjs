import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const gameDir=path.resolve(here,"..");
const read=name=>fs.readFileSync(path.join(gameDir,name),"utf8");

const elf=read("js/v10-14-gilded-elf.js");
const loader=read("js/asset-overrides.js");
const changelog=read("js/v10-12-developer-changelog.js");

assert.match(loader,/v10-14-gilded-elf\.js\?v=\$\{CCG_GILDED_ELF_REV\}/,"Gilded Elf enhancement is cache-busted and loaded");
assert.match(elf,/const SPAWN_CHANCE=\.08;/,"Gilded Elf retains the agreed rare 8% per-floor spawn chance");
assert.match(elf,/const LIFETIME_MS=30000;/,"Gilded Elf escapes after 30 seconds");
assert.match(elf,/const PASSIVE_DROP_MS=3000;/,"Gilded Elf drops gold every three seconds while alive");
assert.match(elf,/const HIT_DROP_COOLDOWN_MS=250;/,"Gilded Elf hit rewards retain anti-multi-projectile spam protection");
assert.match(elf,/hp:10,maxHp:10,armor:5,maxArmor:5/,"Gilded Elf retains 10 HP and 5 armour");
assert.match(elf,/dropGold\(elf,1,"passive"\)/,"passive flee-time gold drops remain enabled");
assert.match(elf,/dropGold\(elf,1,"hit"\)/,"successful hits continue to release 10 gold");
assert.match(elf,/dropGold\(elf,10,"jackpot"\)/,"defeating the elf still releases the 100-gold jackpot as ten 10-gold coins");
assert.match(elf,/gildedResolved="escaped"/,"timeout resolves as an escape rather than a kill");
assert.match(elf,/currentTwoScreenTiles\(\)/,"elf roaming remains tethered to approximately two screens");
assert.match(elf,/dustAt\(ox,oy,q\.dx,q\.dy,false\)/,"elf movement continues to leave a dust trail");
assert.match(elf,/if\(enemy\?\.gildedElf\)\{gildedHit\(enemy,power,attacker\);return\}/,"Gilded Elf damage remains isolated from ordinary enemy death/reward handling");
assert.match(elf,/if\(item\?\.gildedElfCoin\)/,"Gilded Elf gold pickups continue to feed the score system");
assert.match(elf,/if\(enemy\?\.gildedElf\)return drawGildedElf\(enemy\)/,"Gilded Elf keeps its dedicated visual and countdown renderer");
assert.match(changelog,/LS-0823-14/,"developer changelog records the Gilded Elf encounter");

console.log("V10.14 Gilded Elf regression checks passed");
