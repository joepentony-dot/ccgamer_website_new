# Dungeon Carnage regression test policy

The current Dungeon Carnage suite protects behaviour, not historical release numbers.

## Default rule

When a defect is fixed, extend the existing durable feature contract that already owns that behaviour. Do not create a new release-numbered `.mjs` file merely because a new PR or build fixed the defect.

Preferred durable browser contracts include current behaviour areas such as:

- trusted music launch and production soundtrack ownership;
- live combat/input ownership and the long-duration soak contracts;
- trap/contact integrity and mobile portrait behaviour;
- viewport, HUD and inventory geometry;
- campaign/progression persistence;
- current-main live-defect coverage.

## When a new test file is justified

Add a separate test only when the behaviour has a genuinely different runtime boundary, requires a materially different browser fixture, or must remain isolated for CI duration/sharding. Long-running soak tests are intentionally separate so they can run on different Chromium shards.

## Consolidation

When a newer contract fully supersedes an older release-numbered or diagnostic-only test, fold any unique assertions into the durable contract, update workflow references, then delete the superseded file. Diagnostic scripts that only print state should not remain in the mandatory regression matrix once an asserting contract covers the same behaviour.
