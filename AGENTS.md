# CCG continuation protocol

Before changing code, configuration, generated output, or documentation:

1. Read `docs/AI-CONTINUATION-STATE.md`.
2. Read the relevant file in `docs/ai-work/` in full. If the task spans areas, read every affected workstream file.
3. Read `docs/LIGHTHOUSE-PERFORMANCE-PROTOCOL.md` before changing any public website HTML, CSS, JavaScript, image/media delivery, generated output, admin publishing path or deployment behaviour.
4. Refresh the GitHub and branch facts when the checkpoint is no longer current; do not treat a checkpoint as permission to merge, deploy, or supersede another branch.

Use the workstream file as the detailed system of record: preserve its stated branch and PR dependencies, update it when an assumption is disproved, and record the commands/checks actually run. Before ending substantial work, update the relevant workstream checkpoint and the repository-level state when its summary, audit timestamp, or PR inventory changed. Keep checkpoints factual, dated, and concise.

Do not merge a PR solely because a checkpoint mentions it. Merge only after the workstream's stated qualification criteria are met and the user authorizes it.

## Permanent public-site performance rule

All new website development must preserve or improve the Lighthouse performance contract in `docs/LIGHTHOUSE-PERFORMANCE-PROTOCOL.md`. Do not knowingly reintroduce avoidable CLS, blocking third-party work, oversized raster assets, eager heavy embeds, duplicate data requests or other previously-remediated Lighthouse regressions. Do not improve Lighthouse scores by simplifying or degrading the established Omega visual design, typography, effects, modes or functionality. New-game publishing and generated output must pass the repository performance validators in addition to their existing publishing/SEO checks.
