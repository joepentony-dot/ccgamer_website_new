import assert from 'node:assert/strict';
import fs from 'node:fs';

const js=fs.readFileSync(new URL('../js/v10-13-mobile-combat-map.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../css/v10-13-mobile-combat-map.css',import.meta.url),'utf8');

assert.match(js,/ccg-mobile-solo-score/,'Mobile score owner must create a dedicated score panel.');
assert.match(js,/net\.mode\|\|""\)!=="solo"/,'Mobile score must be restricted to Solo network mode.');
assert.match(js,/dataset\.specialMode/,'Mobile score must exclude special multiplayer modes.');
assert.match(js,/Number\(score\)/,'Mobile score must read the live canonical score value.');
assert.match(js,/toLocaleString\(\)/,'Mobile score should format large score values for readability.');
assert.match(js,/250/,'Mobile score should refresh at a lightweight UI cadence rather than every frame.');

assert.match(css,/orientation:portrait/,'Solo score HUD must target the portrait phone layout.');
assert.match(css,/\.ccg-mobile-solo-score/,'Solo score HUD styling must exist.');
assert.match(css,/grid-column:span 2/,'Solo score must occupy the two unused cells beside the MAP control.');
assert.match(css,/\.ccg-mobile-solo-score\.hidden/,'Solo score must remain hideable outside Solo Dungeon.');

console.log('Lost Sizzler mobile Solo Dungeon score HUD contract passed.');
