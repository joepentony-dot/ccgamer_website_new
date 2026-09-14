#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const repoRoot = process.env.CCG_REPO_ROOT
  ? path.resolve(process.env.CCG_REPO_ROOT)
  : path.resolve(__dirname, "..");

const SITE_ORIGIN = "https://www.cheekycommodoregamer.co.uk";
const pagePath = path.join(repoRoot, "retro-specials", "light-fantastic-toolbox", "index.html");
const canonicalUrl = `${SITE_ORIGIN}/retro-specials/light-fantastic-toolbox/`;
const manuals = [
  {
    name: "The Image System User's Guide",
    path: "/resources/manuals/The_Image_System.pdf"
  },
  {
    name: "The Music System User Manual",
    path: "/resources/manuals/The_Music_System_User.pdf"
  }
];

function fail(message) {
  console.error(`[retro-manual-schema] ${message}`);
  process.exit(1);
}

if (!fs.existsSync(pagePath)) {
  fail(`Generated page is missing: ${path.relative(repoRoot, pagePath)}`);
}

let html = fs.readFileSync(pagePath, "utf8");
for (const manual of manuals) {
  if (!html.includes(`href="${manual.path}"`)) {
    fail(`Visible manual link is missing from generated page: ${manual.path}`);
  }
}

const payload = {
  "@context": "https://schema.org",
  "@graph": manuals.map((manual) => ({
    "@type": "DigitalDocument",
    "@id": `${SITE_ORIGIN}${manual.path}#document`,
    name: manual.name,
    encodingFormat: "application/pdf",
    url: `${SITE_ORIGIN}${manual.path}`,
    isPartOf: {
      "@id": `${canonicalUrl}#video`
    }
  }))
};

const schemaBlock = `<script type="application/ld+json" data-ccg-schema="toolbox-manuals">\n${JSON.stringify(payload, null, 2)
  .replace(/</g, "\\u003c")
  .replace(/\u2028/g, "\\u2028")
  .replace(/\u2029/g, "\\u2029")}\n</script>`;

const existingBlock = /\n?\s*<script\b[^>]*type=(["'])application\/ld\+json\1[^>]*data-ccg-schema=(["'])toolbox-manuals\2[^>]*>[\s\S]*?<\/script>\s*/i;
html = html.replace(existingBlock, "\n");

if (!html.includes("</head>")) {
  fail("Generated page is missing </head>; refusing to inject manual structured data.");
}

html = html.replace("</head>", `  ${schemaBlock}\n</head>`);
fs.writeFileSync(pagePath, html, "utf8");
console.log("[retro-manual-schema] Preserved 2 Light Fantastic Toolbox DigitalDocument records.");
