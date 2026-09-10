import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const stage13=read("js/v10-41-stage13-encounter-completion.js");
const loader=read("js/v10-41-r30-buglog.js");

assert.match(stage13,/window\.__CCG_LOST_SIZZLER_STAGE13_ENCOUNTER_COMPLETION__/,"Stage 13 must install behind a one-shot module guard");
assert.match(stage13,/const REWARDS=Object\.freeze\(\{[\s\S]*"search-routes":40[\s\S]*"split-patrols":60[\s\S]*"crossfire-routes":80[\s\S]*"lockdown-depths":100[\s\S]*\}\)/,"Stage 13 must use the bounded four-band Level Director reward table");
assert.match(stage13,/const completedByWorld=new WeakMap\(\)/,"completion ownership must be scoped to the current world rather than leak across Solo runs");
assert.match(stage13,/new Set\(\)/,"each world must retain one-shot encounter completion identities");
assert.match(stage13,/\^stage12-\(\\d\+\)-\(\\d\+\)-\(\\d\+\)\$/,"Stage 13 must only recognise deterministic Stage 12 directed-enemy identities");
assert.match(stage13,/window\.CCGLostSizzlerStage8NpcDialogue\?\.soloDungeon\?\.\(\)===true/,"completion rewards must remain restricted to the Solo Dungeon controller");
assert.match(stage13,/remainingEnemies\(identity\)\.length/,"the first kill in a multi-enemy directed encounter must remain pending until the squad is cleared");
assert.match(stage13,/completed\.has\(identity\.key\)/,"duplicate completion attempts must be suppressed by encounter identity");
assert.match(stage13,/Math\.min\(100,Number\(REWARDS\[profile\]\|\|40\)\)/,"Stage 13 score bonuses must be hard capped at 100");
assert.match(stage13,/run\.stats\.stage13EncounterClears/,"Stage 13 clears must be retained in run diagnostics");
assert.match(stage13,/run\.stats\.stage13EncounterReward/,"Stage 13 reward totals must be retained in run diagnostics");
assert.match(stage13,/room\.stage13EncounterCleared=true/,"the completed room must retain its directed-encounter clear state");
assert.match(stage13,/host\.revision=Math\.max\(0,Number\(host\.revision\|\|0\)\)\+1/,"a completion transaction must advance canonical host revision exactly through the existing host state");
assert.match(stage13,/function recordEnemyDefeatStage13\(enemy,attacker,displayName=""\)/,"Stage 13 must attach at the authoritative enemy-defeat transaction instead of polling combat state");
assert.match(stage13,/const result=original\.apply\(this,arguments\)/,"the canonical defeat recorder must execute before Stage 13 completion handling");
assert.match(stage13,/wrapped\.__ccgOriginal=original/,"the one combat-event hook must retain auditable ancestry");
assert.doesNotMatch(stage13,/setInterval\s*\(/,"Stage 13 must not add a polling interval");
assert.doesNotMatch(stage13,/setTimeout\s*\(/,"Stage 13 must not add a timeout-driven gameplay owner");
assert.doesNotMatch(stage13,/requestAnimationFrame\s*\(/,"Stage 13 must not add another frame loop");
assert.match(loader,/function loadStage13EncounterCompletion\(\)/,"the established late progression loader must own Stage 13 loading");
assert.match(loader,/v10-41-stage13-encounter-completion\.js/,"the established late progression loader must request the Stage 13 module");
assert.match(loader,/const loadProgression=\(\)=>\{loadStage8NpcDialogue\(\);loadStage13EncounterCompletion\(\)\}/,"Stage 8 and Stage 13 must share one progression-load boundary");

console.log("Lost Sizzler Stage 13 directed-encounter completion contracts passed.");
