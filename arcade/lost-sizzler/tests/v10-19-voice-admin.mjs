import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const gameDir=path.resolve(here,"..");
const repoDir=path.resolve(gameDir,"../../../../");
const readGame=name=>fs.readFileSync(path.join(gameDir,name),"utf8");
const readRepo=name=>fs.readFileSync(path.join(repoDir,name),"utf8");

const loader=readGame("js/asset-overrides.js");
const adminAudio=readGame("js/admin-audio-overrides.js");
const director=readGame("js/v10-16-voice-director.js");
const voicePage=readRepo("admin/lost-sizzler-voices.html");
const voiceAdmin=readRepo("admin/js/lost-sizzler-voices.js");
const adminNav=readRepo("admin/js/admin-nav.js");
const migration=readRepo("supabase/migrations/20260823171000_lost_sizzler_voice_admin.sql");

assert.match(loader,/CCG_ADMIN_AUDIO_REV/,"custom admin audio loader is cache-busted");
assert.match(loader,/admin-audio-overrides\.js\?v=/,"custom admin audio loader uses its revision");
assert.match(loader,/bountyStart:null/,"live bounty-start voice cue is available for overrides");
assert.match(adminAudio,/\.in\("asset_group",\["music","voice"\]\)/,"admin loader reads both music and voice assets");
assert.match(adminAudio,/voiceCueForRow/,"voice assets are mapped to individual gameplay cues");
assert.match(adminAudio,/target\.voice\[cue\]=urls/,"uploaded voice variants are applied to the live voice override map");
assert.match(director,/lastAssetByKey:new Map\(\)/,"voice director tracks the last custom clip per cue");
assert.match(director,/Array\.isArray\(value\)/,"voice director accepts multiple recordings per cue");
assert.match(director,/list\.length>1\?list\.filter\(src=>src!==last\)/,"voice director avoids immediate repeats when variants exist");
assert.match(director,/speakText\(fallbackText,priority\)/,"failed custom audio falls back to browser speech");
assert.match(voicePage,/id="voice-upload-form"/,"dedicated voice upload page is present");
assert.match(voicePage,/Lost Sizzler Voice Pack/,"voice library UI is present");
assert.match(voiceAdmin,/\['gildedElf','Gilded Elf Appears'/,"Gilded Elf voice cue is administered");
assert.match(voiceAdmin,/\['bountyStart','Dungeon Bounty'/,"rare-event bounty start cue matches the live voice system");
assert.match(voiceAdmin,/data-action="default"/,"admin can return a cue to the default browser voice");
assert.match(voiceAdmin,/data-action="test"/,"admin can test individual cues");
assert.match(adminNav,/lost-sizzler-voices\.html/,"voice overrides are linked from the main admin navigation");
assert.match(migration,/'voice'/,"database asset-group constraint permits voice assets");

console.log("V10.19 Lost Sizzler voice admin regression checks passed");
