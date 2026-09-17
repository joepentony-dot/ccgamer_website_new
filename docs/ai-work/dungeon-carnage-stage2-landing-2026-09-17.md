# Dungeon Carnage Stage 2 landing milestone — 17 September 2026

## Purpose

This checkpoint changes the development programme from open-ended residue cleanup to milestone-first product development.

The main objective is to advance C64 Dungeon Carnage toward the requested finished game: a stronger presentation, the four Water / Fire / Earth / Air portal structure, larger and more distinctive procedural spaces, deeper zone-specific content, finished NPC/merchant integration, and an itch.io release path.

Small cleanup work is no longer a stage-ending objective by itself.

## Reconciled starting point

- Live `main` after Stage 1 PR #2135: `811f67845dbcaa0b4b5c2b83f8860e10a184c1a0`.
- PR #2135 exact qualified head: `f474c39428643dda2a2341cb1b7d61a01e970308`.
- PR #2135 merge commit: `811f67845dbcaa0b4b5c2b83f8860e10a184c1a0`.
- #2135 removed only six genuinely unused retired network compatibility owners and retained `sendPlayer()`, `broadcastWorld()`, `onMembers()` and `onPacket()` where supported local runtime still has current obligations.
- Exact-head qualification for #2135 passed Public Code Cache Version, Native Mouse Wheel Scroll Contract, canonical/Node contracts, Chromium discovery and all six Chromium shards. SEO correctly did not trigger because the complete js/tests-only diff is path-ignored by that workflow.

## Stage 1 convergence decision

Stage 1 is **sufficiently converged and closed for now**.

Remaining historical selectors, inert compatibility hooks or old names are backlog unless one of the following is true:

1. they are visibly affecting a supported user-facing milestone;
2. they are proven to execute in supported Solo, Tutorial, local Split Screen, Weekly/account or current save/progression flows;
3. they create a demonstrated regression or block qualification of the milestone currently being delivered.

Do not open independent cleanup PRs solely because an old selector, historical filename, inert branch or compatibility wrapper still exists.

If later product work reaches such code, reconcile it in the same bounded feature milestone where practical. Otherwise leave it alone.

## Stage 2 milestone

Branch: `codex/dungeon-stage2-landing-milestone`

Objective: deliver one coherent, user-visible startup/main-menu improvement while preserving the #2127 first-paint flicker correction.

The Stage 2 landing hierarchy is:

- Resume Saved Run receives first priority when a compatible save is present;
- Play Solo and local 2P Split Screen form the main adventure row;
- Tutorial and Weekly High-Score Vault form the secondary row;
- retired networked Dungeon Multiplayer, Horde and Saboteur choices remain absent;
- historical runtime-injected tier headings are visually suppressed so an empty `SPECIAL MODES` tier cannot reappear;
- narrow mobile layouts collapse to one column;
- the final hierarchy is owned by the existing blocking `v10-41-r29.css`, using higher specificity than the later V10.41 compatibility style injection, so the settled menu cannot overwrite the first-paint geometry.

The large historical landing script is deliberately not rewritten for this presentation milestone. It remains a compatibility layer while the supported blocking stylesheet owns the visible menu.

## Regression boundary

This milestone must not alter:

- Solo movement, firing or combat;
- Tutorial runtime ownership;
- local Split Screen gameplay ownership;
- save format or Continue semantics;
- Weekly Vault/account service behaviour;
- Banishment Flask exchange logic;
- R56/R59/R60 supported runtime ownership;
- the #2129 release/cache identity;
- the #2127 startup first-paint sequencing.

Both hands-on product gates remain exactly:

**MANUAL ACCEPTANCE DEFERRED — USER CURRENTLY UNAVAILABLE TO TEST**

Those gates do not block this independent presentation milestone.

## Qualification

Before merge, require the exact PR head to pass every workflow triggered by its paths, including Lost Sizzler Load Safety canonical/Node coverage and all six Chromium shards. Do not weaken timeouts, assertions or supported behaviour to obtain green.

Focused Stage 2 contracts must prove both the static blocking hierarchy and the settled browser layout.

## Forward product direction

After this Stage 2 milestone merges, do **not** resume a general residue audit.

Banishment terminology remains a presentation concern, but it is no longer a mandatory standalone cleanup stage. Safe wording corrections may be made when the affected UI/content is next changed, while save-compatible/internal identifiers remain stable.

The next main product milestone is the **Water / Fire / Earth / Air portal architecture**. That work should first define the portal/unlock/depth/return/save model against the existing five-depth campaign, then implement a coherent first vertical slice rather than splitting the architecture into many tiny PRs.

The aim is measurable game progress: each development cycle should either complete a player-visible milestone or remove a proven blocker to that milestone.
