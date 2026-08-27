import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const client=fs.readFileSync(path.join(root,"js/v10-8-player-insights.js"),"utf8");
const endpoint=fs.readFileSync(path.resolve(root,"../../supabase/functions/lost-sizzler-feedback/index.ts"),"utf8");

assert.match(client,/functions\.invoke\(FUNCTION_NAME,\{body:\{action:"rating_status"\}\}\)/,"the rating prompt must ask the existing server function for account status");
assert.match(client,/async function showRating\(\)[\s\S]*?if\(await accountHasRating\(\)\)[\s\S]*?return false;[\s\S]*?ensureRatingOverlay\(\)\?\.classList\.remove\("hidden"\)/,"account rating status must be checked before the prompt can become visible");
assert.match(client,/accountRatingChecked=Boolean\(data\?\.authenticated\)/,"anonymous checks must remain retryable after a later sign-in");
assert.match(client,/if\(saved\)\{\s*accountRatingChecked=true;accountAlreadyRated=true;/,"a successful rating must suppress later prompts immediately");
assert.match(endpoint,/action === "rating_status"/,"the feedback function must provide an account rating status action");
assert.match(endpoint,/service\.auth\.getUser\(bearer\)/,"rating status must verify the signed-in user's bearer token server-side");
assert.match(endpoint,/\.eq\("game_slug", "the-lost-sizzler"\)[\s\S]*?\.eq\("event_type", "rating_submitted"\)[\s\S]*?\.eq\("auth_user_id", authUserId\)/,"the account lookup must be limited to this game, submitted ratings and the verified user ID");
assert.doesNotMatch(client,/service.role|SUPABASE_SERVICE_ROLE_KEY/i,"the browser must never receive service-role access");

console.log("Lost Sizzler account-level rating prompt suppression contracts passed.");
