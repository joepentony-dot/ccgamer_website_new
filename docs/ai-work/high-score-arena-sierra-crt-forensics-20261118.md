# Sierra Crossfire CRT — Score and Game-Over Forensic Gate (18 Nov 2026)

Scope: User-selected Sierra On-Line Crossfire CRT only. This is separate from the Atlantis/Pantheon PRG observer and its HelioHost pilot schema. Mobile Arena visibility remains independently in website PR #3103.

The website auto-mounts the visual Arena for the SHA-pinned Sierra CRT, but rankings are empty by design. The player's screenshot shows a real score HUD, not a verified memory address, encoding, new-run state, game-over boundary or authenticated submitter.

## Research candidate

- Isolated script scripts/high-score-arena/probe-sierra-crossfire-crt.mjs runs original C64Machine, original firmware and exact 65,728-byte cartridge with SHA-256 0c60e852f438ab9b6b325a1ecedb69ae1bbff9d1519584e52d6bb31df26c14ab.
- Captures actual emulated video PNGs, full 64KB emulated RAM, VIC screen data, frame counts and RAM diffs at boot, F1 start and deterministic input stages.
- GitHub Actions saves short-retention forensic evidence. No account, leaderboard, server API, score submission, game media or website runtime changes.
- Test inputs might not produce a positive score. Changed memory or a successful screenshot is not a verified decoder. The script reports zero verified score addresses.

## Required before a working public leaderboard

1. Capture at least three distinct real displayed CRT scores, including zero, synchronized to actual emulator memory. Find and independently corroborate the associated byte positions/encoding.
2. Reproduce a fresh no-trainer start, lives and final game-over indicator. Test restart, loss, pause, reset and save-state restore; reject fabricated or stale memory.
3. Write an exact-Sierra-only lightweight read-only score observer and regression with original cartridge and real positive scores. Leave Crossfire - Tron and all other games untouched.
4. Integrate independently qualified HelioHost MariaDB per-edition registration, authenticated member identity, CSRF, one-use attempt, moderation and public read API. Candidates start pending and never become public rankings automatically.
5. Run exact-head CI, performance/browser/mobile/fullscreen/security checks, independent review and guarded deployment with live player acceptance.

Status: Forensic source only. Neither Sierra score detection nor submissions are verified or live. No backend flags, production login or Supabase migration are modified.


## Recorded genuine CRT findings — 18 November 2026

Real original-cartridge headless job 44335006793 completed successfully and preserved six PNG/64KB-RAM captures, including the exact CART title and the later 000000 HUD/game-over image. Follow-up job 44335776508 tested joystick ports and keyboard firing from the title state; run 44336498842 tested longer F1 holds, but neither produced an independently verified nonzero game score.

The captured six-digit current score occupies VIC screen base $0400, column 39, rows 19–24 ($071F, $0747, $076F, $0797, $07BF, $07E7). The displayed prior high score occupies the same column rows 6–11 ($0517 through $05DF, stride 40). A custom digit font at RAM $2800 encodes numeric glyphs as character codes 0–9; actual zero and eight glyph pixels were inspected from the genuine game RAM. A guarded standalone read-only decoder and synthetic 000800 regression were added. The user-provided on-screen score screenshot visually corroborates the numeral format, but there is still **no same-frame genuinely scored 000800 RAM** to verify in this research branch.

An existing game-over-looking frame and a six-digit value do NOT establish a fresh, eligible completed run. All network score submissions, HelioHost queries, member linkage and public rankings remain disabled. A score report is, at most, a local candidate. Verify actual positive scores, run start, lives and terminal states before production use.

Related action runs: https://github.com/joepentony-dot/ccgamer_website_new/actions/runs/44335006793 ; https://github.com/joepentony-dot/ccgamer_website_new/actions/runs/44335776508 ; https://github.com/joepentony-dot/ccgamer_website_new/actions/runs/44336498842 . The score-specific backend draft #2 is still Atlantis/Pantheon PRG-specific and is not an approved Sierra CRT route.
