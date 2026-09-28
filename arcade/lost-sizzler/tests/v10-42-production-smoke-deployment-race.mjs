import assert from "node:assert/strict";
import fs from "node:fs";

const smoke=fs.readFileSync(new URL("./production/v10-41-r47-production-smoke.mjs",import.meta.url),"utf8");

assert.match(smoke,/if\(maintenanceExpected\)\{/,"production smoke must retain the maintenance-gate branch");
assert.match(smoke,/for\(let attempt=1;attempt<=18;attempt\+\+\)/,"maintenance smoke must retry deployment identity for the full deployment visibility window");
assert.match(smoke,/if\(attempt<18\)await sleep\(10000\)/,"maintenance smoke retries must use the established ten-second deployment cadence");
assert.match(smoke,/String\(versionPayload\?\.releaseVersion\|\|""\)===expectedReleaseVersion/,"maintenance smoke must still require the expected release family");
assert.match(smoke,/String\(versionPayload\?\.build\|\|""\)===expectedBuild/,"maintenance smoke must still require the exact expected build");
assert.match(smoke,/String\(versionPayload\?\.cacheToken\|\|""\)===expectedCacheToken/,"maintenance smoke must still require the exact expected cache token");
assert.match(smoke,/assert\.ok\(deployedVersion,/,"maintenance smoke must fail closed when production never reaches the expected identity");

console.log("PASS production smoke deployment-race contract");
