# CCG original Commodore 64 firmware

The Cheeky Commodore Gamer website owner authorised hosting the original C64
firmware set for automatic emulation on both desktop and mobile on 8 October 2026.

These are the unchanged C64 VICE distribution ROM images (not the experimental
MEGA65 Open ROM substitute), copied byte-for-byte from
https://github.com/libretro/vice-libretro/tree/master/vice/data/C64

| File | Size | SHA-256 |
| --- | ---: | --- |
| basic-901226-01.bin | 8,192 | 89878cea0a268734696de11c4bae593eaaa506465d2029d619c0e0cbccdfa62d |
| kernal-901227-03.bin | 8,192 | 83c60d47047d7beab8e5b7bf6f67f80daa088b7a6a27de0d7e016f6484042721 |
| chargen-901225-01.bin | 4,096 | fd0d53b8480e86163ac98998976c72cc58d5dd8eb824ed7b829774e74213b420 |

The browser verifies the SHA-256 of each same-origin file before installing
the three ROMs. If any required file fails, none of the hosted files is installed.
Existing optional 1541 DOS support and manual firmware recovery remain available.

Distribution authorisation was represented by the site owner. This README
does not itself constitute a licence grant from the original rightsholder.
