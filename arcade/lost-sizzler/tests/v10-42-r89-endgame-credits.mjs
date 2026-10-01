import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"../../..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

const core=read("arcade/lost-sizzler/js/game-core.js");
const runtime=read("arcade/lost-sizzler/js/game-local-runtime.js");
const renderer=read("arcade/lost-sizzler/js/game-render.js");
const moduleSource=read("arcade/lost-sizzler/js/v10-42-r89-endgame-credits.js");
const bootstrap=read("arcade/lost-sizzler/js/v10-42-bootstrap.js");
const config=read("arcade/lost-sizzler/js/config.js");

assert(bootstrap.includes('v10-42-r89-endgame-credits.js'),"Ordered bootstrap must load the R89 endgame credits layer.");
assert(core.includes("CCGDungeonEndgameCredits?.render?.(snapshot)"),"endRun must hand an immutable run snapshot to the endgame presentation.");
assert(core.includes("enemyDefeats:Array.isArray(run.enemyDefeats)"),"Endgame snapshot must carry the authoritative defeated-enemy ledger.");
assert(!core.includes("Friendly fire:"),"Retired Friendly fire statistics must not return to the end-of-run screen.");

assert(runtime.includes("function recordEnemyDefeat("),"Combat runtime must retain the authoritative enemy-defeat recorder.");
assert(runtime.includes("run.enemyDefeats=Array.isArray(run.enemyDefeats)"),"Enemy defeat identities must remain stored on the run.");
assert(renderer.includes("window.CCGRenderEnemyCreditAvatar=renderEnemyCreditAvatar"),"Credits must use the gameplay renderer's authentic enemy-avatar bridge.");
assert(moduleSource.includes("CCGRenderEnemyCreditAvatar"),"R89 enemy recap must call the authentic gameplay enemy-credit renderer.");
assert(moduleSource.includes("DEFEATED ENEMIES"),"Successful campaign completion must include the defeated-enemy roll.");

assert(moduleSource.includes('https://www.cheekycommodoregamer.co.uk/arcade/c64-dungeon-carnage/'),"Completion sharing must use the canonical game page.");
assert(moduleSource.includes("navigator.share")&&moduleSource.includes("navigator.clipboard"),"Completion sharing must support native share and clipboard fallback.");
assert(moduleSource.includes("info@cheekycommodoregamer.co.uk"),"Completion feedback must target the CCG feedback email.");
assert(moduleSource.includes("paypal.com/donate"),"Completion presentation must retain the one-off donation route.");
assert(moduleSource.includes('"AZALEA","CPU"'),"Special acknowledgements must include AZALEA and CPU.");
assert(moduleSource.includes("Patreon supporters")&&moduleSource.includes("YouTube members"),"Completion credits must acknowledge the wider supporter community.");

assert(config.includes("endgame:null"),"Admin audio config must expose an endgame music slot.");
assert(moduleSource.includes("adminAudio.endgame"),"R89 must read the configurable endgame music slot.");
assert(moduleSource.includes("CAMPAIGN COMPLETE · THANKS FOR PLAYING"),"Successful fifteen-floor completion must receive a substantial completion mark.");
assert(moduleSource.includes('document.getElementById("again-btn")')&&moduleSource.includes("panel.insertBefore(root,again)"),"R89 must preserve the established Return-to-Menu button and its bound listener.");

console.log("Dungeon Carnage R89 substantial endgame, credits, sharing and supporter contract passed.");
