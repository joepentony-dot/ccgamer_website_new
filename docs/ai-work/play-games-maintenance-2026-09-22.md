# Play games maintenance and protected Dungeon access

## Scope

This checkpoint covers the temporary public maintenance state for CCG browser games and the controlled C64 Dungeon Carnage beta. Commodore Quest remains maintenance-gated to the CCG Games hub. Dungeon Carnage has a separate owner/member/invited-tester access path so active playtesting can continue without exposing the beta runtime to ordinary visitors.

This workstream is access-control and release-maintenance work. It must not be used to introduce unrelated Dungeon gameplay or feature changes.

## Authoritative checkpoint — 2 October 2026

- Consolidation survivor: PR #2475 / branch `codex/dungeon-r91-tester-member-access-clean`, rebuilt from the fully merged R90 `main`.
- C64 Dungeon Carnage production access is no longer an owner-only redirect.
- The signed-in Cheeky Commodore Gamer admin profile may enter.
- Website members explicitly assigned the Dungeon beta entitlement may enter from their normal signed-in account.
- Invited testers may enter the current tester code. The code itself is stored in Supabase Vault and is validated by the server-side `ccg_validate_dungeon_carnage_tester_code` RPC; the public repository/browser bundle does not contain the live secret.
- A stored tester session contains only the submitted code and is revalidated on every restore. Restore and fresh-code validation fail closed on the shared bounded auth timeout.
- Member playtest access is represented by a protected `ccg_product_entitlements` row with `product_slug='c64-dungeon-carnage'`, `status='active'` and `source='playtest'`.
- Admin authority for assignment comes from canonical `public.user_roles`; member identity/sign-in comes from `auth.users`, profile metadata from `profiles`, and soft-ban state is enforced.
- Paid/non-playtest entitlements are never silently converted into playtest entitlements.

## Runtime-startup security

The tester modal is not the security boundary.

Both Dungeon entry points keep the game runtime inert in `application/ccg-protected-runtime` script placeholders. The shared maintenance gate performs the server-verifiable owner/member/tester check first. Only an accepted access result sets the internal runtime grant and starts `bootstrapProtectedRuntime()`.

The current loader uses an explicit parser-boundary handshake so protected scripts can be materialised in canonical order without allowing them to initialise before authorization. If access resolves after the original DOM-ready point, the loader performs the deterministic delayed-runtime compatibility path instead.

Therefore deleting or hiding `#ccg-tester-access-gate` does not start the game. Ordinary production visitors have the HTML shell but no active Dungeon runtime.

Protected entry points:

- `/arcade/c64-dungeon-carnage/`
- `/arcade/lost-sizzler/` (retained compatibility route)

The shared gate is `/js/ccg-play-maintenance-owner-gate.js`, cache-busted with `20261002-tester-gate-v4`.

## Supabase migration state

Repository migration history includes the Dungeon product/entitlement dependencies before the playtest RPCs and matches the corrective migrations applied to production. The migration is idempotent and uses `ON CONFLICT DO NOTHING` for the existing Dungeon product row so production commerce configuration is not overwritten.

Direct browser access to `ccg_product_entitlements` is revoked; the browser uses bounded RPCs instead.

## Other maintenance routes

The public Commodore Quest/runtime entries retain their existing production redirect to `/games/ccg-games/`. The games hub remains the temporary maintenance destination for those routes and continues to expose Trivia League and Game Box Hangman without duplicating either implementation.

The established `/games/` archive remains separate from playable CCG-original browser experiences.

## Qualification / merge gate

Before merging a Dungeon access change:

1. Run `tests/play-games-maintenance.test.mjs`.
2. Run `tests/dungeon-tester-code-gate.test.mjs`.
3. Run `tests/dungeon-member-playtester-admin.test.mjs` and the retained Dungeon owner/member/tester maintenance contracts.
4. Require the exact-head fast Node/structure checks and every Chromium qualification shard to finish green.
5. Require the C64 Dungeon Carnage Full Qualification workflow to finish green on the exact candidate head.
6. Require zero unresolved review findings and zero commits behind `main`.
7. Verify both Dungeon entry points contain protected runtime placeholders, the parser-boundary handshake and the current gate cache token.
8. After merge/deploy, verify anonymous production access cannot initialise the Dungeon runtime merely by removing the modal; owner, assigned-member and valid invited-tester flows must each start the same protected runtime only after validation.

Do not weaken the runtime gate or regression contracts to simplify qualification. Removing or changing maintenance later must be a separate qualified change.
