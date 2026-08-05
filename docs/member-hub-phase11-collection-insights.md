# Member Hub Phase 11 — private collection insights

Phase 11 adds read-only statistics and a random game selector to each private
custom collection in the Member Hub.

## Collection snapshot

For the selected custom collection, the Member Hub shows:

- total games
- Commodore 64, Amiga and other-system counts
- earliest and latest recorded release years
- average personal rating where ratings exist

The statistics are calculated from the member's existing personal-library
records. They do not query or alter the master game archive.

## Random game selector

`Choose a random game` selects a game from the active custom collection and
links to its existing game page. When a collection contains more than one game,
the same game is not selected twice in succession.

## Privacy and data boundaries

- The feature remains private inside the signed-in Member Hub.
- It reads the established `ccgPersonalGameLibraryV1` browser data.
- It performs no browser-storage writes.
- It introduces no new Supabase table or migration.
- It does not read or modify `games/games.json`.
- Collection names, membership, ratings and notes remain under the existing
  custom-collection and account-sync controls.
