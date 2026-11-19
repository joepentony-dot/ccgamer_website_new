# Dropzone Arena artwork and evidence

The **actual transparent WebP** `overlay.webp` (1672 × 941, 354,446 bytes, SHA-256 `ed372b3192cfbcd7131c559c6f61d3eb4edc10d4ce19ac486cb923ad0183ce98`) is staged in this draft PR. Its alpha mask was compared against the original Crossfire frame and is pixel-for-pixel identical, retaining the same 4:3 gameplay opening and placement.

The separate Dropzone `profile.json` records joystick port 2, exact hosted `dropzone.crt` SHA-256, screenshot-derived yellow score region, game-over banner and lives indicator. **This image is NOT yet used by the live emulator**: runtime wiring, accurate RAM score decoding, run completion logic and ranked submissions still require verification. Do not enable network score posting based on screenshots alone.

Owner-supplied reference screenshots, kept byte-for-byte in `tests/fixtures/high-score-arena/dropzone/`, show 9220 during active play and 9230 on the GAME OVER screen.
