# Dropzone Arena artwork and evidence

The **actual transparent WebP** `overlay.webp` (1672 × 941, 354,446 bytes, SHA-256 `ed372b3192cfbcd7131c559c6f61d3eb4edc10d4ce19ac486cb923ad0183ce98`) is staged in this draft PR. Its alpha mask was compared against the original Crossfire frame and is pixel-for-pixel identical, retaining the same 4:3 gameplay opening and placement.

The separate Dropzone `profile.json` records joystick port 2, exact hosted `dropzone.crt` SHA-256, screenshot-derived yellow score region, game-over banner and lives indicator. **The draft emulator now references this image for the exact verified Dropzone CRT**, but this PR is not merged or live. The local HUD decoder reads real screen-memory cells with 0 and 10 observed from actual gameplay. Reliable run completion and ranked submissions remain unverified. Do not enable network score posting based on screenshots alone.

Owner-supplied reference screenshots, kept byte-for-byte in `tests/fixtures/high-score-arena/dropzone/`, show 9220 during active play and 9230 on the GAME OVER screen.
