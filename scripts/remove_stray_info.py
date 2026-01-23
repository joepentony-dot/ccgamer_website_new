#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
remove_stray_info.py

Removes stray 'info' UI noise from games.json while preserving
legitimate names like Infogrames / Inforgrames.

Creates automatic backup.

Usage:
  python scripts/remove_stray_info.py
"""

import json
import os
import re
import shutil
from typing import Any, List


GAMES_PATH = "games/games.json"
BACKUP_PATH = "games/games.json.backup-pre-info-clean"


# Matches junk patterns containing 'info' as a UI artifact
# Examples:
# "Info / 4 logos"
# "David Ward Info / 2 photos"
# "info"
INFO_JUNK_RE = re.compile(
    r"""
    (
        \binfo\b\s*/\s*\d*\s*(logos?|images?|photos?) |
        \binfo\b\s*/\s*(logos?|images?|photos?) |
        \binfo\b\s*/ |
        \binfo\b
    )
    """,
    re.IGNORECASE | re.VERBOSE
)


# Legitimate words containing "info" that must be preserved
SAFE_WORD_RE = re.compile(r"\binfo(?:grames?|rames?)\b", re.IGNORECASE)


def read_json(path: str):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def write_json(path: str, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def backup_file(src: str, dst: str):
    if not os.path.exists(dst):
        shutil.copy2(src, dst)
        print(f"[OK] Backup created: {dst}")
    else:
        print(f"[OK] Backup already exists: {dst}")


def clean_string(s: str) -> str:
    original = s

    # Temporarily protect legit "Infogrames"/"Inforgrames"
    protected = {}

    def protect(match):
        key = f"__SAFE_{len(protected)}__"
        protected[key] = match.group(0)
        return key

    s = SAFE_WORD_RE.sub(protect, s)

    # Remove junk info patterns
    s = INFO_JUNK_RE.sub("", s)

    # Restore protected words
    for k, v in protected.items():
        s = s.replace(k, v)

    # Normalise whitespace and junk chars
    s = re.sub(r"[\/]+", " ", s)
    s = re.sub(r"\s+", " ", s)

    return s.strip(" -_/,")


def clean_list(items: Any) -> List[str]:
    if not isinstance(items, list):
        return []

    out = []
    seen = set()

    for it in items:
        if not isinstance(it, str):
            continue

        cleaned = clean_string(it)

        if not cleaned:
            continue

        key = cleaned.lower()

        if key not in seen:
            seen.add(key)
            out.append(cleaned)

    return out


def main():

    if not os.path.exists(GAMES_PATH):
        print(f"[ERROR] Missing {GAMES_PATH}")
        return 2

    backup_file(GAMES_PATH, BACKUP_PATH)

    games = read_json(GAMES_PATH)

    if not isinstance(games, list):
        print("[ERROR] games.json must be an array")
        return 2

    cleaned = 0

    for game in games:

        credits = game.get("credits")

        if not isinstance(credits, dict):
            continue

        # Clean list fields
        for key in ["publisher", "coder", "graphics", "musician", "re_releaser"]:

            before = credits.get(key, [])
            after = clean_list(before)

            if before != after:
                credits[key] = after
                cleaned += 1

        # Clean producer
        producer = credits.get("producer", "")

        if isinstance(producer, str) and producer.strip():

            new_val = clean_string(producer)

            if new_val != producer:
                credits["producer"] = new_val
                cleaned += 1

        # Clean developer too (extra safety)
        dev = game.get("developer", "")

        if isinstance(dev, str) and dev.strip():

            new_dev = clean_string(dev)

            if new_dev != dev:
                game["developer"] = new_dev
                cleaned += 1

    write_json(GAMES_PATH, games)

    print("\n[DONE] Stray 'info' cleanup complete")
    print(f"  fields cleaned: {cleaned}")
    print(f"  output: {GAMES_PATH}")
    print(f"  backup: {BACKUP_PATH}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
