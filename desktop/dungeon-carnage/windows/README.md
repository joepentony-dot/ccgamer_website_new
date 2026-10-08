# C64 Dungeon Carnage — Windows installer / portable preview

This directory is a **separate Windows packaging target**, not a change to
the live CCG website or the canonical game runtime.

## Products

- **C64 Dungeon Carnage Setup EXE:** NSIS installer, install-directory choice,
  Start menu/desktop shortcuts and an uninstall entry.
- **C64 Dungeon Carnage Portable EXE:** single launcher without installation.

Both run the existing verified standalone itch.io game from a bundled Electron
application window, without opening Chrome or a command prompt.

The ASAR file consolidates HTML, CSS, JavaScript, artwork and audio in an
application archive. **ASAR is not encryption, licensing or DRM.** A buyer with
technical knowledge can extract its contents; this build does not contain
Supabase credentials, service-role tokens or entitlement systems.

The app launches a read-only local server bound only to 127.0.0.1 on a random
port, retaining root-relative game asset URLs. It supports byte-range requests for large
MP3 and OGG voice sprites. External game network traffic is blocked by the
Electron session. Allowed external links open in the user's browser only when
they belong to the explicit trusted-host list.

## Build

GitHub Actions: **Dungeon Carnage Windows Installer (Preview)**, at
.github/workflows/dungeon-carnage-windows-installer.yml.

The first Linux job stages and SHA-256-verifies the canonical itch.io offline
game, preserving the existing active-art and licensing filters. The Windows job
runs tests and packages NSIS/portable executables using pinned direct tool
versions. GitHub Actions retains unsigned test artifacts for 14 days; no
automatic public release or purchase permission is created.

### Local developer build

Requires Node 22+ and a Windows workstation:

1. Obtain the offline game directory from the staging job as game/.
2. Run npm install in this directory.
3. Run npm test.
4. Run npm run dist.

The installer and portable EXE are written to dist/. The executable icon is
generated from icon.svg; replace the SVG later with approved final artwork.

## Remaining release gates

1. Recover all 16 original author-uploaded MP3 files from restricted
   Supabase Storage; bundle them and verify actual music transitions. The
   placeholder WAV fallback is not the intended commercial soundtrack.
2. Complete recorded-voice scenario mappings (including the 84 owner
   sprite cues), correct outdated dialogue, and verify each game event in
   runtime tests and real Windows play.
3. Verify Windows installs, runs, saves/resumes, plays and seeks sprite audio,
   works offline, uninstalls correctly, and handles portable data retention.
4. Provide an approved final icon/marketing images. Consider Windows code
   signing to reduce SmartScreen warnings. This preview is unsigned.
5. Confirm final third-party art/audio redistribution rights, itch.io
   purchase/download settings, commercial end-user licensing and release QA.

**Do not publish this preview as a paid game.**

## Save-game origin and acceptance

The game server now listens on fixed loopback port **47731**, rather than a
random port. Chromium localStorage and IndexedDB are bound to the exact page
origin, so moving ports on each run would hide saved progress. Port conflicts
intentionally fail with a user-visible error rather than silently losing
access to saves. The app keeps its Electron user-data directory between
updates; uninstall retention must still be checked on the owner's PC.

The Windows GitHub workflow also launches the **actual unpacked EXE** and
verifies that it serves the game HTML, accepts OGG Range audio requests, and
denies access to dotfiles. This is a technical startup smoke only, not a
complete manual playthrough or verified original soundtrack test.

## Original soundtrack recovery intake (prepared, not yet populated)

After the owner's original MP3s become accessible again, recover the **16
original enabled files** into a folder outside the repository. The local
packager can then import all 16 without adding them to GitHub or changing any
public website code.

Run the existing canonical itch staging builder first, then from the repository
root, run these local commands with the actual paths substituted:

```powershell
node desktop/dungeon-carnage/windows/import-original-music.mjs --game "C:\path\to\staged-game" --music "C:\path\to\recovered-mp3-files"
node scripts/build-c64-dungeon-carnage-itch-package.mjs --verify "C:\path\to\staged-game"
```

The importer accepts flat filenames or the original Supabase category folders.
It refuses missing tracks, unexpected sizes, non-MP3 headers and files whose
MD5 fingerprint does not match the original object ETag recorded in Supabase
Storage. These fingerprints were retrieved from the project's read-only
Storage metadata on 8 October 2026, so matching-name replacement audio cannot
be mistaken for the originals.
It copies the originals into the packaged game, replaces all original Supabase
music URLs with local URLs and refreshes SHA-256 release-manifest entries. The
source recordings are left unchanged. The importer is not automatic in GitHub
Actions because the original private media are **not yet available** to it.

**Never commit recovered music to the public website repository**, attach it
to an unrelated pull request, or treat a preview with placeholder WAVs as the
paid commercial soundtrack. An owner-approved private staging input should be
used for future signed commercial release builds.
