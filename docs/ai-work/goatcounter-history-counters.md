# GoatCounter historical and hourly visitor counts — 26 October 2026

## Scope and source ownership
Existing PR #2891 / `fix/goatcounter-history-counters-20261022`. Preserve current-main recovered historical archive baseline (14,793 recorded hits through 22 October 2026), the historical game snapshots and legacy-query reconciliation, and existing dynamic game-page counters. Do not restore the obsolete PR version of `js/ccg-visitor-metrics.js` or its older service-worker namespace.

The distinct feature from #2891 is a second, accurately described **cumulative** count of one-per-browser-per-rolling-hour `ccg-archive-session` events since activation. This is not a real-time count of visitors online, nor a unique lifetime-people count. The existing recovered archive counter retains its own baseline and update logic. Public read-only GoatCounter JSON supplies the separate hourly event number; a blocked fetch leaves a neutral placeholder.

## Reconciliation
Reconcile old PR head `2204d8b75eee4adcf59ed69bf9a0ee9b88b06861` with latest inspected main `e946417a98b36e81a10a90ca557bad4bf9bf7d54` through a non-force, expected-head guarded two-parent integration. Preserve all four unique diagnostic/export files, current-main `tests/browser/goatcounter-visible-counters.py` and newer Node recovery assertions, scoped footer styling and monotonic code cache. Do not touch `home.html`, `games/games.json`, game HTML, emulator, protected intro or SEO outputs.

## Qualification and release
Require actual exact-new-head Node GoatCounter regression, browser-visible home/game counters, all applicable current-head GitHub Actions and no performance regressions. Review must be independent, completed on the exact final head and free of major/unresolved findings. Reconcile with any newer main commits, merge via expected-head guarded squash only when qualified, then verify deployment and live home/game counters. Old PR reviews/CI are not transferable. The 22 October Codex usage-limit comment is historical and is not a current quota reading.
