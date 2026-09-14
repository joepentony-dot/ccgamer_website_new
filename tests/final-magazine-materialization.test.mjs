import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const require = createRequire(import.meta.url);
const { steps: rebuildSteps } = require(path.join(root, "scripts", "rebuild-games.js"));
const {
  delegatesToGameTemplate,
} = require(path.join(root, "scripts", "validate-materialized-magazine-reviews.js"));

test("final magazine review materialization runs after canonical page writers and is validated", () => {
  const prepareIndex = rebuildSteps.findIndex(([script]) => script === "prepare-seo-game-routes.js");
  const seoPlanIndex = rebuildSteps.findIndex(
    ([script, ...args]) => script === "apply-seo-opportunity-plan.js" && !args.includes("--check")
  );
  const normalMaterializers = rebuildSteps
    .map(([script, ...args], index) => ({ script, args, index }))
    .filter(({ script, args }) => script === "ensure-magazine-review-runtime.js" && !args.includes("--check"));
  const finalMaterializerIndex = normalMaterializers.at(-1)?.index ?? -1;
  const validatorIndex = rebuildSteps.findIndex(([script]) => script === "validate-materialized-magazine-reviews.js");
  const runtimeCheckIndex = rebuildSteps.findIndex(
    ([script, ...args]) => script === "ensure-magazine-review-runtime.js" && args.includes("--check")
  );

  assert.ok(prepareIndex >= 0, "canonical game route generation step is missing");
  assert.ok(seoPlanIndex >= 0, "SEO opportunity materialization step is missing");
  assert.ok(finalMaterializerIndex > prepareIndex, "magazine reviews must be materialized after canonical game pages are rebuilt");
  assert.ok(finalMaterializerIndex > seoPlanIndex, "final magazine review materialization must run after all page-writing SEO work");
  assert.ok(validatorIndex > finalMaterializerIndex, "final magazine review HTML must be validated after materialization");
  assert.ok(runtimeCheckIndex > validatorIndex, "runtime coverage check must not replace final static review validation");
});

test("final validator recognises only intentional full redirect wrappers as delegated", () => {
  const wrapper = `<!doctype html>
<meta http-equiv="refresh" content="0; url=/games/game.html?id=beach-head-ii">
<script>window.location.replace("/games/game.html?id=beach-head-ii")</script>`;
  assert.equal(delegatesToGameTemplate(wrapper), true);

  assert.equal(
    delegatesToGameTemplate('<meta http-equiv="refresh" content="0; url=/games/game.html?id=beach-head-ii">'),
    false,
    "a meta refresh alone must not bypass static materialization validation"
  );
  assert.equal(
    delegatesToGameTemplate('<script>window.location.replace("/games/game.html?id=beach-head-ii")</script>'),
    false,
    "a JavaScript redirect alone must not bypass static materialization validation"
  );
});
