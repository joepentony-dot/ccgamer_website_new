import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");
const shop=read("js/v10-42-artefact-shop-stability.js");
const procedural=read("js/v10-42-procedural-overhaul.js");

assert.match(procedural,/function essenceCost\(player\)/,"procedural RPG owner must expose the canonical player-specific Essence cost");
assert.match(procedural,/banishmentEssenceCost=Math\.max\(2,essenceCost\(p\)-1\)/,"Alchemist's Seal must continue reducing Flask cost to a minimum of two");
assert.match(shop,/CCGLostSizzlerV142ProceduralOverhaul\?\.essenceCost\?\.\(player\)/,"final R77 Flask transaction must charge the same player-specific Essence cost shown by the Alchemist UI");
assert.doesNotMatch(shop,/const need=Math\.max\(1,Math\.floor\(Number\(window\.CCG_CONFIG\?\.stalker\?\.flaskArtefacts\)\|\|3\)\);/,"final Flask transaction must not hard-code the base three-Essence price");
assert.match(shop,/Score and Gold are unchanged/,"Flask success feedback must retain currency invariants");

console.log("Dungeon R77 Alchemist Essence-cost parity contract passed.");
