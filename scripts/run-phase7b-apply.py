#!/usr/bin/env python3
"""Run the Phase 7B transformer once, or verify an already-applied state."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

# This wrapper is intentionally retained for settled-head and future repeat checks.
ROOT = Path(__file__).resolve().parents[1]
PACMAN_PATH = "resources/audio/easter-eggs/pacman.html"

EXPECTED_MARKERS = {
    "js/ccg-nav.js": ["data-ccg-skip-link", "ensureSkipLink();"],
    "resources/css/ccg-nav.css": ["PHASE 7B — KEYBOARD SKIP NAVIGATION"],
    "admin/js/input-harden.js": ["tag === 'select'"],
    "admin/announce.html": ['alt="Selected announcement thumbnail preview"'],
    "games/game.html": ['title="Screenshot viewer"'],
    PACMAN_PATH: ['<html lang="en">'],
    "resources/quiz.html": ['class="quiz-skip-link"', '<main class="container" id="main-content"'],
}

TRANSFORMED_FILES = [
    "js/ccg-nav.js",
    "resources/css/ccg-nav.css",
    "admin/js/input-harden.js",
    "admin/asset-manager.html",
    "admin/games-editor.html",
    "admin/games-json-editor.html",
    "admin/announce.html",
    "games/game.html",
    "emulation.html",
    "resources/emulation-guide.html",
    "games/collections/index.html",
    "games/collections/amiga-demo-music.html",
    "resources/quiz.html",
]


def present(path: str, markers: list[str]) -> bool:
    text = (ROOT / path).read_bytes().decode("utf-8")
    return all(marker in text for marker in markers)


def restore_original_newlines(newline_styles: dict[str, bytes]) -> None:
    for relative_path, newline in newline_styles.items():
        if newline != b"\r\n":
            continue
        path = ROOT / relative_path
        data = path.read_bytes().replace(b"\r\n", b"\n")
        path.write_bytes(data.replace(b"\n", b"\r\n"))


def patch_pacman_bytes(original: bytes) -> None:
    if original.count(b"<html>\r\n") == 1:
        updated = original.replace(b"<html>\r\n", b'<html lang="en">\n', 1)
    elif original.count(b"<html>\n") == 1:
        updated = original.replace(b"<html>\n", b'<html lang="en">\n', 1)
    else:
        raise SystemExit("Expected exactly one Pac-Man <html> opening line.")
    (ROOT / PACMAN_PATH).write_bytes(updated)


def main() -> None:
    states = {path: present(path, markers) for path, markers in EXPECTED_MARKERS.items()}
    if all(states.values()):
        print("Phase 7B corrections are already applied; no transformation required.")
        return
    if any(states.values()):
        partial = [path for path, applied in states.items() if applied]
        missing = [path for path, applied in states.items() if not applied]
        raise SystemExit(
            "Refusing a partial Phase 7B state. "
            f"Applied markers: {partial}; missing markers: {missing}"
        )

    newline_styles = {}
    for relative_path in TRANSFORMED_FILES:
        data = (ROOT / relative_path).read_bytes()
        newline_styles[relative_path] = b"\r\n" if b"\r\n" in data else b"\n"
    pacman_original = (ROOT / PACMAN_PATH).read_bytes()

    subprocess.run(
        [sys.executable, str(ROOT / "scripts" / "apply-phase7b-accessibility.py"), "apply"],
        cwd=ROOT,
        check=True,
    )
    restore_original_newlines(newline_styles)
    patch_pacman_bytes(pacman_original)


if __name__ == "__main__":
    main()
