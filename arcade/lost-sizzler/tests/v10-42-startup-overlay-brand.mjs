import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const indexSource = readFileSync(
  new URL("../index.html", import.meta.url),
  "utf8",
);
const cacheGuardSource = readFileSync(
  new URL("../js/v10-41-cache-guard.js", import.meta.url),
  "utf8",
);
const legacyBootstrapSource = readFileSync(
  new URL("../js/v10-36-bootstrap.js", import.meta.url),
  "utf8",
);
const versionCheckSource = readFileSync(
  new URL("../js/version-check.js", import.meta.url),
  "utf8",
);

test("current menu owns first static paint before the dynamic legacy loader exists", () => {
  assert.match(indexSource, /<h1>C64 Dungeon Carnage<\/h1>/);
  assert.match(indexSource, /<span class="pixel-title-quest">CHEEKY COMMODORE GAMER<\/span>/);
  assert.match(indexSource, /<h2><span>C64 DUNGEON<\/span><strong>CARNAGE<\/strong><\/h2>/);
  assert.doesNotMatch(indexSource, /CHEEKY COMMODORE QUEST/);
  assert.doesNotMatch(indexSource, /THE LOST SIZZLER/);

  const cacheGuardScript = indexSource.indexOf('src="js/v10-41-cache-guard.js');
  const versionCheckScript = indexSource.indexOf('src="js/version-check.js');
  assert.ok(cacheGuardScript >= 0, "the cache/startup guard must be a static page script");
  assert.ok(versionCheckScript >= 0, "version-check must remain present");
  assert.ok(
    cacheGuardScript < versionCheckScript,
    "the startup branding guard must execute before version-check can inject V10.36",
  );

  assert.match(versionCheckSource, /function loadV136Bootstrap\(\)/);
  assert.match(versionCheckSource, /script\.src=`js\/v10-36-bootstrap\.js/);
  assert.match(versionCheckSource, /loadV136Bootstrap\(\);/);
});

test("V10.42 guards the legacy startup overlay before it can paint retired branding", () => {
  assert.match(legacyBootstrapSource, /overlay\.id="ccg-release-loading"/);
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
  assert.match(cacheGuardSource, /startupBrandGuarded:false/);
  assert.match(cacheGuardSource, /state\.startupBrandGuarded=true/);
});

test("startup branding protection is viewport-independent for desktop and mobile", () => {
  const guardStart = cacheGuardSource.indexOf("function startV142StartupBrandGuard()");
  const guardEnd = cacheGuardSource.indexOf("startV142StartupBrandGuard();", guardStart);
  assert.ok(guardStart >= 0 && guardEnd > guardStart);
  const guardBody = cacheGuardSource.slice(guardStart, guardEnd);
  assert.doesNotMatch(guardBody, /matchMedia|innerWidth|innerHeight|screen\.|orientation|mobile/i);
  assert.match(guardBody, /document\.documentElement/);
  assert.match(guardBody, /subtree:true,childList:true/);
});
