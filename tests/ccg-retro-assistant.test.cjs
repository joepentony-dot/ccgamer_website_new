const assert = require('node:assert/strict');
const { matchingGames, words } = require('../js/ccg-retro-assistant.js');
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
console.log('CCG Retro Assistant: 9 archive, platform, safety and relevance tests passed');


/* Home-only bootstrap is independent from the approved CLS whitelist. */
test('Home-only bootstrap loads assistant without changing protected HTML', () => {
  const randomizer = fs.readFileSync(path.join(ROOT, 'js/ccg-archive-pulse-randomizer.js'), 'utf8');
  const home = fs.readFileSync(path.join(ROOT, 'home.html'), 'utf8');
  assert.match(randomizer, /data-ccg-page/);
  assert.match(randomizer, /\/js\/ccg-retro-assistant\.js/);
  assert.match(randomizer, /data-ai-enabled/);
  assert.doesNotMatch(home, /ccg-retro-assistant\.js/);
});
