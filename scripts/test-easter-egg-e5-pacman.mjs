import fs from 'node:fs';

const required = [
  'resources/audio/easter-eggs/pacman.html',
  'resources/css/pacman-touch.css',
  'js/easter-eggs/easter-egg-registry.js'
];

for (const file of required) {
  if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);
}

const html = fs.readFileSync(required[0], 'utf8');
const css = fs.readFileSync(required[1], 'utf8');
const registry = fs.readFileSync(required[2], 'utf8');

const checks = [
  ['original Pac-Man namespace', html.includes('var NONE') && html.includes('Pacman      = {}')],
  ['original game objects', html.includes('Pacman.Ghost = function') && html.includes('Pacman.User = function')],
  ['original keyboard mapping', html.includes('keyMap[KEY.ARROW_LEFT]') && html.includes('keyMap[KEY.ARROW_DOWN]')],
  ['local canvas host', html.includes('<div id="pacman"></div>')],
  ['virtual D-pad', html.includes('data-pacman-key-code="38"') && html.includes('data-pacman-key-code="39"')],
  ['start control', html.includes('START / NEW GAME') && html.includes('data-pacman-key-code="78"')],
  ['local touch stylesheet', html.includes('/resources/css/pacman-touch.css')],
  ['touch styling', css.includes('.ccg-pacman-dpad') && css.includes('.ccg-pacman-start')],
  ['local runtime only', !/cdnjs\.cloudflare\.com|raw\.githubusercontent\.com|jquery\.min\.js|modernizr\.min\.js/.test(html)],
  ['E5 registry', /code: "pacman"[^\n]+phase: "E5"/.test(registry)]
];

const failed = checks.filter(([, passed]) => !passed).map(([name]) => name);
if (failed.length) throw new Error(`Original Pac-Man validation failed: ${failed.join(', ')}`);
console.log(JSON.stringify({ verdict: 'PASS', checks: checks.map(([name]) => name) }, null, 2));
