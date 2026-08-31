import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const repo=path.resolve(root,"../..");
const loader=fs.readFileSync(path.join(root,"js/v10-41-lake-item-safety.js"),"utf8");
const src=fs.readFileSync(path.join(root,"js/v10-41-r46-release-candidate-polish.js"),"utf8");
const migration=fs.readFileSync(path.join(repo,"supabase/migrations/20260830203500_lost_sizzler_release_telemetry_metadata.sql"),"utf8");
const eventTypesMigration=fs.readFileSync(path.join(repo,"supabase/migrations/20260831145402_lost_sizzler_telemetry_event_types.sql"),"utf8");
const edge=fs.readFileSync(path.join(repo,"supabase/functions/lost-sizzler-feedback/index.ts"),"utf8");

assert.match(loader,/v10-41-r46-release-candidate-polish\.js/,"late loader must publish r46");
assert.match(src,/ccg-lost-sizzler-lifetime-stats-v1/,"r46 must use versioned local lifetime statistics");
assert.match(src,/ccg-lost-sizzler-accessibility-v1/,"r46 must use versioned accessibility preferences");
assert.match(src,/reducedMotion/,"r46 must expose reduced motion preference");
assert.match(src,/reducedFlashes/,"r46 must expose reduced flash preference");
assert.match(src,/largeText/,"r46 must expose larger text preference");
assert.match(src,/setMusicLevel/,"r46 must use the existing audio API rather than own music playback");
assert.match(src,/RUN REPORT/,"r46 must enrich the existing end screen with a run report");
assert.match(src,/BEST SCORE/,"r46 run report must expose the player's best score");
assert.match(src,/Player Statistics/,"r46 must expose lifetime player statistics");
assert.match(src,/floor_reached/,"r46 must record coarse floor-reached telemetry");
assert.match(src,/floor_cleared/,"r46 must record coarse floor-clear telemetry");
assert.match(src,/run_ended/,"r46 must record run outcome telemetry");
assert.doesNotMatch(src,/\.send\s*\(/,"r46 must not own multiplayer transport");
assert.doesNotMatch(src,/saveCheckpointData|startWorld\s*\(/,"r46 must not own save creation or world creation");
assert.match(migration,/add column if not exists metadata jsonb/i,"release telemetry migration must add optional JSON metadata");
assert.match(migration,/jsonb_typeof\(metadata\) = 'object'/i,"release telemetry metadata must be constrained to an object");
assert.match(edge,/"run_started_detail"/,"existing telemetry function must accept detailed run starts");
assert.match(edge,/"floor_reached"/,"existing telemetry function must accept floor reach events");
assert.match(edge,/"floor_cleared"/,"existing telemetry function must accept floor clear events");
assert.match(edge,/"run_ended"/,"existing telemetry function must accept run outcome events");
assert.match(edge,/function telemetryMetadata/,"telemetry metadata must be allow-listed and bounded server-side");
assert.match(edge,/metadata\n\s*\}\)\.select/,"sanitised metadata must be written through the existing game_play_events insert");
assert.match(edge,/ALLOWED_ORIGINS/,"existing production origin restriction must remain intact");
assert.match(edge,/authenticatedUserId/,"existing optional account attribution must remain intact");
assert.match(edge,/game_feedback/,"existing bug and suggestion workflow must remain intact");

const acceptedEvents=[
  "start_click",
  "run_started",
  "run_started_detail",
  "floor_reached",
  "floor_cleared",
  "run_ended",
  "mobile_pc_notice_accept",
  "rating_submitted",
  "rating_dismissed",
  "client_error"
];
for(const eventType of acceptedEvents){
  assert.match(edge,new RegExp(`"${eventType}"`),`Edge Function must allow ${eventType}`);
  assert.match(eventTypesMigration,new RegExp(`'${eventType}'`),`database CHECK constraint must allow ${eventType}`);
}
assert.match(eventTypesMigration,/drop constraint if exists game_play_events_event_type_check/i,"telemetry event migration must replace the stale event allow-list");
assert.match(eventTypesMigration,/validate constraint game_play_events_event_type_check/i,"replacement telemetry event constraint must be validated against existing rows");

console.log("Lost Sizzler V10.41 r46 release-candidate static contract passed.");
