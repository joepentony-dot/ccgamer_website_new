'use strict';
const { createHash } = require('node:crypto');
const { PUBLIC_HEADER_FIRST_PAINT_STYLES, MODE_BODY_BOOTSTRAP, buildModeIdentityMarkup } = require('./normalize-public-header-shell.js');
const compact = value => String(value).replace(/\s+/g, ' ').trim();
const digest = value => createHash('sha256').update(compact(value)).digest('hex');
// Exact reviewed static fallback component; edits require a new reviewed hash.
const PULSE_SHA256 = 'f125e2a144edc1eaf5bc603401b548afc2468ddec22a16a6a019511d2d90adf2';
// Exact owner-approved retro-shop home feature. Any content or style-tag change must be reviewed.
const REVIEWED_RETRO_SHOP_PROMO = "<section class=\"ccg-amazon-home-promo\" aria-labelledby=\"ccg-amazon-home-promo-title\">\n                <div class=\"ccg-amazon-home-promo__copy\">\n                    <p class=\"ccg-amazon-home-promo__kicker\">Retro Gaming Shop · Amazon UK</p>\n                    <h2 id=\"ccg-amazon-home-promo-title\">Retro books, Evercade games &amp; classic hardware</h2>\n                    <p>Have a browse through my selected Bitmap Books, Evercade collections and C64/Amiga accessories. Some links earn a commission which helps support the channel.</p>\n                </div>\n                <a class=\"ccg-amazon-home-promo__link\" href=\"/retro-shop.html\">Explore the Retro Shop</a>\n            </section>";
// Exact owner-approved THEA1200 home promotion. The retailer date, product image and every link are pinned.
const REVIEWED_THEA1200_HOME = "<section class=\"ccg-thea1200-home\" aria-labelledby=\"ccg-thea1200-home-title\">\n                <a class=\"ccg-thea1200-home__image-link\" href=\"/thea1200/\" aria-label=\"More information about THEA1200\">\n                    <img src=\"https://m.media-amazon.com/images/I/71y3hzmFtcL._AC_SL1500_.jpg\" width=\"480\" height=\"480\" loading=\"lazy\" decoding=\"async\" alt=\"THEA1200 retro computer package with keyboard, mouse and gamepad\" />\n                </a>\n                <div class=\"ccg-thea1200-home__content\">\n                    <p class=\"ccg-thea1200-home__eyebrow\">COMING SOON · EXPECTED 15 · 12 · 2026</p>\n                    <h2 id=\"ccg-thea1200-home-title\">THEA1200</h2>\n                    <p>THEA1200 is now expected in the UK around <strong>15 December 2026</strong> according to retailer listings. The revised date has not yet been confirmed by Retro Games Ltd.</p>\n                    <p class=\"ccg-thea1200-home__disclosure\">If you're planning to pick one up, using the CCG Amazon link helps support the channel at no extra cost to you.</p>\n                    <div class=\"ccg-thea1200-home__actions\">\n                        <a class=\"ccg-thea1200-home__button ccg-thea1200-home__button--primary\" href=\"https://www.amazon.co.uk/Retro-Games-THE-A1200/dp/B0G1L9Q7WK?linkCode=ll2&amp;tag=cheekycomm00d-21&amp;linkId=215a465179e39bed0c29211064133c3c&amp;ref_=as_li_ss_tl\" target=\"_blank\" rel=\"sponsored nofollow noopener noreferrer\" data-ccg-revenue-link=\"amazon-associates-2026\">Pre-order on Amazon</a>\n                        <a class=\"ccg-thea1200-home__button\" href=\"/retro-shop.html\">MORE FROM AMAZON</a>\n                        <a class=\"ccg-thea1200-home__more\" href=\"/thea1200/\">More info <span aria-hidden=\"true\">→</span></a>\n                    </div>\n                </div>\n            </section>";
const REVIEWED_THEA1200_COMMENT = '<!-- THEA1200 HOMEPAGE FEATURE: EXPECTED UK DATE AND EXISTING AFFILIATE LINKS -->';
const REVIEWED_RETRO_SHOP_COMMENT = '<!-- CCG RETRO SHOP: NON-INTRUSIVE LINK TO CURATED COLLECTIONS -->';
const REVIEWED_RETRO_SHOP_CSS_TAGS = [
  "<link rel=\"preload\" href=\"/resources/css/retro-shop.css\" as=\"style\" onload=\"this.onload=null;this.rel='stylesheet'\">",
  "<noscript><link rel=\"stylesheet\" href=\"/resources/css/retro-shop.css\" /></noscript>"
];


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
  const thea1200Panel = output.match(/<section class="ccg-thea1200-home"[\s\S]*?<\/section>/)?.[0];
  if (thea1200Panel) {
    if (compact(thea1200Panel) !== compact(REVIEWED_THEA1200_HOME)) throw Error('Unapproved THEA1200 homepage feature');
    if (output.split(REVIEWED_THEA1200_COMMENT).length !== 2) throw Error('Missing or duplicated THEA1200 marker');
    if (!output.includes('id="homeCommunityLatest"') || !output.includes(REVIEWED_RETRO_SHOP_COMMENT)) {
      throw Error('THEA1200 panel is outside its approved homepage area');
    }
    output = output.replace(REVIEWED_THEA1200_COMMENT, '').replace(thea1200Panel, '');
  } else if (output.includes(REVIEWED_THEA1200_COMMENT)) {
    throw Error('Orphaned THEA1200 homepage marker');
  }
  const approvedShop = output.match(/<section class="ccg-amazon-home-promo"[\s\S]*?<\/section>/)?.[0];
  if (approvedShop) {
    if (compact(approvedShop) !== compact(REVIEWED_RETRO_SHOP_PROMO)) throw Error('Unapproved CCG shop homepage content');
    if (!output.includes(REVIEWED_RETRO_SHOP_COMMENT)) throw Error('Missing CCG shop marker');
    for (const tag of REVIEWED_RETRO_SHOP_CSS_TAGS) {
      if (!output.includes(tag)) throw Error('Missing reviewed CCG shop CSS');
      output = output.replace(tag, '');
    }
    output = output.replace(REVIEWED_RETRO_SHOP_COMMENT, '').replace(approvedShop, '');
  } else if (REVIEWED_RETRO_SHOP_CSS_TAGS.some(tag => output.includes(tag))) {
    throw Error('Unpaired CCG shop CSS tag');
  }
  for (const tag of [
    '<link rel="stylesheet" href="/resources/css/ccg-archive-pulse-thumbnails.css">',
    '<link rel="stylesheet" href="/resources/css/ccg-performance-foundations.css">',
    '<link rel="preload" as="script" href="/js/ccg-archive-pulse-randomizer.js">',
    '<script src="/js/ccg-archive-pulse-randomizer.js"></script>',
    '<!-- Settled shared layout is a first-paint dependency. -->'
  ]) output = output.replace(tag, '');
  // The owner-approved homepage ice-cream button is an exact, reviewed static block.
  // Remove only its precise markup and two explicit dependencies before comparing
  // all remaining homepage content against the unchanged origin/main baseline.
  const button = output.match(/<!-- Self-contained CCG sound button\. Reserve geometry in HTML; no layout injection\. -->\s*<section class="ccg-dnp" data-ccg-do-not-press[\s\S]*?<\/section>/)?.[0];
  if (button) {
    const normalized = compact(button);
    const gitBlobInput = 'blob ' + Buffer.byteLength(normalized, 'utf8') + '\0' + normalized;
    const actualHash = createHash('sha1').update(gitBlobInput).digest('hex');
    if (!['800521c8e936ad24c5d71b22ba408ca6a78205bf', '7711b04cce848e61bef05e5139a6ba7579880f8e', '8a4d26319fd87af8e9f1153dccaeaaf8b5469904'].includes(actualHash)) {
      throw Error('Unapproved homepage sound-button markup');
    }
    output = output.replace(button, '');
  }
  for (const tag of [
    '<link rel="stylesheet" href="/resources/css/ccg-do-not-press.css" />',
    '<script src="/js/ccg-do-not-press.js" defer></script>'
  ]) {
    const count = output.split(tag).length - 1;
    if (count !== (button ? 1 : 0)) {
      throw Error('Incomplete or unapproved homepage sound-button dependencies');
    }
    if (button) output = output.replace(tag, '');
  }
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
