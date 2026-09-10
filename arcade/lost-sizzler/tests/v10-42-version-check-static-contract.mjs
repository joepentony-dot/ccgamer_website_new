import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../js/version-check.js', import.meta.url), 'utf8');

assert.match(source, /fetch\(`version\.json\?check=\$\{Date\.now\(\)\}`/);
assert.match(source, /cache:\s*"no-store"/);
assert.match(source, /title\.textContent="Update Available"/);
assert.match(source, /Refresh to Latest Version/);
assert.match(source, /setInterval\(\(\)=>\{checkLatest\(false\)/);

console.log('V10.42 version-check static contract passed');
