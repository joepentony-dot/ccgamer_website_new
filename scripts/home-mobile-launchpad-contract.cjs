// Exact, all-or-nothing mobile homepage HTML contract.
'use strict';
const blocks = [
  [
    "home-mobile-launchpad.css",
    "    <link rel=\"stylesheet\" href=\"/resources/css/home-mobile-launchpad.css\" />\n",
    "</head>"
  ],
  [
    "home-hero__cta--mobile-play",
    "                                    <a href=\"/emulator/c64/\" class=\"ccg-btn ccg-btn--neon home-hero__cta home-hero__cta--mobile-play\" aria-label=\"Play Commodore 64 games in your browser\">Play C64 Games</a>\n",
    "                                    <button type=\"button\"\n                                            class=\"ccg-btn ccg-btn--neon home-hero__cta home-hero__cta--random\""
  ],
  [
    "home-archive-route--mobile-quick",
    "                    <a href=\"/games/genres/\" class=\"home-archive-route home-archive-route--mobile-quick\"><strong class=\"home-archive-route__title\">Genres</strong></a>\n                    <a href=\"/games/collections/\" class=\"home-archive-route home-archive-route--mobile-quick\"><strong class=\"home-archive-route__title\">Collections</strong></a>\n",
    "                    <a href=\"/choose-your-own-adventure/\" class=\"home-archive-route\">"
  ],
  [
    "home-mobile-shop-support",
    "            <!-- Compact mobile equivalent of the three original commercial panels. -->\n            <section class=\"home-mobile-shop-support\" aria-labelledby=\"home-mobile-shop-support-title\">\n                <h2 id=\"home-mobile-shop-support-title\">Shop &amp; Support</h2>\n                <p>Optional support and retro gaming gear. Some links earn a commission which helps support the channel.</p>\n                <details class=\"home-mobile-shop-support__details\">\n                    <summary>Explore shops &amp; ways to support CCG</summary>\n                    <p>The archive is free to everyone. If you'd like to help, you're welcome to chip in. No obligation.</p>\n                    <div class=\"home-mobile-shop-support__links\">\n                        <a href=\"https://cheeky-commodore-gamer-shop.fourthwall.com/en-gbp\" target=\"_blank\" rel=\"noopener noreferrer\" data-ccg-revenue-link=\"fourthwall-merch\">CCG Merch Shop</a>\n                        <a href=\"/retro-shop.html\">Amazon Retro Shop</a>\n                        <a href=\"https://www.paypal.com/donate/?hosted_button_id=LGG86ZV9P4YKL\" target=\"_blank\" rel=\"noopener noreferrer\" data-ccg-revenue-link=\"paypal-beer\">Buy Joe a Beer</a>\n                        <a href=\"https://www.patreon.com/CheekyCommodoreGamer\" target=\"_blank\" rel=\"noopener noreferrer\" data-ccg-revenue-link=\"patreon\">Patreon</a>\n                        <a href=\"https://www.youtube.com/@CheekyCommodoreGamer\" target=\"_blank\" rel=\"noopener noreferrer\">YouTube</a>\n                        <a href=\"/support.html\">More support options</a>\n                    </div>\n                </details>\n            </section>\n\n",
    "            <!-- CCG RETRO SHOP: NON-INTRUSIVE LINK TO CURATED COLLECTIONS -->"
  ],
  [
    "home-mobile-media",
    "                <details class=\"home-mobile-media\" aria-label=\"Latest uploads and recent games\">\n                    <summary>Latest uploads &amp; recent games</summary>\n                    <div data-ccg-home-history-slot></div>\n                    <div data-ccg-home-video-slot></div>\n                    <a class=\"home-mobile-media__archive\" href=\"/videos/\">Browse the video archive →</a>\n                </details>\n\n",
    "                <div class=\"home-featured-videos\" aria-labelledby=\"home-videos-heading\">"
  ]
];
function stripApprovedMobileLaunchpad(html) {
  let output = String(html);
  if (!blocks.some(([marker]) => output.includes(marker))) return output;
  for (const [marker, block, anchor] of blocks) {
    const expected = block + anchor;
    if (output.split(expected).length !== 2) throw Error('Incomplete, altered, duplicated or moved mobile launchpad: ' + marker);
    output = output.replace(expected, anchor);
    if (output.includes(marker)) throw Error('Unexpected extra mobile launchpad marker: ' + marker);
  }
  return output;
}
module.exports = { stripApprovedMobileLaunchpad };
