# CCG C64 Online Library media

This folder is the **storage location** for CCG-authorised C64 disk and cartridge files. It is served as static files at `/emulator/c64/media/<filename>` and does **not** depend on Supabase.

## Add another game

1. Only add an image that CCG is allowed to publicly redistribute. Ownership of an original disk, game or downloaded copy is not itself redistribution permission.
2. Upload the `.d64`, `.d71`, `.d81`, `.g64`, `.tap`, `.t64`, `.prg`, or `.crt` to this folder on a review branch.
3. Add an entry to [library.json](../library.json) with a distinct `id`, display `title`, exact case-sensitive `filename`, lowercase `format`, and `url` such as `/emulator/c64/media/game.d64`. Retain the existing entries.
4. Open/merge a PR after verifying redistribution rights and emulator compatibility. Selecting the library item automatically starts a fresh session. CRT carts boot via their cartridge hardware; disks try `LOAD"*",8,1` followed by `RUN`.
5. The first visit still needs locally supplied C64 KERNAL, BASIC, and CHARGEN ROMs (not provided by the library). The files are stored in the visitor's browser after setup.

The uploaded batch for this PR expects exactly:

- `bruce-lee-trilogy.crt` (Magic Desk / hardware type 19)
- `forbidden-forest.d64`
- `paradroid.d64`
- `uridium.d64`
- `Master_of_magic.d64`

Do not merge the manifest entries before these media files have been uploaded and their rights/boot behaviour checked. Leaving the files missing would produce library download errors.
