# CCG Browser C64 — Game media directory

The C64 emulator loads disk and cartridge images hosted in this folder using `/emulator/c64/library.json`. The public dropdown only displays entries with `approved: true` and a matching hosted file. Never advertise media before its file has been committed.

## Owner-selected games hosted in this folder

On 8 October 2026, the Cheeky Commodore Gamer website owner confirmed permission to redistribute the following user-supplied C64 game images. The original files were transferred to GitHub without modification; their exact byte sizes and SHA-256 digests were verified. The public Online Library now lists these files.

| Filename | Type | Expected bytes | SHA-256 |
|---|---|---:|---|
| `forbidden-forest.d64` | D64 | 174848 | `540701ccff2b57927f795b922ade006d2bb687f75a7af65dce44eae232bcfdea` |
| `paradroid.d64` | D64 | 174848 | `3c31e9cd4426d6665afd9d17a7dec13bc2bec9e14fc5d2158eedc7c8a6c89439` |
| `uridium.d64` | D64 | 174848 | `841aeb992636a0a9b8133dcc2b11c5153124cb0398cce0c4d142a03590bd61c5` |
| `Master_of_magic.d64` | D64 | 174848 | `7d4fb707a47ea2716018b1ff8658cfded6beeb75388e2fc877da44dd560f5838` |
| `bruce-lee-trilogy.crt` | CRT Magic Desk (type 19) | 131392 | `6462a7562dcb539da2a6bfb843235dd70ffb2817403ea99efc350669b9e62999` |

The live catalogue is `/emulator/c64/library.json` and records each listed file's SHA-256, size and redistribution attestation. The C64 emulator verification workflow checks those files directly.

These five images are each single game media files. For future multi-disk games, list multiple `disks` objects in the catalogue and use the emulator's disk-side selector or **SWAP DISK** button. Changing a disk does not reset the C64.
