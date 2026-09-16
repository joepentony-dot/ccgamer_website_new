# Content publishing and game music

## Scope

Content Publisher administration, asset optimisation, music upload, R2/Worker routing, publishing guardrails, and the supporting docs/tests. Key paths include `admin/`, `workers/game-music-upload/`, `tests/`, and `docs/content-publisher-r2-music-setup.md`.

## Verified checkpoint — 2026-09-16

Three open PRs are relevant to the current publishing boundary, but only two are current candidates:

| PR | Branch | Current relationship to `main` | Focus / classification |
| --- | --- | --- | --- |
| #2103 | `codex/game-music-workers-dev-route` | based on current `e40f5c4`; 3 commits ahead, 0 behind | **CURRENT / QUALIFIED** Worker-route candidate. Switches the music-upload Worker from the unavailable custom-zone route to `workers.dev`, updates setup docs, and tightens the audio-admin contract. Exact-head Content Publisher Validation, Site Safety, Native Mouse Wheel, Public Code Cache and SEO workflows are all green. The final `workers.dev` hostname must come from an actual deployment; do not guess it. |
| #2105 | `codex/fix-content-publisher-box3d-optimizer-current-main` | based exactly on current `e40f5c4`; 2 commits ahead, 0 behind; 2 files, +29/-1 | **CURRENT / FULLY QUALIFIED DRAFT REFRESH** of #2073. Reuses the exact reviewed fix: 3D-box optimisation calls shared `decodeImage()`, releases the decoded source in `finally`, and adds the existing regression contract. Exact-head Content Publisher Validation, Site Safety, Native Mouse Wheel, Public Code Cache, Image Performance Budget and SEO workflows are all green at head `2325d2ce1de24017bd8ae6cc5c44e771d218267e`. Keep unmerged without explicit authorization. |
| #2073 | `codex/fix-content-publisher-box3d-optimizer` | 51 commits behind current main, 2 ahead | **SUPERSEDED DUPLICATE.** #2105 now carries the same reviewed two-file fix on current `main` ancestry and is fully qualified. Do not merge or rebase #2073; close it as superseded at a safe housekeeping boundary. |

Current `main` still contains the concrete 3D-box defect until #2105 is deliberately merged: `optimiseBox3dSelectedImage()` calls undefined/removed `loadImage()` even though the shared helper is `decodeImage()`. #2105 fixes only that boundary and its contract; no unrelated publisher code is reworked.

The exact #2105 patch was re-reviewed after qualification and matches #2073 semantically: replace the removed `loadImage()` path with `decodeImage()`, retain the decoded source for cleanup, and call `closeDecodedImage(source)` from `finally`; the accompanying test forbids `loadImage()` and requires decoder/cleanup ownership.

Recent remote candidate branches without an open PR include `codex/game-music-worker-route-current-main`, `codex/fix-game-music-worker-route`, `codex/fix-r2-music-upload-405`, `codex/content-publisher-completion-guard`, `codex/fix-content-publisher-integrity`, `codex/fix-publisher-recovery-handoff`, and Legacy of the Ancients repair branches. They are evidence/source material, not an approved queue. In particular, `codex/game-music-worker-route-current-main` is already behind current main with no unique commits, while `codex/fix-game-music-worker-route` is divergent; do not resurrect either over #2103 without a fresh reason.

## Guardrails and next action

For #2103, do not guess the final `workers.dev` hostname or change the Content Publisher endpoint before the deployed Worker reports it. Keep Worker routing separate from #2105's local image-decoder fix.

For the 3D-box optimiser, use #2105 and do not revive #2073. #2105 is now fully green at its exact head but remains draft/unmerged until explicitly authorized. #2073 should be closed as superseded rather than merged as well.

Next safe publishing action: preserve #2103 and #2105 at their qualified heads. Resolve the #2103 deployment/hostname boundary separately; for #2105, the next code-affecting action is an explicit merge decision. Do not mix either change with older un-PR'd integrity/completion candidates without comparing their current-main delta first.

## Session log

- 2026-09-16: Re-audited live GitHub after the broader #2105 workflows completed. #2105 exact head `2325d2ce1de24017bd8ae6cc5c44e771d218267e` is fully green across Content Publisher Validation, Site Safety, Native Mouse Wheel, Public Code Cache, Image Performance Budget and SEO. Re-reviewed its exact two-file patch against #2073 and classified #2073 as a superseded duplicate. No publishing runtime code changed.
- 2026-09-16: Audited current main and confirmed the #2073 decoder defect still exists. Created current-main draft #2105 from `e40f5c4`, transplanting only #2073's exact two-file fix. Initial Content Publisher Validation and Native Mouse Wheel checks passed; no merge performed.
- 2026-09-16: Reconciled same-topic remote branches. `codex/game-music-worker-route-current-main` has no unique commits over main; older fix/integrity/completion branches are divergent and require explicit comparison before reuse.
- 2026-09-16: Initial continuation checkpoint created from the fetched remote branches and live open-PR inventory. No publishing code changed.
