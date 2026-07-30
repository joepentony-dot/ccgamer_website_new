#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const registryPath = path.join(ROOT, "js/easter-eggs/easter-egg-registry.js");
const registrySource = fs.readFileSync(registryPath, "utf8");
const registryUrl = `data:text/javascript;base64,${Buffer.from(registrySource, "utf8").toString("base64")}`;
const {
    EASTER_EGG_REGISTRY,
    EASTER_EGG_BY_CODE,
    getEasterEggMetadata,
    listEasterEggs,
} = await import(registryUrl);

const globalSource = fs.readFileSync(path.join(ROOT, "js/ccg-global.js"), "utf8");

const expectedCodes = [
    "sys64738", "pressplay", "load", "basic", "vhs", "terminator", "bsod",
    "mario", "nokia", "sonic", "warp", "party", "zxspectrum", "pacman",
    "boing", "matrix", "invaders", "heman", "lemmings", "cheeky", "konamicode",
];

assert.equal(EASTER_EGG_REGISTRY.length, expectedCodes.length, "Registry command count changed");
assert.deepEqual(EASTER_EGG_REGISTRY.map(entry => entry.code), expectedCodes, "Registry order or codes changed");
assert.equal(EASTER_EGG_BY_CODE.size, expectedCodes.length, "Registry contains duplicate command codes");

for (const entry of EASTER_EGG_REGISTRY) {
    assert.match(entry.code, /^[a-z0-9]+$/, `Invalid normalized code: ${entry.code}`);
    assert.ok(entry.label && typeof entry.label === "string", `Missing label for ${entry.code}`);
    assert.ok(entry.category && typeof entry.category === "string", `Missing category for ${entry.code}`);
    assert.equal(typeof entry.desktop, "boolean", `Missing desktop support flag for ${entry.code}`);
    assert.equal(typeof entry.mobile, "boolean", `Missing mobile support flag for ${entry.code}`);
    assert.ok(entry.reducedMotion, `Missing reduced-motion note for ${entry.code}`);
    assert.ok(entry.runtime, `Missing runtime note for ${entry.code}`);
    assert.ok(globalSource.includes(`"${entry.code}"`), `ccg-global.js does not register ${entry.code}`);

    if (!entry.hidden) {
        assert.ok(
            globalSource.includes(`data-ccg-secret-code="${entry.code}"`),
            `Secret menu does not expose ${entry.code}`,
        );
    }
}

assert.equal(getEasterEggMetadata(" BASIC ")?.code, "basic");
assert.equal(getEasterEggMetadata("unknown"), null);
assert.ok(listEasterEggs().every(entry => !entry.hidden), "Hidden commands leaked into default list");
assert.ok(listEasterEggs({ platform: "mobile" }).every(entry => entry.mobile), "Mobile filter failed");
assert.ok(listEasterEggs({ platform: "desktop" }).every(entry => entry.desktop), "Desktop filter failed");

const lifecycleMarkers = [
    "function bindOverlayToVisualViewport",
    "function stopActiveEasterEgg",
    "function openEasterEggOverlay",
    "lastFocusedElement",
    "viewportCleanup",
    "document.body.classList.remove(\"ccg-egg-open\")",
];
for (const marker of lifecycleMarkers) {
    assert.ok(globalSource.includes(marker), `Lifecycle regression: ${marker} is missing`);
}

assert.ok(globalSource.includes("CCG EASTER EGG E1 DATASETTE LOADER"), "E1 Datasette integration marker missing");
assert.ok(globalSource.includes("CCG EASTER EGG E2 BASIC CONSOLE"), "E2 BASIC integration marker missing");

console.log(`E3 registry regression passed for ${EASTER_EGG_REGISTRY.length} Easter eggs.`);
