import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const cacheGuardSource = readFileSync(
  new URL("../js/v10-41-cache-guard.js", import.meta.url),
  "utf8",
);
const legacyBootstrapSource = readFileSync(
  new URL("../js/v10-36-bootstrap.js", import.meta.url),
  "utf8",
);

test("V10.42 guards the legacy startup overlay before it can paint retired branding", () => {
  assert.match(legacyBootstrapSource, /id="ccg-release-loading"/);
  assert.match(legacyBootstrapSource, /CHEEKY COMMODORE QUEST/);
  assert.match(legacyBootstrapSource, /THE LOST SIZZLER/);

  assert.match(cacheGuardSource, /function startV142StartupBrandGuard\(\)/);
  assert.match(cacheGuardSource, /startV142StartupBrandGuard\(\);/);
  assert.match(cacheGuardSource, /document\.getElementById\("ccg-release-loading"\)/);
  assert.match(cacheGuardSource, /new MutationObserver\(\(\)=>\{/);
  assert.match(
    cacheGuardSource,
    /v142StartupBrandObserver\.observe\(document\.documentElement,\{subtree:true,childList:true\}\)/,
  );

  const brandGuardStart = cacheGuardSource.indexOf("startV142StartupBrandGuard();");
  const v136QueueGuard = cacheGuardSource.indexOf("v10-41-startup-freeze-guard.js");
  assert.ok(brandGuardStart >= 0, "startup branding guard should be installed");
  assert.ok(
    brandGuardStart < v136QueueGuard,
    "branding guard must be active before the V10.36 startup queue can create its overlay",
  );
});

test("the startup overlay is normalised to the C64 Dungeon Carnage identity", () => {
  assert.match(cacheGuardSource, /CHEEKY COMMODORE GAMER/);
  assert.match(cacheGuardSource, /C64 DUNGEON CARNAGE · PREPARING RUNTIME/);
  assert.match(cacheGuardSource, /C64 Dungeon Carnage/);
  assert.match(
    cacheGuardSource,
    /currentStartupBrandText\(status\.textContent\)/,
    "legacy status text should be rewritten as well as the static title",
  );
  assert.match(
    cacheGuardSource,
    /v142StartupOverlayObserver\.observe\(overlay,\{subtree:true,childList:true,characterData:true\}\)/,
    "later legacy text mutations should remain guarded for the life of the loader",
  );
  assert.match(
    cacheGuardSource,
    /startupBrandGuarded:true|startupBrandGuarded=false/,
  );
});
