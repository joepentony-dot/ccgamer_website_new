#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const file = path.resolve(__dirname, "generate-composer-pages.js");
let source = fs.readFileSync(file, "utf8");

function replaceExact(before, after, expectedCount, label) {
    const count = source.split(before).length - 1;
    if (count !== expectedCount) {
        throw new Error(`${label}: expected ${expectedCount} exact match(es), found ${count}`);
    }
    source = source.split(before).join(after);
}

replaceExact(
    '} = require("./composer-utils");\n',
    '} = require("./composer-utils");\nconst { renderPublicHeader, renderPublicHeaderStyleLinks } = require("./shared-public-header");\n',
    1,
    "shared header import"
);

replaceExact(
    '  <link rel="stylesheet" href="/resources/css/ccg-master.css">\n  <link rel="stylesheet" href="/resources/css/ccg-buttons.css">\n  <link rel="stylesheet" href="/resources/css/music-composer.css">',
    '  <link rel="stylesheet" href="/resources/css/ccg-master.css">\n  ${renderPublicHeaderStyleLinks()}\n  <link rel="stylesheet" href="/resources/css/music-composer.css">',
    2,
    "generated header styles"
);

replaceExact(
    '<body class="ccg-body" data-ccg-mode="c64" data-mode="c64">\n  <main class="ccg-main ccg-composer-page"',
    '<body class="ccg-body" data-ccg-mode="c64" data-mode="c64">\n  ${renderPublicHeader({ activeHref: "/music/" })}\n  <main class="ccg-main ccg-composer-page"',
    1,
    "generated composer source header"
);

replaceExact(
    '<body class="ccg-body" data-ccg-mode="c64" data-mode="c64">\n  <main class="ccg-main ccg-music-hub">',
    '<body class="ccg-body" data-ccg-mode="c64" data-mode="c64">\n  ${renderPublicHeader({ activeHref: "/music/" })}\n  <main class="ccg-main ccg-music-hub">',
    1,
    "generated hub source header"
);

replaceExact(
    '  <script src="/js/ccg-music-config.js" defer></script>',
    '  <script src="/js/ccg-nav-core.js" defer></script>\n  <script src="/js/ccg-music-config.js" defer></script>',
    2,
    "generated nav core bootstrap"
);

fs.writeFileSync(file, source, "utf8");
console.log("Composer generator patched for static first-paint headers without regenerating archive content.");
