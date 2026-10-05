import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root=new URL('../',import.meta.url);
const read=async path=>readFile(new URL(path,root),'utf8');

const gameMain=await read('js/game-main.js');
const inputFixes=await read('js/v10-18-input-ui-bugfixes.js');
const voice=await read('js/v10-16-voice-director.js');
const index=await read('index.html');
const oldPrimary=await read('../../games/ccg-games/cheeky-commodore-quest/index.html');
const oldTest=await read('../../games/the-lost-sizzler/index.html');

assert.match(gameMain,/function isEditableKeyboardTarget\(/,'editable keyboard target guard must exist');
assert.ok(
  gameMain.indexOf('if(isEditableKeyboardTarget(e.target))return;')<gameMain.indexOf('e.preventDefault();'),
  'editable-field guard must run before gameplay preventDefault'
);
assert.match(inputFixes,/CANONICAL_PATH="\/arcade\/c64-dungeon-carnage\/"/,'canonical arcade path must be declared');
assert.match(inputFixes,/returnTo/,'weekly auth return path must be migrated at runtime');
assert.match(index,/C64 Dungeon Carnage/,'canonical runtime must contain the live game name');
assert.match(oldPrimary,/location\.replace\(destination\.href\)/,'previous production URL must redirect');
assert.match(oldTest,/location\.replace\(destination\.href\)/,'obsolete test URL must redirect');
assert.match(oldPrimary,/\/arcade\/c64-dungeon-carnage\//,'previous production URL must target canonical arcade path');
assert.match(oldTest,/\/arcade\/c64-dungeon-carnage\//,'obsolete test URL must target canonical arcade path');
assert.match(voice,/welcomeRare/,'rare recorded welcome support must remain wired');
assert.match(voice,/window\.addEventListener\("ccg:run-started",onAuthoritativeRunStarted\)/,'Solo run start must bind owner-recorded Welcome playback to the authoritative run-start event');
assert.match(voice,/sayKey\("welcome",\{cooldown:0\}\)/,'Authoritative non-Tutorial run start must request the owner-recorded Welcome cue');
assert.doesNotMatch(voice,/greetingRoll<\.1\?"welcomeRare"/,'Solo start must not randomly replace the expected Welcome cue');
assert.match(voice,/function playSprite\(/,'approved recorded voice playback must remain present');
assert.match(voice,/const src=assetFor\(key\);let started=false;[\s\S]*if\(src\)started=playClip\(src,priority,key\);if\(!started\)started=playSprite\(key,priority\);/,'admin voice override must be checked before approved game recording playback');
assert.doesNotMatch(voice,/SpeechSynthesisUtterance|speechSynthesis\.speak/,'production voice playback must not fall back to browser TTS');
assert.doesNotMatch(voice,/state\.queue\.push\(/,'voice cues must never accumulate into a playback backlog');

console.log('C64 Dungeon Carnage consolidation regression checks passed.');
