#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const problems = [];

function read(relativePath) {
    const filePath = path.join(ROOT, relativePath);
    if (!fs.existsSync(filePath)) {
        problems.push(`Missing required file: ${relativePath}`);
        return "";
    }
    return fs.readFileSync(filePath, "utf8");
}

function requireText(source, expected, message) {
    if (!source.includes(expected)) problems.push(message);
}

const config = read("js/ccg-music-config.js");
const navigation = read("js/ccg-music-navigation.js");
const navCore = read("js/ccg-nav-core.js");
const navFit = read("js/ccg-nav-fit.js");
const navFitCss = read("resources/css/ccg-nav-fit.css");
const navViewportOverlay = read("resources/css/ccg-nav-viewport-overlay.css");
const homeCss = read("resources/css/home.css");
const amigaIdentity = read("js/ccg-amiga-identity.js");
const mobileAlignment = read("resources/css/ccg-amiga-mobile-alignment.css");
const musicHub = read("music/index.html");
const composerHub = read("music/composers/index.html");

requireText(config, "/js/ccg-music-navigation.js", "Music pages do not request the shared header bootstrap.");
requireText(navigation, "data-ccg-music-header", "The injected music header marker is missing.");
requireText(navigation, "/js/ccg-nav-core.js", "The music header does not load the unified navigation core.");
requireText(navigation, "function applyMode", "The late-loaded music header does not initialise its mode control.");
requireText(navigation, "function bindDrawer", "The late-loaded music header does not initialise its mobile drawer.");
requireText(navigation, "data-ccg-nav-drawer", "The music header is missing the mobile navigation drawer.");
requireText(navigation, "data-ccg-mode-toggle", "The music header is missing the C64/Amiga mode control.");
requireText(navCore, "/resources/css/ccg-nav-viewport-overlay.css", "The unified navigation core does not load the responsive drawer viewport lock.");
requireText(navCore, "loadRequiredStyles();", "The unified navigation core does not initialise required navigation styles.");
requireText(navViewportOverlay, "@media (max-width: 1199px)", "The drawer viewport lock does not cover the full responsive Menu breakpoint.");
requireText(navViewportOverlay, ".ccg-header.ccg-header--nav-open", "The drawer viewport lock is not scoped to the open responsive header.");
requireText(navViewportOverlay, "contain: none !important", "The open header can still establish paint/layout containment around the fixed drawer.");
requireText(navViewportOverlay, "transform: none !important", "The open header can still establish a transformed containing block around the fixed drawer.");
requireText(navViewportOverlay, "position: fixed !important", "The responsive drawer is not locked to fixed positioning.");
requireText(navViewportOverlay, "height: 100dvh !important", "The responsive drawer is not locked to the dynamic viewport height.");
requireText(navViewportOverlay, "width: 100dvw !important", "The responsive drawer is not locked to the dynamic viewport width.");
requireText(navViewportOverlay, "body.ccg-body--nav-open", "The responsive drawer does not preserve body scroll locking while open.");

requireText(homeCss, "overflow: clip;", "The Home header no longer exposes the expected visual clip contract used by the desktop More regression guard.");
requireText(navFit, 'header?.classList.toggle("ccg-header--more-open", isOpen);', "Desktop navigation does not expose the header More-open state.");
requireText(navFitCss, ".ccg-header.ccg-header--more-open .ccg-header-inner", "Desktop More-open styling does not release the Home header inner clip.");
requireText(navFitCss, ".ccg-header.ccg-header--more-open .ccg-nav__bar", "Desktop More-open styling does not release nav-bar paint containment.");
requireText(navFitCss, "overflow: visible !important;", "Desktop More-open styling does not allow the dropdown to escape the header panel.");
requireText(navFitCss, "contain: none !important;", "Desktop More-open styling does not remove paint containment from the dropdown ancestor chain.");

const expectedFeaturedSlugs = [
    "allister-brimble",
    "barry-leitch",
    "ben-daglish",
    "chris-huelsbeck",
    "david-dunn",
    "david-whittaker",
    "fred-gray",
    "martin-galway",
    "rob-hubbard",
    "jeroen-tel",
    "jonathan-dunn",
    "keith-tinman",
    "mark-cooksey",
    "matt-furniss",
    "matt-gray",
    "neil-brennan",
    "richard-joseph",
    "russell-lieblich",
    "steve-turner",
    "paul-norman"
];
expectedFeaturedSlugs.forEach((slug) => {
    requireText(config, `slug: "${slug}"`, `Featured Composer manifest is missing ${slug}.`);
    requireText(config, `/resources/images/composers/${slug}.`, `Featured Composer manifest is missing the repository portrait for ${slug}.`);
});
requireText(config, "const FEATURED_SIGNATURE", "Featured Composer restoration is missing its exact-list signature guard.");
requireText(config, 'grid.dataset.ccgFeaturedManifest = "restored-20"', "Featured Composer restoration is not marking the managed 20-card grid.");
requireText(config, "getFeaturedGridSignature(grid) === FEATURED_SIGNATURE", "Featured Composer restoration does not protect the exact card/image set from later renderer replacement.");
if (config.includes('slug: "reyn-ouwehand"')) {
    problems.push("Reyn Ouwehand has been reintroduced into the fixed Featured Composer manifest.");
}

requireText(musicHub, "/js/ccg-music-config.js", "The Music Hub does not load the music configuration bootstrap.");
requireText(composerHub, "/js/ccg-music-config.js", "The composer hub does not load the music configuration bootstrap.");
requireText(amigaIdentity, "/resources/css/ccg-amiga-mobile-alignment.css", "The mobile alignment layer is not loaded through the shared Amiga identity module.");
requireText(mobileAlignment, "left: calc(50% + 3px)", "The mobile Amiga mode position is not explicitly aligned.");
requireText(mobileAlignment, "left: 4px", "The mobile C64 mode position is not explicitly aligned.");
requireText(mobileAlignment, "transform: none !important", "Legacy transform positioning can still displace the mobile mode thumb.");

if (problems.length) {
    console.error("Music navigation audit failed:");
    problems.forEach((problem) => console.error(` - ${problem}`));
    process.exit(1);
}

console.log("Music navigation, Featured Composer restoration, desktop More overflow, responsive drawer viewport and mobile mode audit passed.");
