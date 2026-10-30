const assert = require('node:assert/strict');
const { matchingGames, words, contextualQuestion, archiveFact, hardwareFact } = require('../js/ccg-retro-assistant.js');
const games = [
  {system:'C64',slug:'summer-games-ii',title:'Summer Games II',year:1985,genres:['sports'],description:'Two-player multi-event sports competition',credits:{publisher:['Epyx']}},
  {system:'C64',slug:'spy-vs-spy',title:'Spy vs Spy',year:1984,genres:['strategy'],description:'A competitive two player action puzzle game',credits:{publisher:['First Star Software']}},
  {system:'Amiga',slug:'lemmings',title:'Lemmings',year:1991,genres:['puzzle'],description:'Guide little creatures to the exit',credits:{publisher:['Psygnosis']}},
  {system:'C64',slug:'uridium',title:'Uridium',year:1986,genres:['shooter'],description:'Spaceship shooting action',credits:{publisher:['Hewson']}},
  {system:'C64',slug:'foo-script-tag',title:'<script>evil</script>',year:1987,genres:['shooter'],description:'1987 unknown',credits:{publisher:['Test']}},
  {system:'C64',slug:'../traversal',title:'Unsafe',year:1987,genres:['shooter'],description:''}
];
const match = (q) => matchingGames(games,q).map(x=>x.slug);
assert.deepEqual(match('Amiga puzzle games'),['lemmings']);
assert.deepEqual(match('two-player C64 games').sort(), ['spy-vs-spy','summer-games-ii'].sort());
assert.deepEqual(match('Commodore 64 games from 1986'),['uridium']);
assert.deepEqual(match('Psygnosis Amiga'),['lemmings']);
assert.deepEqual(match('Uridium'),['uridium']);
assert.ok(!match('1987').includes('../traversal'));
assert.deepEqual(match('nothing remotely matching anything'),[]);
assert.ok(words('best games on C64').includes('c64'));
assert.equal(matchingGames(games,'game',100).length,0);
// Follow-ups only inherit explicit filters, not unrelated title/genre guesses.
assert.equal(contextualQuestion('C64 platform games', 'what about Amiga?'), 'platform games Amiga');
assert.equal(contextualQuestion('Amiga puzzle games', 'anything from 1987?'), 'Amiga puzzle games 1987');
assert.equal(contextualQuestion('C64 games', 'and two-player?'), 'C64 games two-player');
assert.equal(contextualQuestion('C64 games', 'what about Uridium?'), 'what about Uridium?');
assert.equal(contextualQuestion('', 'what about Amiga?'), 'what about Amiga?');
assert.ok(words('platformers').includes('platform'));
assert.ok(words("shoot 'em ups").includes('shooter'));
assert.deepEqual(match('C64 shooters'), ['uridium','foo-script-tag']);
const pages = Array.from({length:12},(_,i) => ({system:'C64',slug:'sample-'+i,title:'Sample '+i,genres:['platform']}));
assert.equal(matchingGames(pages,'C64 platformers',5,0).length,5);
assert.equal(matchingGames(pages,'C64 platformers',5,5).length,5);
assert.equal(matchingGames(pages,'C64 platformers',5,10).length,2);
assert.deepEqual(matchingGames(pages,'C64 platformers',5,15),[]);
assert.notEqual(matchingGames(pages,'C64 platformers',5,0)[0].slug,matchingGames(pages,'C64 platformers',5,5)[0].slug);
console.log('CCG Retro Assistant: archive filters, genre synonyms, safe follow-ups and bounded pagination passed');


/* Home-only bootstrap is independent from the approved CLS whitelist. */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const randomizer = fs.readFileSync(path.join(root, 'js/ccg-archive-pulse-randomizer.js'), 'utf8');
const home = fs.readFileSync(path.join(root, 'home.html'), 'utf8');
assert.match(randomizer, /data-ccg-page/);
assert.match(randomizer, /\/js\/ccg-retro-assistant\.js/);
assert.match(randomizer, /data-ai-enabled/);
assert.doesNotMatch(home, /ccg-retro-assistant\.js/);
console.log('CCG Retro Assistant: home-only lazy bootstrap / protected homepage guard passed');

/* Ground at least one query in the real, unchanged canonical catalogue. */
const catalogue = JSON.parse(fs.readFileSync(path.join(root, 'games/games.json'), 'utf8'));
assert.ok(Array.isArray(catalogue) && catalogue.length > 100, 'Canonical game archive is an array');
assert.ok(matchingGames(catalogue, '20 Tons').some(game => game.slug === '20-tons'), 'Real archive game links remain grounded');
const assistantSource = fs.readFileSync(path.join(root, 'js/ccg-retro-assistant.js'), 'utf8');
assert.match(assistantSource, /lastArchiveQuestion/);
assert.match(assistantSource, /lastArchiveOffset/);
assert.match(assistantSource, /if \(!aiEnabled \|\| !endpoint \|\| !siteKey \|\| !turnstileToken\) return false/);
assert.match(assistantSource, /a\.href = '\/games\/' \+ encodeURIComponent\(game\.slug\)/);
console.log('CCG Retro Assistant: canonical games.json, opt-in-only AI and safe archive links passed');

/* All factual game answers must derive from canonical fields, not AI guesses. */
const known = [{system:'C64',slug:'uridium',title:'Uridium',year:1986,
  credits:{publisher:['Hewson'],musician:['Steve Turner']},ccg_rating:8}];
assert.match(archiveFact(known,'Who published Uridium?').reply, /Hewson/);
assert.match(archiveFact(known,'When was Uridium released?').reply, /1986/);
assert.match(archiveFact(known,'Who composed the music for Uridium?').reply, /Steve Turner/);
assert.match(archiveFact(known,'What is your rating for Uridium?').reply, /CCG catalogue rating.*8/);
assert.equal(archiveFact([{...known[0],ccg_rating:''}],'What is your rating for Uridium?'),null);
assert.match(archiveFact(known,'Zzap score for Uridium?').reply, /cannot verify a magazine score/);
assert.equal(archiveFact(known,'Who published an unknown game?'),null);
assert.equal(archiveFact([{...known[0],slug:'../unsafe'}],'Who published Uridium?'),null);
// Separate C64/Amiga editions must never answer a named-platform question
// using the first title match from the wrong system.
const editions = [
  {system:'C64',slug:'example-c64',title:'Example',year:1985,credits:{publisher:['C64 Publisher'],musician:['C64 Musician']}},
  {system:'Amiga',slug:'example-amiga',title:'Example',year:1991,credits:{publisher:['Amiga Publisher'],musician:['Amiga Musician']}}
];
assert.equal(archiveFact(editions,'Who published Example on Amiga?').game.slug,'example-amiga');
assert.match(archiveFact(editions,'Who published Example on Amiga?').reply,/Amiga Publisher/);
assert.match(archiveFact(editions,'When was Example released on Amiga?').reply,/1991/);
assert.match(archiveFact(editions,'Who composed the music for Example on Amiga?').reply,/Amiga Musician/);
assert.match(archiveFact(editions,'Who published Example on Commodore 64?').reply,/C64 Publisher/);
assert.equal(archiveFact(editions,'Who published Example on ZX Spectrum?'),null);
assert.equal(archiveFact(editions,'Who published Example on C64 and Amiga?'),null);
assert.equal(archiveFact([editions[0]],'Who published Example on Amiga?'),null);
console.log('CCG Retro Assistant: explicit edition attribution never borrows a different platform');

assert.match(hardwareFact('Tell me about the SID chip'), /three independently programmable/);
assert.match(hardwareFact('What is Paula?'), /four channels/);
assert.equal(hardwareFact('How do I open a chest?'),null);
console.log('CCG Retro Assistant: canonical publisher/year/composer/CCG rating, magazine restraint and hardware facts passed');
