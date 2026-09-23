# CCG continuation protocol

Before changing code, configuration, generated output, or documentation:

1. Read `docs/AI-CONTINUATION-STATE.md`.
2. Read the relevant file in `docs/ai-work/` in full. If the task spans areas, read every affected workstream file.
3. Refresh the GitHub and branch facts when the checkpoint is no longer current; do not treat a checkpoint as permission to merge, deploy, or supersede another branch.

Use the workstream file as the detailed system of record: preserve its stated branch and PR dependencies, update it when an assumption is disproved, and record the commands/checks actually run. Before ending substantial work, update the relevant workstream checkpoint and the repository-level state when its summary, audit timestamp, or PR inventory changed. Keep checkpoints factual, dated, and concise.

Do not merge a PR solely because a checkpoint mentions it. Merge only after the workstream's stated qualification criteria are met and the user authorizes it.
## Repository triage and workflow discipline

For ongoing CCG repository work, classify open PRs/branches before creating or reviving work:

- **active/current** — keep qualifying when the head is current with `main`;
- **merge-ready** — exact head is current, mergeable and all required checks are green; merge still requires explicit user authorisation;
- **stale/rebuild-required** — materially behind `main`; rebuild or reconcile the verified work on current `main` rather than repeatedly qualifying the stale head;
- **superseded/noise** — do not keep spending CI or implementation effort on it.

Do not merge merely to reduce workflow volume. Do not create a new PR for every small related follow-up: group changes into the current bounded workstream when they share scope. For an apparently transient or unrelated CI failure, retry the failed job once when the exact head is otherwise unchanged; investigate repeated failures as real blockers. Prefer opening a development branch without a PR while a prerequisite PR is still awaiting merge, so another full PR matrix is not triggered unnecessarily. Refresh branch-behind-main and exact-head workflow state before reporting merge readiness.

