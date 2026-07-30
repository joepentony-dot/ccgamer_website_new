import fs from 'node:fs';

const required = [
  'resources/audio/easter-eggs/pacman.html',
  'resources/css/easter-eggs-pacman.css',
  'js/easter-eggs/pacman-game.js',
  'js/easter-eggs/easter-egg-registry.js'
];

for (const file of required) {
  if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);
}

const html = fs.readFileSync(required[0], 'utf8');
const css = fs.readFileSync(required[1], 'utf8');
const js = fs.readFileSync(required[2], 'utf8');
const registry = fs.readFileSync(required[3], 'utf8');

const checks = [
  ['local title', html.includes('CCG Local Pac-Man Easter Egg')],
  ['canvas', html.includes('<canvas width="380" height="440"')],
  ['touch controls', html.includes('data-direction="up"') && html.includes('data-direction="right"')],
  ['local script', html.includes('../../../../js/easter-eggs/pacman-game.js')],
  ['responsive stage', css.includes('aspect-ratio: 19 / 22')],
  ['coarse pointer controls', css.includes('@media (pointer: coarse)')],
  ['game loop', js.includes('requestAnimationFrame(frame)')],
  ['score and lives', js.includes('scoreEl') && js.includes('livesEl')],
  ['E5 registry', /code: "pacman"[^\n]+phase: "E5"/.test(registry)],
  ['legacy maintenance removed', !html.includes('Maintenance - Moota.co') && !html.includes('Sedang migrasi')]
];

const failed = checks.filter(([, passed]) => !passed).map(([name]) => name);
if (failed.length) throw new Error(`E5 Pac-Man validation failed: ${failed.join(', ')}`);
console.log(JSON.stringify({ verdict: 'PASS', checks: checks.map(([name]) => name) }, null, 2));
