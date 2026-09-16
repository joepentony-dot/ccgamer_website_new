# SEO and generated output

## Scope

Automated SEO/video metadata and generated pages, game/archive output, sitemaps, video library output, and generation validation. Generated artifacts must be changed through their intended generator/workflow unless a documented exception applies.

## Verified checkpoint — 2026-09-16

Current `origin/main` is `fa25ee38bd97426a392b7415ae3534793eb4fcd9`, advanced by merged #2109, **Publish generated game archive output**. #2109 came from Reliable Games Publishing run `35076710872`; its authoritative rebuild and generation/validation chain passed before the automation PR was created.

### Stale generated-output PRs

| PR | Classification | Reconciliation |
| --- | --- | --- |
| #2107 | **SUPERSEDED GENERATED OUTPUT** | Older Reliable Games Publishing candidate from run `35075944745`. Its head is no longer the current generated set; #2109 is newer and merged. Do not merge #2107 over current `main`. |
| #1759 | **STALE GENERATED OUTPUT** | August SEO automation branch predating extensive repository/generator changes. Do not cherry-pick its generated files. |
| #1752 | **STALE GENERATED OUTPUT** | August SEO automation branch predating extensive repository/generator changes. Do not cherry-pick its generated files. |

The older #2101 SEO/video generation result was valid when produced but is no longer the latest repository checkpoint. Current generated-output decisions must start from #2109/current `main`.

## Guardrails and next action

Before modifying generated output, identify its producing workflow/script and run the relevant validation. Preserve canonical generated files as a set; do not cherry-pick an individual generated artifact from an old automation branch merely because its PR remains open.

Next safe action: keep #2107, #1759 and #1752 out of the current integration path. Future housekeeping may close the stale PRs after confirming no source-of-truth change exists only on those branches; do not merge their generated deltas into current `main`.

## Session log

- 2026-09-16: Initial checkpoint classified #1752/#1759 as stale relative to then-current #2101 output.
- 2026-09-16: Live re-audit found newer merged #2109 at `fa25ee38...`; reclassified still-open #2107 as superseded generated output and made #2109/current `main` authoritative.
