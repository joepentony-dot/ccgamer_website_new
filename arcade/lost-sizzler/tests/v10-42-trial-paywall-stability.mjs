import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"../../..");
const paywallPath=path.join(root,"arcade/lost-sizzler/js/v10-42-demo-paywall.js");
const cssPath=path.join(root,"resources/css/c64-dungeon-carnage-trial-paywall.css");
const source=fs.readFileSync(paywallPath,"utf8");
const css=fs.readFileSync(cssPath,"utf8");

assert.match(source,/const TRIAL_MS=120000;/,"trial duration must remain exactly two minutes");
assert.match(source,/data-trial-time>02:00/,"visible trial clock must start at 02:00");
assert.match(source,/dataset\?\.runActive==="true"/,"trial must start from the canonical active-run state");
assert.match(source,/sessionStorage\.setItem\(TRIAL_SESSION_KEY/,"trial deadline must survive a reload in the same tab");
assert.match(source,/mode="trial-paywall"/,"expired trial must leave normal gameplay mode");
assert.match(source,/showPaywall\(\{reason:"trial-expired"\}\)/,"timer expiry must open the paywall");
assert.match(source,/if\(state\.expired&&!state\.entitled\)return false;/,"expired paywall must not be dismissible without entitlement");
assert.match(source,/demoMode:false,trialMode:true,trialMs:TRIAL_MS/,"legacy pre-run demo locking must stay disabled while timed trial mode is enabled");
assert.match(source,/\/resources\/css\/c64-dungeon-carnage-trial-paywall\.css/,"paywall styling must load from resources/css");
assert.doesNotMatch(source,/createElement\("style"\)/,"runtime must not inject a replacement inline stylesheet");
assert.match(source,/https:\/\/www\.patreon\.com\/CheekyCommodoreGamer/,"existing CCG Patreon destination must remain available");
assert.match(source,/https:\/\/www\.youtube\.com\/@CheekyCommodoreGamer\/join/,"existing CCG YouTube Membership destination must remain available");
assert.match(css,/#v142-trial-countdown/,"countdown styling must be present");
assert.match(css,/#v142-demo-paywall/,"paywall styling must be present");
assert.match(css,/@media\(max-width:650px\)/,"paywall must retain a phone layout rule");

console.log("C64 Dungeon Carnage two-minute trial paywall contract passed");
