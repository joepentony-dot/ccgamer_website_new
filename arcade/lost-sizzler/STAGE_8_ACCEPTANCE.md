# Lost Sizzler Stage 8 Acceptance Record

## Status

**Stage 8 closure candidate — accepted on tested gameplay head `b0ffbe69574d88a698903522ca880149824b735c`, pending canonical CI on this documentation-only acceptance commit.**

Stage 8 expanded the Solo dungeon while preserving the accepted Stage 7 runtime/timing/ownership boundary. No Stage 9 Horde reconstruction may begin until the documentation-only head created by this record completes the full canonical CI gates successfully.

PR #1852 remains draft and unmerged. PR #1860 is outside this programme and remains untouched.

## Exact-head gate evidence

The Stage 8 gameplay head `b0ffbe69574d88a698903522ca880149824b735c` completed all six canonical pull-request workflows successfully:

- Lost Sizzler Load Safety #1129
- Arcade Test Package #1276
- Arcade Quest Validation #1603
- SEO Automation #4079
- CCG Publishing Automation Integrity #249
- CCG Site Safety #3070

Lost Sizzler Load Safety passed canonical structure checks, JavaScript syntax checks, all canonical Node regression contracts and the full Chromium browser suite.

## Stage 8 delivered/qualified slices

The Stage 8 programme now has focused regression evidence for:

1. **Scout dialogue foundation** — event-driven dialogue around the existing trapped Scout, including progression/persistence and cross-mode isolation.
2. **Merchant character layer** — dialogue around existing merchant/shop state without creating a second economy.
3. **Sanctuary NPC role** — Sanctuary Keeper guidance layered onto the existing safe-room message without replacing sanctuary ownership.
4. **Environmental storytelling** — room/floor presentation attached to existing environmental metadata.
5. **Exploration interactions** — existing galleries, alcoves, dead ends, shortcuts and hidden-space systems receive deeper interaction coverage.
6. **Small tasks and services** — existing merchant/service state is reused rather than shadowed by a parallel objective/economy system.
7. **Floor/environment identity** — existing themes expose distinct environment anchors while preserving Solo controller ownership and route safety.
8. **Encounter-chain foundation** — existing secret-door and reward-chest primitives are qualified as a safe basis for short optional encounter/reward arcs.

## Regression contracts retained

Stage 8-specific browser/Node coverage includes:

- `v10-41-stage8-scout-dialogue.mjs`
- `v10-41-stage8-scout-persistence.mjs`
- `v10-41-stage8-merchant-dialogue.mjs`
- `v10-41-stage8-merchant-field-service.mjs`
- `v10-41-stage8-sanctuary-dialogue.mjs`
- `v10-41-stage8-environmental-storytelling.mjs`
- `v10-41-stage8-exploration-interactions.mjs`
- `v10-41-stage8-floor-identity.mjs`
- `v10-41-stage8-encounter-chain-foundation.mjs`
- `v10-41-stage8-floor-transition-ownership.mjs`

The canonical Stage 7 regression suites also remain active, including Solo timing/ownership soaks, Save & Quit -> Continue, floor transitions, movement/damage ownership, Horde isolation and Spy isolation/composition.

## Protected architecture verification

Stage 8 is accepted only because the expansion composes with existing state transitions instead of reopening the stabilized runtime:

- R59 remains the authoritative Solo RAF/simulation owner.
- Solo timing remains 45 ms maximum substep, 1080 ms accepted visible-gap ceiling and 24 maximum substeps.
- R30 remains the accepted passive/narrow movement/input/fault watchdog.
- R57 retains its narrowed lifecycle/pending-work bridge.
- R60 recurring live-owner maintenance remains Horde-only.
- R32 Spy loading remains event/lifecycle-driven.
- Stage 8 dialogue/content does not add a recurring gameplay polling loop or authoritative RAF owner.
- Stage 8 additions remain inert outside intended Solo dungeon ownership unless an existing shared presentation boundary is explicitly exercised.

## Stage 8 defect disposition

| ID | Disposition | Closure evidence |
| --- | --- | --- |
| STAGE8-NPC-001 | **CLOSED** | Scout dialogue owner re-adoption is lifecycle/event driven and subsequent focused Scout, persistence, merchant, sanctuary, environmental, exploration, floor-identity and encounter-chain contracts all passed in the canonical exact-head browser suite. No recurring NPC poll or frame owner was introduced. |

## Stage boundary

When canonical CI triggered by this documentation-only commit is fully green, **Stage 8 is formally complete** and Stage 9 Horde reconstruction may begin.

Until then:

1. Do not merge PR #1852.
2. Do not touch PR #1860.
3. Do not begin Stage 9 Horde reconstruction.
4. If this acceptance head exposes a real canonical failure, investigate that failure first and reopen only the affected Stage 8 item when evidence justifies it.
