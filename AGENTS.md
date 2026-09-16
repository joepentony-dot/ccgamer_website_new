# CCG continuation protocol

Before changing code, configuration, generated output, or documentation:

1. Read `docs/AI-CONTINUATION-STATE.md`.
2. Read the relevant file in `docs/ai-work/` in full. If the task spans areas, read every affected workstream file.
3. Refresh the GitHub and branch facts when the checkpoint is no longer current; do not treat a checkpoint as permission to merge, deploy, or supersede another branch.

Use the workstream file as the detailed system of record: preserve its stated branch and PR dependencies, update it when an assumption is disproved, and record the commands/checks actually run. Before ending substantial work, update the relevant workstream checkpoint and the repository-level state when its summary, audit timestamp, or PR inventory changed. Keep checkpoints factual, dated, and concise.

Do not merge a PR solely because a checkpoint mentions it. Merge only after the workstream's stated qualification criteria are met and the user authorizes it.
