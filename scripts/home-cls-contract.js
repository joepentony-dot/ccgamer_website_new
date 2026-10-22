'use strict';
const { createHash } = require('node:crypto');
const { PUBLIC_HEADER_FIRST_PAINT_STYLES, MODE_BODY_BOOTSTRAP, buildModeIdentityMarkup } = require('./normalize-public-header-shell.js');
const compact = value => String(value).replace(/\s+/g, ' ').trim();
const digest = value => createHash('sha256').update(compact(value)).digest('hex');
// Exact reviewed static fallback component; edits require a new reviewed hash.
const PULSE_SHA256 = 'f125e2a144edc1eaf5bc603401b548afc2468ddec22a16a6a019511d2d90adf2';

function stripApprovedHomeCls(html) {
  let output = String(html);
  const styles = [...output.matchAll(/<link\b[^>]*data-ccg-public-header-first-paint-style="true"[^>]*>/g)].map(match => match[0]);
  if (styles.length) {
    if (styles.length !== PUBLIC_HEADER_FIRST_PAINT_STYLES.length) throw Error('Incomplete first-paint Home CSS stack');
    styles.forEach((tag, index) => {
      const expected = `<link rel="stylesheet" href="${PUBLIC_HEADER_FIRST_PAINT_STYLES[index]}" data-ccg-public-header-first-paint-style="true">`;
      if (tag !== expected) throw Error('Unapproved Home first-paint CSS dependency or order');
      output = output.replace(tag, '');
    });
  }
  const identity = output.match(/<aside\b[^>]*id="ccgModeIdentityBar"[^>]*>[\s\S]*?<\/aside>/)?.[0];
  if (identity) {
    const expected = buildModeIdentityMarkup().replace('data-ccg-music-static-mode-identity', 'data-ccg-static-mode-identity');
    if (compact(identity) !== compact(expected)) throw Error('Unapproved Home mode-status markup');
    output = output.replace(identity, '');
  }
  const pulse = output.match(/<section\b[^>]*data-ccg-static-pulse="true"[^>]*>[\s\S]*?<\/section>/)?.[0];
  if (pulse) {
    if (digest(pulse) !== PULSE_SHA256) throw Error('Unapproved Home Archive Pulse markup');
    output = output.replace(pulse, '');
  }
  const bootstrap = output.match(/<script\b[^>]*data-ccg-first-paint-mode="true"[^>]*>[\s\S]*?<\/script>/)?.[0];
  if (bootstrap) {
    if (bootstrap !== MODE_BODY_BOOTSTRAP) throw Error('Unapproved Home mode bootstrap');
    output = output.replace(bootstrap, '');
  }
  for (const tag of [
    '<link rel="stylesheet" href="/resources/css/ccg-archive-pulse-thumbnails.css">',
    '<link rel="stylesheet" href="/resources/css/ccg-performance-foundations.css">',
    '<link rel="preload" as="script" href="/js/ccg-archive-pulse-randomizer.js">',
    '<script src="/js/ccg-archive-pulse-randomizer.js"></script>',
    '<!-- Settled shared layout is a first-paint dependency. -->'
  ]) output = output.replace(tag, '');
  return output;
}
function isApprovedHomeClsChange(before, after) {
  try { return compact(stripApprovedHomeCls(before)) === compact(stripApprovedHomeCls(after)); }
  catch (_error) { return false; }
}
function isApprovedHomeClsChangeFromMain(root) {
  try {
    const before = require('node:child_process').execFileSync('git', ['show', 'origin/main:home.html'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const after = require('node:fs').readFileSync(require('node:path').join(root, 'home.html'), 'utf8');
    return isApprovedHomeClsChange(before, after);
  } catch (_error) { return false; }
}
module.exports = { stripApprovedHomeCls, isApprovedHomeClsChange, isApprovedHomeClsChangeFromMain };
