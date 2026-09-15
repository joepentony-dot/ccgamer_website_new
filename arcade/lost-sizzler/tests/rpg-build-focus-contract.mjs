import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const runtime=fs.readFileSync(path.join(root,"js/v10-42-r23-rpg-build-focus.js"),"utf8");
const bootstrap=fs.readFileSync(path.join(root,"js/v10-42-bootstrap.js"),"utf8");

assert.match(runtime,/const CHOICE_COUNT=4;/,"R23 must preserve the established four-choice level-up panel.");
assert.match(runtime,/MILESTONE_LEVELS=Object\.freeze\(\[5,10,15,20,25\]\)/,"R23 milestone levels must align with five-floor RPG caps.");
assert.match(runtime,/\^dungeon\(\?:-\|\$\)/,"R23 build focus must be dungeon-mode scoped.");
assert.match(runtime,/const baseSkillChoices=PROG\.skillChoices;/,"R23 must extend rather than replace the existing V10.42 RPG chooser.");
assert.match(runtime,/wrappedSkillChoices\.__ccgV142R23RpgBuildFocus=true;/,"R23 must expose wrapper ownership for regression checks.");
assert.doesNotMatch(runtime,/applySkill\s*=/,"R23 must not alter existing RPG stat-effect math.");
assert.doesNotMatch(runtime,/floorLevelCap\s*=/,"R23 must not alter floor level caps.");
assert.doesNotMatch(runtime,/awardXP\s*=/,"R23 must not alter XP sources or thresholds.");
assert.doesNotMatch(runtime,/localStorage|indexedDB|supabase/i,"R23 must not introduce a new save or cloud persistence surface.");

const proceduralIndex=bootstrap.indexOf('["v10-42-procedural-overhaul.js","CCGLostSizzlerV142ProceduralOverhaul"]');
const r23Index=bootstrap.indexOf('["v10-42-r23-rpg-build-focus.js","CCGLostSizzlerV142R23RpgBuildFocus"]');
const campaignIndex=bootstrap.indexOf('["v10-42-five-depth-campaign.js","CCGLostSizzlerV142FiveDepthCampaign"]');
assert.ok(proceduralIndex>=0&&r23Index>proceduralIndex&&campaignIndex>r23Index,"Ordered bootstrap must load R23 after the six-stat RPG owner and before campaign handoff.");

console.log("R23 RPG build-focus static contract passed.");
