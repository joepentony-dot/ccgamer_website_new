# SEO and generated output

## Scope

Automated SEO/video metadata and generated pages, game/archive output, sitemaps, video library output, and generation validation. Generated artifacts must be changed through their intended generator/workflow unless a documented exception applies.

## Verified checkpoint — 2026-09-16

This workstream has two current generated-output scopes that must not be conflated:

- **Game/archive publication output:** merged #2109, **Publish generated game archive output**, from Reliable Games Publishing run `35076710872` remains the authoritative game/archive publication result.
- **SEO/video-page generated output:** merged #2111, commit `f748968c7ccdf139b29ab1eaa92868712fbf2095`, **Auto-update generated SEO and video pages**, is the newest merged SEO/video-page automation result observed during the post-#2104 reconciliation.

Continuation/governance merge #2104 later advanced `main` to `8a2e72f4425973e3ce6756ae6c8365378dc63b34` without changing generated-output ownership. Always re-check live `main` before acting because later automation may advance these checkpoints.

### Retired stale generated-output PRs

| PR | Classification | Current state |
| --- | --- | --- |
| #2107 | **SUPERSEDED GAME/ARCHIVE GENERATED OUTPUT** by newer merged #2109 | Closed without merge |
| #1759 | **STALE SEO GENERATED OUTPUT** from August | Closed without merge |
| #1752 | **STALE SEO GENERATED OUTPUT** from August | Closed without merge |

The older #2101 SEO/video generation result was valid when produced but is no longer the latest SEO/video-page checkpoint. Current generated-output decisions must start from the relevant current source-of-truth and current workflows, not any retired automation branch.

## Guardrails and next action

Before modifying generated output, identify its producing workflow/script and run the relevant validation. Preserve canonical generated files as a set; do not reopen or cherry-pick individual artifacts from retired automation PRs merely because their commits remain in Git history.

There is no current generated-output integration candidate requiring manual action. Future generated changes should be produced by the current authoritative automation from current source data.

## Session log

- 2026-09-16: Initial checkpoint classified #1752/#1759 as stale relative to then-current #2101 output.
- 2026-09-16: Live re-audit found newer merged #2109 and classified #2107 as superseded; #2107/#1759/#1752 were closed without merge.
- 2026-09-16: Post-#2104 reconciliation identified merged #2111 as the newer SEO/video-page automation result while preserving #2109 as the separate authoritative game/archive publication result.
