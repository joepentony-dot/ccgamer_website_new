import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const pwa = fs.readFileSync('js/ccg-pwa.js', 'utf8');
const css = fs.readFileSync('resources/css/ccg-pwa-home-cta.css', 'utf8');

test('home support strip exposes the CCG app install CTA', () => {
  assert.match(pwa, /function ensureHomeInstallCta\(\)/);
  assert.match(pwa, /\[data-ccg-page=\"home\"\]/);
  assert.match(pwa, /\.home-support-strip__actions/);
  assert.match(pwa, /link\.href = \"\/install-app\.html\"/);
  assert.match(pwa, /data-ccg-home-install-app/);
  assert.match(pwa, /label\.textContent = \"Install CCG App\"/);
});

test('home install CTA uses the versioned app icon and dedicated styling', () => {
  assert.match(pwa, /const ICON_PATH = \"\/resources\/images\/ccg-app-icon-v2\.svg\"/);
  assert.match(pwa, /icon\.src = ICON_PATH/);
  assert.match(pwa, /ccg-pwa-home-cta\.css/);
  assert.match(css, /\.home-support-strip__app/);
  assert.match(css, /\.home-support-strip__app-icon/);
});

test('home install CTA stays in the current tab and cannot duplicate itself', () => {
  assert.match(pwa, /actions\.querySelector\(\"\[data-ccg-home-install-app\]\"\)/);
  assert.doesNotMatch(pwa, /home-support-strip__app[\s\S]{0,500}target\s*=\s*["']_blank["']/);
});
