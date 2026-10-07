import fs from "node:fs";

function assert(condition,message){if(!condition)throw new Error(message)}

const canonical=fs.readFileSync("arcade/c64-dungeon-carnage/index.html","utf8");
const legacy=fs.readFileSync("arcade/lost-sizzler/index.html","utf8");
const ui=fs.readFileSync("arcade/lost-sizzler/js/dungeon-public-playtest.js","utf8");
const css=fs.readFileSync("arcade/lost-sizzler/css/dungeon-public-playtest.css","utf8");
const migration=fs.readFileSync("supabase/migrations/20261007025945_dungeon_carnage_public_playtest_sessions.sql","utf8");
const script="js/dungeon-public-playtest.js?v=20261007r112";
const style="css/dungeon-public-playtest.css?v=20261007r112";

for(const [name,html] of [["canonical",canonical],["legacy",legacy]]){
  assert(html.includes(script),name+" Dungeon page must load the public timed-playtest controller");
  assert(html.includes(style),name+" Dungeon page must load the public timed-playtest stylesheet");
  assert(html.indexOf("ccg-play-maintenance-owner-gate.js")<html.indexOf("dungeon-public-playtest.js"),name+" page must install the validated access gate before the timed UI listener");
}
assert(ui.includes('const PLAY_SECONDS=300'),"personal gameplay allowance must be exactly five minutes");
assert(ui.includes('attributeFilter:["data-run-active"]'),"five-minute clock must wait for actual gameplay run state");
assert(ui.includes("ccg_register_dungeon_carnage_public_playtest_start"),"game start must be registered server-side");
assert(ui.includes("ccg_complete_dungeon_carnage_public_playtest"),"five-minute completion must be recorded server-side");
assert(ui.includes("ccg_mark_dungeon_carnage_public_playtest_feedback"),"successful feedback must be counted");
assert(ui.includes("CONTACT_SCRIPT_URL"),"feedback must route through the existing CCG contact delivery service");
assert(ui.includes("C64 DUNGEON CARNAGE · COMING SOON"),"five-minute lockout must present the Coming Soon state");
assert(ui.includes('url.searchParams.delete("utm_source")'),"shared/feedback URLs must strip UTM source attribution");
assert(!ui.toLowerCase().includes("chatgpt"),"public playtest controller must contain no ChatGPT wording");
assert(css.includes("#ccg-public-playtest-end"),"public end-state UI must be styled");
assert(migration.includes("unique (playtest_link_id, tester_hash)"),"tester totals must deduplicate by public link and browser identity");
assert(migration.includes("make_interval(mins => 5)"),"server-side session deadline must be five minutes");
assert(migration.includes("revoke all on table public.ccg_dungeon_carnage_public_playtest_sessions from anon, authenticated"),"tester records must not be browser-readable");
assert(!migration.includes("PuzbYDOnphGjuzPf59691ebbz2TreBiX"),"raw public token must never be committed into the tracking migration");

console.log("Dungeon Carnage public timed playtest contract passed.");
