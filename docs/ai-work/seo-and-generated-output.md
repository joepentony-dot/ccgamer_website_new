# SEO and generated output

## Scope

Automated SEO/video metadata and generated pages, sitemaps, video library output, and generation validation. Generated artifacts must be changed through their intended generator/workflow unless a documented exception applies.

## Verified checkpoint — 2026-09-16

Current `origin/main` at `e40f5c4` was updated by #2101, **Auto-update generated SEO and video pages**. Two older non-draft automation PRs remain open:

| PR | Branch | Files | Note |
| --- | --- | --- | --- |
| #1759 | `automation/seo-33010350576-1` | `data/video-metadata.json`, `videos/index.html`, `videos/video-index.json` | Created 2026-08-26; inspect against current main before any action. |
| #1752 | `automation/seo-32965862836-1` | `data/video-metadata.json` | Created 2026-08-26; inspect against current main before any action. |

Because #2101 is newer mainline automation output, neither older PR should be merged blindly. Determine whether it is obsolete, contains a still-missing delta, or needs regeneration.

## Guardrails and next action

Before modifying generated output, identify its producing workflow/script and run the relevant validation. Preserve canonical generated files as a set; do not cherry-pick one generated artifact from an old automation PR without checking the current generator result.

Next safe action: compare #1752 and #1759 to `origin/main`; close or regenerate them only after confirming their deltas are obsolete or reproducible.

## Session log

- 2026-09-16: Initial checkpoint created from current main and the live open automation PR list. No generated output changed.
