# CCG High Score Arena game integration

The independent HelioHost PHP and MariaDB service shares member registration,
email verification, browser sessions, score attempts and moderation across
eligible C64 cartridge games.

| Game and exact edition | Arena game key | Cartridge catalogue entry | Bytes | SHA-256 |
| --- | --- | --- | ---: | --- |
| Crossfire (Sierra On-Line CRT) | `c64-crossfire-sierra-online` | `owner-crt-more-crossfiresierraonline-0c60e852f438` | 65,728 | `0c60e852f438ab9b6b325a1ecedb69ae1bbff9d1519584e52d6bb31df26c14ab` |
| Dropzone (C64 CRT) | `c64-dropzone` | `owner-crt-more-dropzone` | 82,144 | `0bed973b322510b8a8b717fc7305ec54246dc3b00c0aa0f701702864c92253c7` |

## Add an eligible game

1. Register a unique game key and the exact catalogue ID, format, byte count,
   SHA-256, rules version and score ceiling. Start the database game row in
   `pilot` and keep its read and write release flags disabled. Closely named
   games and different editions need separate identities.
2. Exercise the original media in the existing C64 emulator. Capture a
   genuine fresh run, zero and distinct positive scores, and a stable final
   game-over sequence. Record the frame evidence and inputs. Verify restarts,
   resets, other editions, model changes and saved-state disqualification.
3. Implement a game-specific observer and evidence validator. Specify the
   terminal-frame count, score encoding and numeric display width. Verify the
   exact loaded media before attaching the shared attempt client or board.
4. Reuse the member session and CSRF handshake, one-use attempt, private
   pending-review intake, and owner-MFA moderation. Browser evidence is an
   unverified claim. Publish only approved projections, with private fields
   excluded. Keep per-game flags and game status independent.
5. Attach game-specific artwork and preserve the 4:3 viewport. Match existing
   mobile controls and keep the board behind the SCORE action where required.
   Verify the gameplay display, mobile load, and keyboard and joystick paths.
6. Qualify with genuine cartridge fixtures, passing deploy CI and a controlled
   production test. Verify a genuine authenticated score receipt, moderation,
   ordering, best-score replacement and persistence from another session.
   Remove only the identified test records after qualification.

[Current Crossfire and Dropzone checkpoint](high-score-arena-crossfire.md)
