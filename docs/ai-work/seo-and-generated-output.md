# SEO and generated output

## Scope

Automated SEO/video metadata and generated pages, sitemaps, video library output, and generation validation. Generated artifacts must be changed through their intended generator/workflow unless a documented exception applies.

## Verified checkpoint — 2026-09-16

Current `origin/main` at `e40f5c4` was updated by #2101, **Auto-update generated SEO and video pages**. Two much older non-draft automation PRs remain open:

| PR | Branch | Audited relationship to current `main` | Status |
| --- | --- | --- | --- |
| #1759 | `automation/seo-33010350576-1` | 1 commit ahead and 1685 commits behind; changes `data/video-metadata.json`, `videos/index.html`, and `videos/video-index.json` | Stale generated output; not a current integration candidate. |
| #1752 | `automation/seo-32965862836-1` | 1 commit ahead and 1738 commits behind; changes `data/video-metadata.json` | Stale generated output; not a current integration candidate. |

These August automation branches predate substantial repository and generator activity, while #2101 is the current mainline automation result from 16 September 2026. Their generated deltas should not be applied directly to the current generated set. Any still-needed source change should be reproduced through the current source-of-truth and generator workflow.

## Guardrails and next action

Before modifying generated output, identify its producing workflow/script and run the relevant validation. Preserve canonical generated files as a set; do not cherry-pick an individual generated artifact from an old automation branch merely because its PR remains open.

Next safe action: keep #1752 and #1759 out of the current integration path. Future repository housekeeping can resolve their PR state separately after confirming current automation remains authoritative.

## Session log

- 2026-09-16: Compared both old automation heads with current `main`. #1752 is 1738 commits behind and #1759 is 1685 commits behind; current main contains newer #2101 generated output. No generated files changed.
- 2026-09-16: Initial checkpoint created from current main and the live open automation PR list. No generated output changed.
