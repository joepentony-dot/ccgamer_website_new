# SEO and generated output

## Scope

Automated SEO/video metadata and generated pages, game/archive output, sitemaps, video library output, and generation validation. Generated artifacts must be changed through their intended generator/workflow unless a documented exception applies.

## Verified checkpoint — 2026-09-16

Current `origin/main` is `5112035f0d1f3c80fdb4fa2c6c83ff0228778600`. The latest generated game/archive publication remains merged #2109, **Publish generated game archive output**, from Reliable Games Publishing run `35076710872`. The later #2102 merge changes Dungeon runtime, not generated game/archive ownership, so #2109 remains authoritative for this workstream.

### Retired stale generated-output PRs

| PR | Classification | Current state |
| --- | --- | --- |
| #2107 | **SUPERSEDED GENERATED OUTPUT** by newer merged #2109 | Closed without merge |
| #1759 | **STALE GENERATED OUTPUT** from August | Closed without merge |
| #1752 | **STALE GENERATED OUTPUT** from August | Closed without merge |

The older #2101 SEO/video generation result was valid when produced but is no longer the latest repository checkpoint. Current generated-output decisions must start from the current source-of-truth and current workflows, not any retired automation branch.

## Guardrails and next action

Before modifying generated output, identify its producing workflow/script and run the relevant validation. Preserve canonical generated files as a set; do not reopen or cherry-pick individual artifacts from retired automation PRs merely because their commits remain in Git history.

There is no current generated-output integration candidate requiring action. Future generated changes should be produced by the current authoritative automation from current source data.

## Session log

- 2026-09-16: Initial checkpoint classified #1752/#1759 as stale relative to then-current #2101 output.
- 2026-09-16: Live re-audit found newer merged #2109 and classified #2107 as superseded.
- 2026-09-16: Closed #2107, #1759 and #1752 without merge. #2109 remains the authoritative generated game/archive result.
