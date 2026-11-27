'use strict';
const { createHash } = require('node:crypto');
const { stripApprovedMobileLaunchpad } = require('./home-mobile-launchpad-contract.cjs');
const { PUBLIC_HEADER_FIRST_PAINT_STYLES, MODE_BODY_BOOTSTRAP, buildModeIdentityMarkup } = require('./normalize-public-header-shell.js');
const compact = value => String(value).replace(/\s+/g, ' ').trim();
const digest = value => createHash('sha256').update(compact(value)).digest('hex');
// Exact reviewed static fallback component; edits require a new reviewed hash.
const PULSE_SHA256 = 'f125e2a144edc1eaf5bc603401b548afc2468ddec22a16a6a019511d2d90adf2';
// Reviewed THEA1200 homepage feature; pin the release copy, affiliate link and image dimensions.
const REVIEWED_THEA1200_HOME = "<section class=\"ccg-thea1200-home\" aria-labelledby=\"ccg-thea1200-home-title\">\n                <a class=\"ccg-thea1200-home__image-link\" href=\"/thea1200/\" aria-label=\"More information about THEA1200\">\n                    <img src=\"https://m.media-amazon.com/images/I/71y3hzmFtcL._AC_SL1500_.jpg\" width=\"480\" height=\"480\" loading=\"lazy\" decoding=\"async\" alt=\"THEA1200 retro computer package with keyboard, mouse and gamepad\" />\n                </a>\n                <div class=\"ccg-thea1200-home__content\">\n                    <p class=\"ccg-thea1200-home__eyebrow\">COMING SOON · EXPECTED 15 · 12 · 2026</p>\n                    <h2 id=\"ccg-thea1200-home-title\">THEA1200</h2>\n                    <p>Following its 19 November announcement, Retro Games Ltd now targets <strong>15 December 2026</strong> for THEA1200. As with any release date, this may still change.</p>\n                    <p class=\"ccg-thea1200-home__disclosure\">If you're planning to pick one up, using the CCG Amazon link helps support the channel at no extra cost to you.</p>\n                    <div class=\"ccg-thea1200-home__actions\">\n                        <a class=\"ccg-thea1200-home__button ccg-thea1200-home__button--primary\" href=\"https://www.amazon.co.uk/Retro-Games-THE-A1200/dp/B0G1L9Q7WK?linkCode=ll2&amp;tag=cheekycomm00d-21&amp;linkId=215a465179e39bed0c29211064133c3c&amp;ref_=as_li_ss_tl\" target=\"_blank\" rel=\"sponsored nofollow noopener noreferrer\" data-ccg-revenue-link=\"amazon-associates-2026\">Pre-order on Amazon</a>\n                        <a class=\"ccg-thea1200-home__button\" href=\"/retro-shop.html\">MORE FROM AMAZON</a>\n                        <a class=\"ccg-thea1200-home__more\" href=\"/thea1200/\">More info <span aria-hidden=\"true\">→</span></a>\n                    </div>\n                </div>\n            </section>";
// Owner-approved concise feature, same product attribution and date caveat.
const REVIEWED_THEA1200_HOME_COMPACT = "<section class=\"ccg-thea1200-home\" aria-labelledby=\"ccg-thea1200-home-title\">\n                <a class=\"ccg-thea1200-home__image-link\" href=\"/thea1200/\" aria-label=\"More information about THEA1200\">\n                    <img src=\"https://m.media-amazon.com/images/I/71y3hzmFtcL._AC_SL1500_.jpg\" width=\"480\" height=\"480\" loading=\"lazy\" decoding=\"async\" alt=\"THEA1200 retro computer package with keyboard, mouse and gamepad\" />\n                </a>\n                <div class=\"ccg-thea1200-home__content\">\n                    <p class=\"ccg-thea1200-home__eyebrow\">HARDWARE NEWS</p>\n                    <h2 id=\"ccg-thea1200-home-title\">THEA1200</h2>\n                    <p>Retro Games Ltd announced a <strong>15 December 2026</strong> release target on 19 November. Availability may change.</p>\n                    <p class=\"ccg-thea1200-home__disclosure\">As an Amazon Associate I earn from qualifying purchases. <a href=\"/affiliate-disclosure.html\">Affiliate disclosure</a>.</p>\n                    <div class=\"ccg-thea1200-home__actions\">\n                        <a class=\"ccg-thea1200-home__button ccg-thea1200-home__button--primary\" href=\"https://www.amazon.co.uk/Retro-Games-THE-A1200/dp/B0G1L9Q7WK?linkCode=ll2&amp;tag=cheekycomm00d-21&amp;linkId=215a465179e39bed0c29211064133c3c&amp;ref_=as_li_ss_tl\" target=\"_blank\" rel=\"sponsored nofollow noopener noreferrer\" data-ccg-revenue-link=\"amazon-associates-2026\">View on Amazon</a>\n                        <a class=\"ccg-thea1200-home__more\" href=\"/thea1200/\">More info <span aria-hidden=\"true\">→</span></a>\n                    </div>\n                </div>\n            </section>";
const REVIEWED_THEA1200_COMMENT = "<!-- THEA1200 HOMEPAGE FEATURE: EXPECTED UK DATE AND EXISTING AFFILIATE LINKS -->";
const REVIEWED_THEA1200_CSS_TAGS = [
  '<link rel="preload" href="/resources/css/home-thea1200.css" as="style" onload="this.onload=null;this.rel=\'stylesheet\'">',
  '<noscript><link rel="stylesheet" href="/resources/css/home-thea1200.css" /></noscript>'
];
// Exact owner-approved retro-shop home feature. Any content or style-tag change must be reviewed.
const REVIEWED_RETRO_SHOP_PROMO = "<section class=\"ccg-amazon-home-promo\" aria-labelledby=\"ccg-amazon-home-promo-title\">\n                <div class=\"ccg-amazon-home-promo__copy\">\n                    <p class=\"ccg-amazon-home-promo__kicker\">Retro Gaming Shop · Amazon UK</p>\n                    <h2 id=\"ccg-amazon-home-promo-title\">Retro books, Evercade games &amp; classic hardware</h2>\n                    <p>Have a browse through my selected Bitmap Books, Evercade collections and C64/Amiga accessories. Some links earn a commission which helps support the channel.</p>\n                </div>\n                <a class=\"ccg-amazon-home-promo__link\" href=\"/retro-shop.html\">Explore the Retro Shop</a>\n            </section>";
const REVIEWED_RETRO_SHOP_COMMENT = '<!-- CCG RETRO SHOP: NON-INTRUSIVE LINK TO CURATED COLLECTIONS -->';
// Reviewed, page-scoped adventure link: exact static text and SVG, no executable markup.
const REVIEWED_ADVENTURE_CARD = "<a href=\"/choose-your-own-adventure/\" class=\"home-archive-route\">\n                        <span class=\"home-archive-route__icon\" aria-hidden=\"true\">\n                            <svg viewBox=\"0 0 32 32\" focusable=\"false\"><path d=\"M4 6.5c4-1.5 8-1.5 12 1 4-2.5 8-2.5 12-1V26c-4-1.5-8-1.5-12 1-4-2.5-8-2.5-12-1V6.5Z\"></path><path d=\"M16 7.5V27M8 12h4M20 12h4M8 17h4M20 17h4\"></path></svg>\n                        </span>\n                        <span class=\"home-archive-route__body\">\n                            <span class=\"home-archive-route__eyebrow\">Interactive 1980s gamebook</span>\n                            <strong class=\"home-archive-route__title\">Choose Your Own Adventure</strong>\n                            <span class=\"home-archive-route__text\">Your brother, your Commodore 64 and 26 endings. One mistake could ruin your childhood.</span>\n                            <span class=\"home-archive-route__cta\">Begin the adventure →</span>\n                        </span>\n                    </a>";
const REVIEWED_RETRO_SHOP_CSS_TAGS = [
  "<link rel=\"preload\" href=\"/resources/css/retro-shop.css\" as=\"style\" onload=\"this.onload=null;this.rel='stylesheet'\">",
  "<noscript><link rel=\"stylesheet\" href=\"/resources/css/retro-shop.css\" /></noscript>"
];


// Exact static hierarchy relocation: reverse approved edits before prior contracts.
function restoreApprovedHomeHierarchy(html) {
  let output = String(html);
  if (!output.includes('home-mobile-originals') && !output.includes('home-archive-route--mobile-music')) return output;
  const edits = [
  [
    "            <!-- CCG merchandise: lightweight external checkout, no third-party script or embed. -->\n            <section class=\"home-merch-promo\" aria-labelledby=\"home-merch-title\">\n                <a class=\"home-merch-promo__link\" href=\"https://cheeky-commodore-gamer-shop.fourthwall.com/en-gbp\"\n                   target=\"_blank\" rel=\"noopener noreferrer\" data-ccg-revenue-link=\"fourthwall-merch\"\n                   aria-label=\"Visit the official CCG merchandise shop on Fourthwall (opens in a new tab)\">\n                    <span class=\"home-merch-promo__mark\" aria-hidden=\"true\">CCG</span>\n                <div class=\"home-merch-promo__copy\">\n                    <span class=\"home-merch-promo__eyebrow\">OFFICIAL CHEEKY COMMODORE GAMER MERCHANDISE</span>\n                    <h2 class=\"home-merch-promo__title\" id=\"home-merch-title\">The CCG Merch Shop</h2>\n                    <p class=\"home-merch-promo__description\">Retro gaming T-shirts, mugs, hoodies, badges and more. Purchases help support the Cheeky Commodore Gamer channel and archive.</p>\n                </div>\n                    <span class=\"home-merch-promo__action\" aria-hidden=\"true\">\n                        EXPLORE MERCH <span aria-hidden=\"true\">→</span>\n                    </span>\n                </a>\n            </section>\n\n            <!-- Compact mobile equivalent of the three original commercial panels. -->",
    "            <!-- Compact mobile equivalent of the three original commercial panels. -->"
  ],
  [
    "            <!-- Mobile originals: existing desktop routes remain intact. -->\n            <section class=\"home-mobile-originals\" aria-labelledby=\"home-mobile-originals-title\">\n                <h2 id=\"home-mobile-originals-title\">CCG Originals</h2>\n                <div class=\"home-mobile-originals__links\">\n                    <a href=\"/arcade/c64-dungeon-carnage/\"><strong>Dungeon Carnage</strong><span>Play the dungeon adventure</span></a>\n                    <a href=\"/choose-your-own-adventure/\"><strong>Choose Your Own Adventure</strong><span>Interactive retro gamebook</span></a>\n                </div>\n            </section>\n\n",
    ""
  ],
  [
    "            <div class=\"ccg-omega-divider\" aria-hidden=\"true\">\n                <span class=\"ccg-omega-core\"></span>\n            </div>\n\n            <section class=\"home-community-latest ccg-chapter\"",
    "            <!-- CCG merchandise: lightweight external checkout, no third-party script or embed. -->\n            <section class=\"home-merch-promo\" aria-labelledby=\"home-merch-title\">\n                <a class=\"home-merch-promo__link\" href=\"https://cheeky-commodore-gamer-shop.fourthwall.com/en-gbp\"\n                   target=\"_blank\" rel=\"noopener noreferrer\" data-ccg-revenue-link=\"fourthwall-merch\"\n                   aria-label=\"Visit the official CCG merchandise shop on Fourthwall (opens in a new tab)\">\n                    <span class=\"home-merch-promo__mark\" aria-hidden=\"true\">CCG</span>\n                <div class=\"home-merch-promo__copy\">\n                    <span class=\"home-merch-promo__eyebrow\">OFFICIAL CHEEKY COMMODORE GAMER MERCHANDISE</span>\n                    <h2 class=\"home-merch-promo__title\" id=\"home-merch-title\">The CCG Merch Shop</h2>\n                    <p class=\"home-merch-promo__description\">Retro gaming T-shirts, mugs, hoodies, badges and more. Purchases help support the Cheeky Commodore Gamer channel and archive.</p>\n                </div>\n                    <span class=\"home-merch-promo__action\" aria-hidden=\"true\">\n                        EXPLORE MERCH <span aria-hidden=\"true\">→</span>\n                    </span>\n                </a>\n            </section>\n\n            <div class=\"ccg-omega-divider\" aria-hidden=\"true\">\n                <span class=\"ccg-omega-core\"></span>\n            </div>\n\n            <section class=\"home-community-latest ccg-chapter\""
  ],
  [
    "                    <a href=\"/music/\" class=\"home-archive-route home-archive-route--mobile-music\"><strong class=\"home-archive-route__title\">Music</strong></a>\n                    <a href=\"/choose-your-own-adventure/\" class=\"home-archive-route\">",
    "                    <a href=\"/choose-your-own-adventure/\" class=\"home-archive-route\">"
  ],
  [
    "Explore more of the archive",
    "Explore more: genres, publishers, collections, music, Zzap!64 and specials"
  ],
  [
    "                <section class=\"ccg-archive-pulse\" data-ccg-archive-pulse=\"true\" data-ccg-static-pulse=\"true\" aria-labelledby=\"ccg-archive-pulse-title\"><div class=\"ccg-archive-pulse__header\"><div><p class=\"ccg-archive-pulse__kicker\">Archive Pulse</p><h2 class=\"ccg-archive-pulse__title\" id=\"ccg-archive-pulse-title\">Something Different Every Visit</h2></div><a class=\"ccg-archive-pulse__all\" href=\"/games/\">Browse all games →</a></div><div class=\"ccg-archive-pulse__grid\"><a class=\"ccg-archive-pulse__card ccg-archive-pulse__card--has-thumb\" href=\"/games/ace-of-aces/\" data-ccg-archive-pulse=\"game-of-the-day\"><img class=\"ccg-archive-pulse__thumb\" src=\"/resources/images/thumbnails/all/ace_of_aces.jpg\" width=\"96\" height=\"72\" loading=\"lazy\" decoding=\"async\" alt=\"\"><span class=\"ccg-archive-pulse__label\">Fresh Game Pick</span><span class=\"ccg-archive-pulse__name\">Ace Of Aces</span><span class=\"ccg-archive-pulse__meta\">1986 · Accolade · strategy</span></a>\n<a class=\"ccg-archive-pulse__card ccg-archive-pulse__card--has-thumb\" href=\"/games/20-tons/\" data-ccg-archive-pulse=\"archive-pick\"><img class=\"ccg-archive-pulse__thumb\" src=\"/resources/images/thumbnails/all/20_tons_new.png\" width=\"96\" height=\"72\" loading=\"lazy\" decoding=\"async\" alt=\"\"><span class=\"ccg-archive-pulse__label\">Archive Pick</span><span class=\"ccg-archive-pulse__name\">20 Tons</span><span class=\"ccg-archive-pulse__meta\">1985 · 64 Tape Computing · arcade</span></a>\n<a class=\"ccg-archive-pulse__card\" href=\"/retro-specials/zzap64-20-lowest-scoring-commodore-64-games/\" data-ccg-archive-pulse=\"zzap-feature\"><span class=\"ccg-archive-pulse__label\">Zzap!64 Feature</span><span class=\"ccg-archive-pulse__name\">Was Zzap!64 Too Harsh? The 20 Lowest-Scoring Commodore 64 Games</span><span class=\"ccg-archive-pulse__meta\">The 20 lowest-scoring Commodore 64 games reviewed by Zzap!64, counting down from 10% to a miserable 3%.</span></a></div></section>\n<script src=\"/js/ccg-archive-pulse-randomizer.js\"></script>\n\n                <details class=\"home-mobile-media\" aria-label=\"Latest uploads and recent games\">",
    "                <details class=\"home-mobile-media\" aria-label=\"Latest uploads and recent games\">"
  ],
  [
    "            <!-- PRIMARY ACTION + OPTIONAL RANDOM DISCOVERY -->\n",
    "            <!-- PRIMARY ACTION + OPTIONAL RANDOM DISCOVERY -->\n            <section class=\"ccg-archive-pulse\" data-ccg-archive-pulse=\"true\" data-ccg-static-pulse=\"true\" aria-labelledby=\"ccg-archive-pulse-title\"><div class=\"ccg-archive-pulse__header\"><div><p class=\"ccg-archive-pulse__kicker\">Archive Pulse</p><h2 class=\"ccg-archive-pulse__title\" id=\"ccg-archive-pulse-title\">Something Different Every Visit</h2></div><a class=\"ccg-archive-pulse__all\" href=\"/games/\">Browse all games →</a></div><div class=\"ccg-archive-pulse__grid\"><a class=\"ccg-archive-pulse__card ccg-archive-pulse__card--has-thumb\" href=\"/games/ace-of-aces/\" data-ccg-archive-pulse=\"game-of-the-day\"><img class=\"ccg-archive-pulse__thumb\" src=\"/resources/images/thumbnails/all/ace_of_aces.jpg\" width=\"96\" height=\"72\" loading=\"lazy\" decoding=\"async\" alt=\"\"><span class=\"ccg-archive-pulse__label\">Fresh Game Pick</span><span class=\"ccg-archive-pulse__name\">Ace Of Aces</span><span class=\"ccg-archive-pulse__meta\">1986 · Accolade · strategy</span></a>\n<a class=\"ccg-archive-pulse__card ccg-archive-pulse__card--has-thumb\" href=\"/games/20-tons/\" data-ccg-archive-pulse=\"archive-pick\"><img class=\"ccg-archive-pulse__thumb\" src=\"/resources/images/thumbnails/all/20_tons_new.png\" width=\"96\" height=\"72\" loading=\"lazy\" decoding=\"async\" alt=\"\"><span class=\"ccg-archive-pulse__label\">Archive Pick</span><span class=\"ccg-archive-pulse__name\">20 Tons</span><span class=\"ccg-archive-pulse__meta\">1985 · 64 Tape Computing · arcade</span></a>\n<a class=\"ccg-archive-pulse__card\" href=\"/retro-specials/zzap64-20-lowest-scoring-commodore-64-games/\" data-ccg-archive-pulse=\"zzap-feature\"><span class=\"ccg-archive-pulse__label\">Zzap!64 Feature</span><span class=\"ccg-archive-pulse__name\">Was Zzap!64 Too Harsh? The 20 Lowest-Scoring Commodore 64 Games</span><span class=\"ccg-archive-pulse__meta\">The 20 lowest-scoring Commodore 64 games reviewed by Zzap!64, counting down from 10% to a miserable 3%.</span></a></div></section>\n<script src=\"/js/ccg-archive-pulse-randomizer.js\"></script>\n"
  ]
];
  for (const [from,to] of edits) {
    if (output.split(from).length !== 2) throw Error('Incomplete or altered approved home hierarchy');
    output = output.replace(from,to);
  }
  if (output.includes('home-mobile-originals') || output.includes('home-archive-route--mobile-music')) throw Error('Duplicate approved home hierarchy');
  return output;
}

function stripApprovedHomeCls(html) {
  let output = stripApprovedMobileLaunchpad(restoreApprovedHomeHierarchy(html));
  // Exact approved community wording and no-JS rate route; retain original comparison baseline.
  const oldCommunity = "<section class=\"home-community-latest ccg-chapter\" id=\"homeCommunityLatest\" aria-labelledby=\"home-community-heading\">\n                <div class=\"home-community-latest__header\">\n                    <div>\n                        <span class=\"home-highlight-card__eyebrow\">Latest from the CCG Community</span>\n                        <h2 class=\"home-community-latest__title\" id=\"home-community-heading\">The Latest Member Verdict</h2>\n                    </div>\n                    <a class=\"home-community-latest__all\" href=\"/community/latest-comments.html\">View all comments →</a>\n                </div>\n                <div class=\"home-community-latest__card\" id=\"homeCommunityLatestCard\" aria-live=\"polite\">\n                    <p class=\"ccg-community-muted\">Checking the latest community review…</p>\n                </div>\n            </section>";
  const newCommunity = "<section class=\"home-community-latest ccg-chapter\" id=\"homeCommunityLatest\" aria-labelledby=\"home-community-heading\">\n                <div class=\"home-community-latest__header\">\n                    <div>\n                        <span class=\"home-highlight-card__eyebrow\">CCG Community</span>\n                        <h2 class=\"home-community-latest__title\" id=\"home-community-heading\">Have your say</h2>\n                    </div>\n                    <a class=\"home-community-latest__all\" href=\"/community/latest-comments.html\">Latest reviews →</a>\n                </div>\n                <div class=\"home-community-latest__card\" id=\"homeCommunityLatestCard\" aria-live=\"polite\">\n                    <div class=\"home-community-latest__copy\">\n                        <strong>Rate the games you remember</strong>\n                        <p class=\"home-community-latest__review\">Sign in on any game page to share your score out of 10.</p>\n                        <a class=\"home-community-latest__game\" href=\"/games/\">Find a game to rate →</a>\n                    </div>\n                </div>\n            </section>";
  // Owner-approved collapsed community panel; preserve the exact historical comparison baseline.
  const collapsedCommunity = "<section class=\"home-community-latest ccg-chapter\" id=\"homeCommunityLatest\" aria-labelledby=\"home-community-heading\">\n                <details class=\"home-community-disclosure\">\n                    <summary class=\"home-community-disclosure__toggle\">\n                        <h2 class=\"home-community-latest__title\" id=\"home-community-heading\">CCG Community</h2>\n                        <span class=\"home-community-disclosure__hint\">Ratings &amp; reviews</span>\n                        <span class=\"home-community-disclosure__chevron\" aria-hidden=\"true\"></span>\n                    </summary>\n                    <div class=\"home-community-disclosure__body\">\n                        <a class=\"home-community-latest__all\" href=\"/community/latest-comments.html\">Latest reviews →</a>\n                        <div class=\"home-community-latest__card\" id=\"homeCommunityLatestCard\" aria-live=\"polite\">\n                            <div class=\"home-community-latest__copy\">\n                                <strong>Rate the games you remember</strong>\n                                <p class=\"home-community-latest__review\">Sign in on any game page to share your score out of 10.</p>\n                                <a class=\"home-community-latest__game\" href=\"/games/\">Find a game to rate →</a>\n                                <a class=\"home-community-latest__game\" href=\"/community/top-rated.html\">Top-rated games →</a>\n                            </div>\n                        </div>\n                    </div>\n                </details>\n            </section>";
  if (output.includes('home-community-disclosure')) {
    if (output.split(collapsedCommunity).length !== 2) throw Error('Unapproved or duplicate homepage community disclosure');
    output = output.replace(collapsedCommunity, newCommunity);
  }
  if (output.includes(newCommunity)) {
    if (output.split(newCommunity).length !== 2) throw Error('Duplicate homepage community panel');
    output = output.replace(newCommunity, oldCommunity);
  }
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
    if (![REVIEWED_THEA1200_HOME, REVIEWED_THEA1200_HOME_COMPACT].some(approved => compact(thea1200Panel) === compact(approved))) throw Error('Unapproved THEA1200 home markup or release copy');
    if (output.split(REVIEWED_THEA1200_COMMENT).length !== 2) throw Error('Missing or duplicate THEA1200 home marker');
    const community = output.indexOf('id="homeCommunityLatest"'), shop = output.indexOf(REVIEWED_RETRO_SHOP_COMMENT), feature = output.indexOf(thea1200Panel);
    if (community < 0 || shop < 0 || !(community < feature && feature < shop)) throw Error('THEA1200 home feature is outside reviewed position');
    for (const tag of REVIEWED_THEA1200_CSS_TAGS) {
      if (output.split(tag).length !== 2) throw Error('Missing or duplicate THEA1200 stylesheet');
      output = output.replace(tag, '');
    }
    output = output.replace(REVIEWED_THEA1200_COMMENT, '').replace(thea1200Panel, '');
  } else if (output.includes(REVIEWED_THEA1200_COMMENT) || REVIEWED_THEA1200_CSS_TAGS.some(tag => output.includes(tag))) {
    throw Error('Orphaned THEA1200 marker or stylesheet');
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
  // Allow only the exact approved home-launchpad adventure card, before the
  // existing Explore more disclosure. Keep all other Home changes fail-closed.
  const adventureAnchor = '<a href="/choose-your-own-adventure/" class="home-archive-route">';
  const adventureStart = output.indexOf(adventureAnchor);
  if (adventureStart !== -1) {
    const adventureEnd = output.indexOf('</a>', adventureStart);
    if (adventureEnd === -1) throw Error('Incomplete CCG adventure homepage card');
    const actualAdventureCard = output.slice(adventureStart, adventureEnd + 4);
    if (compact(actualAdventureCard) !== compact(REVIEWED_ADVENTURE_CARD)) {
      throw Error('Unapproved CCG adventure homepage card');
    }
    if (!output.slice(adventureEnd + 4).trimStart().startsWith('<details class="home-archive-more">')) {
      throw Error('CCG adventure card moved outside approved launchpad position');
    }
    output = output.slice(0, adventureStart) + output.slice(adventureEnd + 4);
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
