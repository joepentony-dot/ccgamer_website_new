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
assert.match(inputFixes,/CANONICAL_PATH="\/arcade\/lost-sizzler\/"/,'canonical arcade path must be declared');
assert.match(inputFixes,/returnTo/,'weekly auth return path must be migrated at runtime');
assert.match(index,/The Lost Sizzler/,'canonical runtime must contain the live game');
assert.match(oldPrimary,/location\.replace\(destination\.href\)/,'previous production URL must redirect');
assert.match(oldTest,/location\.replace\(destination\.href\)/,'obsolete test URL must redirect');
assert.match(oldPrimary,/\/arcade\/lost-sizzler\//,'previous production URL must target canonical arcade path');
assert.match(oldTest,/\/arcade\/lost-sizzler\//,'obsolete test URL must target canonical arcade path');
assert.match(voice,/welcomeRare/,'rare recorded welcome support must remain wired');
assert.match(voice,/Math\.random\(\)<\.1/,'rare welcome should remain uncommon');
assert.match(voice,/playSprite/,'bundled recorded voice fallback must be present');
assert.match(voice,/src=!forceTts\?assetFor\(key\):""/,'admin voice override must be checked before bundled fallback');
assert.doesNotMatch(voice,/state\.queue\.push\(/,'voice cues must never accumulate into a playback backlog');

console.log('Lost Sizzler consolidation regression checks passed.');
