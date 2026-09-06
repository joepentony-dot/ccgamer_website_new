# Lost Sizzler Stage 7 Acceptance Record

## Status

**Stage 7 closure candidate — accepted on the tested production head, pending canonical CI on this documentation-only acceptance commit.**

This record closes the engineering review for Stage 7 (long-session soak and regression testing) against production head `d1eaa42e20bcb94e742f5840949eee183944a31c`. No Stage 8 gameplay work may begin until the documentation-only head created by this record completes the canonical CI gates successfully.

PR #1852 remains a draft and must not be merged. PR #1860 is outside this programme and must not be touched.

## Canonical evidence

The accepted production candidate was exercised by Lost Sizzler Load Safety run `33836343038` (#1066), including successful exact-head executions after the final ownership changes. The latest complete execution was job `100915415376` and passed structure validation, syntax validation, canonical Node contracts, Chromium installation, and the full canonical Chromium load/layout/browser suite.

All other PR workflows on the same production SHA were also green: Arcade Test Package, CCG Publishing Automation Integrity, SEO Automation, Arcade Quest Validation, and CCG Site Safety.

### Sustained Solo timing

The long-session browser soak uses two real 60-second active-play measurement windows separated by 12 pause/focus lifecycle cycles.

- Baseline active wall time: 59,937 ms
- Baseline observed simulation: 59,914 ms
- Baseline simulation ratio: **0.9996x**
- Post-lifecycle active wall time: 59,866 ms
- Post-lifecycle observed simulation: 60,014 ms
- Post-lifecycle simulation ratio: **1.0025x**
- Relative post/baseline cadence: **1.0029x**
- Lifecycle pause boundaries added: **84**
- Visible active time discarded in either measurement window: **0 ms**
- Owner depth remained stable at loop/update/move/damage **1 / 2 / 2 / 5**
- Owner changes during measured stable Solo: **0**
- R30 ownership repairs: **0**
- R30 forced restores: **0**
- R30 input reassertions: **0**
- R30 watchdog recoveries: **0**
- R30 movement repairs: **0**
- R30 owner-seal repairs: **0**

The accelerated stabilization soak independently measured **0.9955x** before lifecycle stress and **0.9966x** after it, for relative cadence **1.0011x**, with zero ownership-depth growth and zero unexplained repairs.

R59 retains the frozen Solo timing contract: maximum 45 ms substep, 1080 ms accepted visible-gap ceiling, and 24 maximum substeps. Pause/hidden boundaries rebase the accepted RAF timestamp; there is no persistent timing-debt accumulator.

## Ownership acceptance

R59 remains the single authoritative Solo RAF/simulation owner. The remaining compatibility/lifecycle monitors have been narrowed so healthy Solo does not repeatedly replace frame/update ownership.

- R59's retained 40 ms compatibility monitor is drift-only; stable Solo records zero stable-loop writes/reassertions and zero Spy ticks.
- R29's retained finalizer no longer re-enters the already-stable R29/R59 installer.
- R30 no longer re-enters an already-cooperative R29 installer.
- R32's former ordinary-Solo 20 ms Spy-loader poll is retired; Spy loading is event/lifecycle-driven.
- R30 owner seal retires its former 16 ms fallback poll when durable assignment/global-guard coverage exists.
- R57's retained bridge is lifecycle-dirty/pending-work driven; stable Solo bridge/cooldown deltas are zero.
- R60 recurring live-owner polling remains Horde-only; Solo ownership is event-driven/one-shot.
- Mode-owned diagnostics repair only the requested gate synchronously rather than adding another polling owner.

### R30 retained-watchdog decision

The R30 global movement guard retains its 40 ms monitor. This is an intentional Stage 7 acceptance, not unfinished consolidation.

Healthy Solo measurements show the guard performs ancestry/invariant reads but **zero ownership repairs, zero forced restores, zero input reassertions and zero watchdog recoveries**. Its recurring duties include held-input sampling, movement-stall detection, poisoned-owner/cooldown recovery, top-level ownership fault recovery, and Spy-to-Solo cleanup. Focused regressions require fast recovery when a real fault is deliberately injected.

Therefore R30 is accepted as a **passive/narrowly scoped movement, input and fault watchdog**. There is no measured evidence that it replaces the authoritative Solo frame/update owner or causes the historical timing defect. Removing or slowing it solely to eliminate a timer would reduce verified fault coverage without evidence of gameplay benefit.

## Defect disposition

| Defect | Stage 7 disposition | Closure evidence |
| --- | --- | --- |
| LS-SOLO-001 | **CLOSED** | Two sustained real-time windows remain approximately 1.00x before/after lifecycle stress; no burst, slowdown, acceleration, debt or discarded visible time. |
| LS-SOLO-002 | **CLOSED** | One authoritative Solo simulation owner remains. Unnecessary recurring ownership mutation was retired/narrowed; retained R30 work is passive/narrowly scoped in healthy Solo. |
| LS-SOLO-003 | **CLOSED** | Repeated pause/focus lifecycle stress preserves cadence with no accumulated timing debt; 84 accepted pause boundaries were observed in the long soak. |
| LS-SOLO-004 | **CLOSED** | Stable owner depths and zero unexplained ownership/owner-seal repairs across sustained Solo and lifecycle diagnostics. |
| LS-SOLO-005 | **CLOSED** | Required modern R56/R60 damage semantics remain in bounded ancestry; lifecycle diagnostic shows no collapse or multiplication. |
| LS-SOLO-006 | **CLOSED** | Subsequent canonical Horde low-FPS perimeter/projectile/cooldown/paused-gap contracts repeatedly pass; no deterministic shared-clock defect remains. |
| LS-SOLO-007 | **CLOSED** | Solo movement resumes after active-play cadence/pause transitions with one R60 movement layer and no unexplained R30/owner-seal repair. |
| LS-SOLO-008 | **CLOSED** | Focused Save & Quit -> Continue, stalled remote-cleanup, and full Floor 1 -> Floor 2 autosave/backup coverage pass on the accepted production head. One isolated same-head Floor 2 wait timeout did not reproduce on the subsequent complete exact-head execution and is retained here as historical flake evidence rather than hidden or test-weakened. |
| LS-SOLO-009 | **CLOSED** | Repeated canonical fresh Solo starts reach active `playing` ownership with valid run/player/host state and no recovery-loop dependence. |
| LS-SOLO-010 | **CLOSED** | Quick Inventory artwork is reconciled synchronously, remains correct through cross-mode transitions, and no longer depends on a later overlay poll. |

## Regression evidence retained

Stage 7 acceptance also preserves the following focused coverage:

- R59 pause-clock and bounded visible-gap regressions
- Solo long-session and accelerated stabilization soaks
- Solo damage-owner lifecycle diagnostic
- R60 Solo live-integrity and movement cadence
- R30 global movement fault recovery
- R30/R29 bridge retirement
- R30 owner-seal poll retirement
- R32 ordinary-Solo poll retirement
- R57 stable bridge retirement
- mode-controller/owned-system isolation
- fresh Solo start liveness
- Save & Quit -> Continue, later-floor autosave and backup recovery
- synchronous Quick Inventory presentation
- Horde low-FPS timing isolation
- Spy/Solo damage-owner composition and mode-exit recovery

## Stage boundary

When the CI triggered by this documentation-only commit is green, **Stage 7 is formally complete** and Stage 8 may begin. Until then:

1. Do not merge PR #1852.
2. Do not touch PR #1860.
3. Do not make Stage 8 gameplay changes.
4. If the documentation-only head exposes a real canonical failure, investigate that first and reopen only the affected defect when evidence justifies it.
