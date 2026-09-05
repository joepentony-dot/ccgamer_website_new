# Lost Sizzler Stage 9 Acceptance Record

## Status

**Stage 9 closure candidate — accepted on tested Horde head `257385e4e4e6c7fe37f0b063a3e14d45a063612c`, pending canonical CI on this documentation-only acceptance commit.**

Stage 9 qualified and repaired the existing Horde engine while preserving the accepted Solo timing/ownership boundary. No Stage 10 Spy Vs Spy reconstruction may begin until the documentation-only head created by this record completes the full canonical CI gates successfully.

PR #1852 remains draft and unmerged. PR #1860 is outside this programme and remains untouched.

## Exact-head gate evidence

The Stage 9 gameplay head `257385e4e4e6c7fe37f0b063a3e14d45a063612c` completed all six canonical pull-request workflows successfully:

- Lost Sizzler Load Safety #1139
- Arcade Test Package #1286
- Arcade Quest Validation #1613
- SEO Automation #4089
- CCG Publishing Automation Integrity #259
- CCG Site Safety #3080

Lost Sizzler Load Safety passed canonical structure checks, JavaScript syntax checks, all canonical Node regression contracts and the full Chromium browser suite.

## Stage 9 delivered and qualified slices

The Stage 9 programme now has focused regression evidence for:

1. **Horde launch and controller ownership** — real Horde Solo launch reaches the intended special-mode/controller owner without adopting the Solo or Spy controller.
2. **Bounded live-update ancestry** — the R60 timing owner and frame-performance owner compose once, remain stable through re-entry and do not grow wrapper ancestry.
3. **Combat cadence** — projectiles, enemy thinking and player timers use bounded visible wall-time catch-up without retaining pause or hidden-time debt.
4. **Movement and damage isolation** — ordinary Horde movement and damage remain functional while Solo-only R56/R59/R60 services stay dormant.
5. **Lifecycle transitions** — pause/resume, quit-to-menu and repeated real Horde re-entry drain and restart Horde-only timers once without owner accumulation.
6. **Sustained-session soak** — active play, bounded visible stalls and repeated pause/resume preserve owner depth, timer identity, cadence progress and an error-free browser runtime.
7. **Evidence-led repairs** — Horde quit now stops the special-mode lifecycle before returning to menu, and the final frame-performance owner preserves R60 bounded live catch-up when it must wrap a source that does not already retain the timing owner.

## Regression contracts retained

Stage 9-specific browser coverage includes:

- `v10-41-stage9-horde-launch-owner-reentry.mjs`
- `v10-41-stage9-horde-movement-damage-isolation.mjs`
- `v10-41-stage9-horde-lifecycle-transitions.mjs`
- `v10-41-stage9-horde-long-session-soak.mjs`

The canonical Horde regression suites also remain active, including R60 low-frame-rate combat integrity, Horde frame performance, network performance, controller isolation and the accepted Solo and Spy isolation contracts.

## Protected architecture verification

Stage 9 is accepted only because Horde reconstruction composes with the existing controller boundary:

- R59 remains the authoritative shared RAF owner and the authoritative Solo simulation owner.
- Solo timing remains a 45 ms maximum substep, 1080 ms accepted visible-gap ceiling and 24 maximum substeps.
- R60 Horde combat adds no RAF owner and services each accepted controller frame at most once.
- Active Horde catch-up is bounded to the established 210 ms visible-frame ceiling and three live/combat substeps.
- Paused and hidden time is discarded rather than retained as later simulation debt.
- R60 recurring live-owner maintenance remains Horde-only and drains on Horde exit.
- The bounded owner-composition installer remains retired after stable ancestry is observed.
- R56 dungeon recovery, R59 Solo substeps and R60 Solo live-play services remain dormant during Horde.
- No Stage 9 change touches the intro loader, Omega website structure, `games/games.json`, Supabase data or PR #1860.

## Stage 9 defect disposition

| Defect | Disposition | Closure evidence |
| --- | --- | --- |
| Horde quit retained special-mode lifecycle state after returning to menu | **CLOSED** | The real lifecycle browser contract now completes three launch/pause/resume/quit/re-entry cycles with matched status-timer starts/stops, zero retained Horde-only timer handles and stable owner ancestry. |
| Final frame-performance owner could bypass R60 live elapsed accounting/catch-up | **CLOSED** | The original R60 low-FPS contract and the Stage 9 sustained-session soak both pass on exact head `257385e4e4e6c7fe37f0b063a3e14d45a063612c`, including advancing live elapsed frames and bounded catch-up substeps. |
| Horde ownership, movement/damage isolation or timers could accumulate during long sessions | **CLOSED** | Launch/re-entry, movement/damage isolation, lifecycle and sustained-session contracts all pass in the same canonical Chromium suite with fixed owner depth, no extra installs/reassertions and no uncaught browser errors. |

## Stage boundary

When canonical CI triggered by this documentation-only commit is fully green, **Stage 9 is formally complete** and Stage 10 Spy Vs Spy isolation/reconstruction may begin.

Until then:

1. Do not merge PR #1852.
2. Do not touch PR #1860.
3. Do not begin Stage 10 Spy Vs Spy reconstruction.
4. If this acceptance head exposes a real canonical failure, investigate that failure first and reopen only the affected Stage 9 item when evidence justifies it.
