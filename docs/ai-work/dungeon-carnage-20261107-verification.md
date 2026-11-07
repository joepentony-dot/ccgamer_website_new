# Dungeon verification — 7 November 2026 UTC

## Scope and exact identity

This is an evidence refresh, not a gameplay release or original-incident closure. Audit main is `54d9b25965d10ff11cf8bcb4699ba8facd91db3e`; #2958 merge is `148db2cfe21b15260460e5b24c14ef655190bbe0`, merged 6 November 19:16:31 UTC from qualified `d573443646011311c8e0f67b5d7543cb8546eba7`. Fresh Git/API reads, not old checkpoints, establish these facts.

Commands: `git fetch origin main`; `git diff --exit-code d573443646011311c8e0f67b5d7543cb8546eba7^{tree} 148db2cfe21b15260460e5b24c14ef655190bbe0^{tree}` (identical whole tree); `git diff --stat 148db2cfe21b15260460e5b24c14ef655190bbe0 origin/main -- arcade/lost-sizzler arcade/c64-dungeon-carnage` (empty); `git rev-parse 148db2cfe21b15260460e5b24c14ef655190bbe0:arcade/lost-sizzler origin/main:arcade/lost-sizzler` (both `8303db32af65238bbab621159779b05c5ca38af6`). No production account, database or save was queried.

## Refreshed GitHub evidence

GET `/repos/joepentony-dot/ccgamer_website_new/pulls/2958`, `/actions/runs?head_sha=<exact SHA>&per_page=100`, `/actions/runs/<id>/jobs?per_page=100`, `/issues/comments/<id>`, `/actions/runs/42274577892/artifacts?per_page=100`, and review-thread listing were inspected. Twenty pre-merge workflow groups report success; twelve latest post-merge groups report success. Nonzero job/step executions confirmed:

| Evidence | Run / receipt | Exact head / result |
| --- | --- | --- |
| Pre-merge Full | [42274578232](https://github.com/joepentony-dot/ccgamer_website_new/actions/runs/42274578232) | d573443646; 8/8 jobs, including all six Chromium shards; attempt 1 |
| Independent review summary | [6692803476](https://github.com/joepentony-dot/ccgamer_website_new/pull/2958#issuecomment-6692803476) | full d573443646 SHA; completed, no findings/unresolved findings |
| Independent review receipt | [6692845964](https://github.com/joepentony-dot/ccgamer_website_new/pull/2958#issuecomment-6692845964) | d573443646; clean; current review threads empty |
| Post-merge Full | [42278181603](https://github.com/joepentony-dot/ccgamer_website_new/actions/runs/42278181603) | 148db2cfe2; 8/8 jobs; attempt 1 |
| Post-merge site-wide Lighthouse | [42278181612](https://github.com/joepentony-dot/ccgamer_website_new/actions/runs/42278181612) | 148db2cfe2; 24 desktop/mobile shards plus aggregate, all successful; attempt 1 |
| Pages / production smoke / navigation | 42278181619 / 42278181702 / 42278662839 | all 148db2cfe2, successful |
| Windows preview | 42274577892; artifact 13531084685 | qualified d573443646; exists/unexpired; **not installed owner acceptance** |

Post-merge Full Chromium job IDs: shard 1 `128101123047`, 2 `128101122505`, 3 `128101122447`, 4 `128101122430`, 5 `128101122522`, 6 `128101122473`. Successful job timestamps and test steps are present, not skipped/zero-job summaries. Lighthouse aggregate job `128132050146` succeeded after its 24 shards. These workflow successes do not assert every page meets the programme's 90+ target.

Historical Native Wheel `42278181573` is successful on attempt **2**, unlike the Full/Lighthouse attempt-1 passes. Fresh attempt-1 job `128099892234` log confirms the Genres first native-scroll response failed at 266.5ms; the recorded unchanged-head retry passed. Preserve that earlier failure/review distinction; no new rerun was dispatched for this audit. Artifact metadata was inspected, not a fresh owner Windows installation or commercial release. Historical checks are not merge permission for a future code head.

## Current-source falsification checks

Environment: Node 24.22.1, Playwright package 1.55.0, system Chromium 156.0.8078.79. This supporting local run does not replace the historical canonical Node 22 / pinned CI browser matrix. Source and assertions remained unchanged.

`python /workspace/work/dungeon-audit/run-focused.py` ran the following **21 existing Node files**, each under `NODE_OPTIONS=--require=/workspace/work/generated-audit/offline-node.cjs`. The preload throws before global fetch, HTTP(S), DNS and sockets can leave the process. All passed; production Supabase requests **zero**.

```text
arcade/lost-sizzler/tests/v10-42-warden-charge-routes-contract.mjs
arcade/lost-sizzler/tests/v10-42-warden-cleansing-effects-contract.mjs
arcade/lost-sizzler/tests/v10-42-warden-domain-progression-contract.mjs
arcade/lost-sizzler/tests/v10-42-warden-essence-ownership-contract.mjs
arcade/lost-sizzler/tests/v10-42-warden-hunt-guidance-contract.mjs
arcade/lost-sizzler/tests/v10-42-warden-interface-consistency-contract.mjs
arcade/lost-sizzler/tests/v10-42-warden-navigation-cues-contract.mjs
arcade/lost-sizzler/tests/v10-42-bug-reporter-contract.mjs
arcade/lost-sizzler/tests/v10-42-r87-fifteen-floor-campaign.mjs
arcade/lost-sizzler/tests/v10-42-r138-sigil-lockdown-recovery.mjs
arcade/lost-sizzler/tests/v10-42-r137-flask-shop-capacity.mjs
arcade/lost-sizzler/tests/v10-42-r136-warp-stack-chest-notice.mjs
arcade/lost-sizzler/tests/v10-42-r150-pickup-floater-aggregation.mjs
arcade/lost-sizzler/tests/v10-42-r151-linear-effect-retirement.mjs
arcade/lost-sizzler/tests/v10-42-r152-warden-boss-room-spawn.mjs
arcade/lost-sizzler/tests/v10-42-r153-warden-boss-chamber-guard.mjs
arcade/lost-sizzler/tests/v10-41-supabase-egress-guard.mjs
arcade/lost-sizzler/tests/v10-41-r43-solo-save-continue.mjs
arcade/lost-sizzler/tests/v10-21-environmental-polish.mjs
tests/dungeon-carnage-r122-flask-live-transaction.test.mjs
tests/lighthouse-performance-protocol.test.mjs
```

Browser commands (each passed once, no retries):

```sh
node --experimental-loader=/workspace/work/dungeon-audit/playwright-loader.mjs arcade/lost-sizzler/tests/browser/v10-42-r78-five-floor-transition-fire.mjs
node --experimental-loader=/workspace/work/dungeon-audit/playwright-loader.mjs arcade/lost-sizzler/tests/browser/v10-42-bug-reporter.mjs
node --experimental-loader=/workspace/work/dungeon-audit/playwright-loader.mjs arcade/lost-sizzler/tests/browser/v10-41-supabase-egress-browser.mjs
```

The scratch loader resolves the installed Playwright package, selects system Chromium, disables service workers, counts every Supabase request (all contexts zero), aborts non-loopback HTTP(S)/WebSockets and supplies an unreachable loopback proxy for external traffic. Existing test mocks remain local/inert. It changes no repository source or assertion and uses no TLS-ignore flag. The egress contract also exercises Intro/Home and actual Solo; it blocked twelve unrelated third-party requests. Logs: `/workspace/work/dungeon-audit/{focused-node.log,r78-browser.log,reporter-browser.log,egress-browser.log}`.

Observed R78 fixture results: Floor 1–5 transitions, physical keyboard step, Save & Quit/Continue and staged bridge/death/Flask recovery pass. Controlled Floor 5 with Maw, Count and Death Stalker alive at 2/3 generators remained `playing`, elapsed 12,932ms / 225 accepted frames. After injecting 300 already-defeated generator reinforcements, actual update owner retained 24, removed old visual entries, kept live special actors and Score/Kills/Generator counters; frame count advanced 226→242 and visual pools were 16 particles / 1 ring / 1 floater. Destroying the third generator granted 700 once but retained living-boss lock; defeating Maw then completed objective/opened exit, delivered one chest/side item, and repeated processing added zero Score/Kills/Generators/chests/items. These staged transitions/calls are **not natural owner traversal or the original save**.

## Demonstrated safeguards versus unresolved hypotheses

| Report / hypothesis | What current tests establish | What remains unproved |
| --- | --- | --- |
| “Two indestructible enemies” means duplicate spawning | R152 deterministic placement across 24 map sizes × 15 floors, existing singleton/dead-ledger tests, R153 movement/JSON 2/3→3/3 boundaries pass. Count (`host.stalker`) and Death Stalker (`host.enemies`) are distinct intended actors. | Identity/count/ward state of the owner's reported actors, including after original death/Continue. |
| Second Flask is consumed or ineffective | Actual one-charge inventory owner spends first charge on one ward; genuinely reacquired second targets the other after JSON restore; broken/dead/removed/blocked targets cannot steal payment; genuine refusal/refund and weapon vulnerability pass. | Owner's inventory/payment/LOS and actor identity/action sequence; no claim of matching original transaction. |
| Guardian freeze is caused by retained corpses / effect retirement / convergence | Current corpse-retention pressure, R150 counted labels, R151 >2,300 expired effects and R153 live-boss-room movement boundaries pass; controlled browser remains live with no JS fault. These were independently demonstrated narrow mechanisms in earlier changes. | Original Windows freeze stack/frame trace, duration, save/seed, rendering/audio/GPU or other hardware-specific cause. No newly reproduced current freeze. |
| Existing diagnostics resolve the report | Node report snapshot preserves bounded distinct IDs/wards/blocked targets/2-of-3 state; real browser reporter captures actual input, panels, active-trap and hazard signals. | An actual report captured at the owner's failing encounter. Instrumentation is not a fix. |

No new current gameplay defect was demonstrated, so this work makes **documentation/evidence changes only**. Original P0 incidents remain OPEN / NOT OWNER ACCEPTED. R154 minimap, R144 chest, R147 equipment and R145 Sack remain merged / NOT OWNER ACCEPTED. Owner matching needs save or seed/floor, exact installed build/cache identity, first/second-Flask and death/Continue steps, and existing F8 / `?bugreport=1` report. Do not include credentials. **OWNER WAIVER — WINDOWS MANUAL ACCEPTANCE NOT PERFORMED. Commercial Windows release HOLD.**

## Current production bytes

`python /workspace/work/dungeon-audit/verify-live-runtime.py` performs TLS-verified HTTPS GETs only to the public custom domain and compares against the already-qualified actual Pages staging, tree-identical to 54d9b259. All ten pass. An initial helper used an incorrect guessed alias `/arcade/dungeon-carnage/` and stopped on missing **local** fixture before comparison; corrected to the actual tracked `/arcade/c64-dungeon-carnage/`, with unchanged equality assertions. This was not a runtime failure or waived check. Version is `V10.42 r154`, cache `20261106r154`.

| Staged and served path | SHA-256 (identical) |
| --- | --- |
| `arcade/lost-sizzler/index.html` | `436e6c69790ea80f802bfb08a0daf0820eb217021ac4d14d73e837763f4f89d1` |
| `arcade/c64-dungeon-carnage/index.html` | `2cd9f1925ecb5c4d3ad16632fa48cc3c32bfc8fa6b240cd55d6a3966abdadb22` |
| `arcade/lost-sizzler/version.json` | `29a71ec0be6e332c4a79ea3fdb4efcdbad99ccd7d8d60b442e220ee665054ce6` |
| `arcade/lost-sizzler/js/game-play.js` | `014335cc73f53c4344fe347484ee1babda9dc0867ce05aef0d0d3b0607ffffad` |
| `arcade/lost-sizzler/js/game-render.js` | `ad3f23e473ed83fbdd219f3830cb851b6dec123803e56e4d99c62089b0ae7d8d` |
| `arcade/lost-sizzler/js/systems.js` | `ddecd34b765eb6746b11801dc08d9a46064712459e9cd7c93f7d200bdff87b53` |
| `arcade/lost-sizzler/js/ai.js` | `4fcf08a5ca1fd018ad81c25090e26f8274252836edca7b728b84899845f65a76` |
| `arcade/lost-sizzler/js/v10-42-warden-purpose-overhaul.js` | `425d134c907f82a140f0c5bf88608a0cec7a2abf06c986f39c66e5340a2661fe` |
| `arcade/lost-sizzler/js/v10-42-bug-reporter.js` | `75bf563d5a6f970eb1e84d24001450a4c9e91d4926370ec0f12187a66cbde05b` |
| `arcade/lost-sizzler/js/v10-42-bootstrap.js` | `2987eed6fa8de0c8b21b9d5b3c6701895ea738afe865336793bf8df4374a40d6` |

Scratch API/job/review evidence: `/workspace/work/dungeon-audit/github-2958-evidence.json`. Production comparisons use static public files only; no production Supabase request, account mutation, saved-game migration, soundtrack download or owner acceptance was performed.
