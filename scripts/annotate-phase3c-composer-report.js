#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const reportPath = path.resolve(__dirname, "..", "docs", "seo-baseline", "phase-3c-composer-archives.md");
const marker = "The source records in `games/games.json` remain unchanged.\n";
const section = `
## Phase 3A audit reconciliation

Phase 3A reported 19 credited composers with an existing page because its read-only comparison derived \`chris-hulsbeck\` from the credit name **Chris Hülsbeck**, while the established curated route is \`/music/chris-huelsbeck/\`. Phase 3C applies the existing reviewed alias mapping and preserves that curated route, so the reconciled count is **20**. No duplicate \`/music/chris-hulsbeck/\` route is generated.
`;

function main() {
    const current = fs.readFileSync(reportPath, "utf8");
    if (current.includes("## Phase 3A audit reconciliation")) {
        console.log("[phase3c-report] Audit reconciliation is already documented.");
        return;
    }
    if (!current.includes(marker)) {
        throw new Error("Phase 3C report marker was not found.");
    }
    const next = current.replace(marker, `${marker}${section}`);
    fs.writeFileSync(reportPath, next, "utf8");
    console.log("[phase3c-report] Documented the Chris Hülsbeck route reconciliation.");
}

main();
