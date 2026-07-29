#!/usr/bin/env python3
"""Run the Phase 7B transformer once, or verify an already-applied state."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

EXPECTED_MARKERS = {
    "js/ccg-nav.js": ["data-ccg-skip-link", "ensureSkipLink();"],
    "resources/css/ccg-nav.css": ["PHASE 7B — KEYBOARD SKIP NAVIGATION"],
    "admin/js/input-harden.js": ["tag === 'select'"],
    "admin/announce.html": ['alt="Selected announcement thumbnail preview"'],
    "games/game.html": ['title="Screenshot viewer"'],
    "resources/audio/easter-eggs/pacman.html": ['<html lang="en">'],
    "resources/quiz.html": ['class="quiz-skip-link"', '<main class="container" id="main-content"'],
}


def present(path: str, markers: list[str]) -> bool:
    text = (ROOT / path).read_text(encoding="utf-8")
    return all(marker in text for marker in markers)


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

    subprocess.run(
        [sys.executable, str(ROOT / "scripts" / "apply-phase7b-accessibility.py"), "apply"],
        cwd=ROOT,
        check=True,
    )


if __name__ == "__main__":
    main()
