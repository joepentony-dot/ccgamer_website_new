#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
clean_games_credits.py

Final cleanup pass for games.json credits.

Removes Lemon UI noise such as:
- "Info / 6 images"
- "3 logos"
- "2 photos"
- "photo"
- Embedded junk in producer fields

Creates automatic backup before modifying.

Usage:
  python scripts/clean_games_credits.py
"""

import json
import os
import re
import shutil
from typing import Any, List


GAMES_PATH = "games/games.json"
BACKUP_PATH = "games/games.json.backup-pre-final-clean"


# Matches things like:
# Info / 6 images
# Info/4 logos
# 3 photos
# 2 logos
JUNK_RE = re.compile(
    r"""
    (
        info\s*/\s*\d+\s*(images?|logos?) |
        \b\d+\s*(images?|logos?|photos?)\b |
        \bphoto\b |
        \bphotos\b
    )
    """,
    re.IGNORECASE | re.VERBOSE
)


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
    # Remove junk patterns
    s = JUNK_RE.sub("", s)

    # Remove leftover slashes/double spaces
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

    cleaned_records = 0
    removed_items = 0

    for game in games:

        credits = game.get("credits")

        if not isinstance(credits, dict):
            continue

        for key in ["publisher", "coder", "graphics", "musician", "re_releaser"]:

            before = credits.get(key, [])
            after = clean_list(before)

            if before != after:
                removed_items += len(before) - len(after)
                credits[key] = after
                cleaned_records += 1

        # Clean producer (string)
        producer = credits.get("producer", "")

        if isinstance(producer, str) and producer.strip():

            cleaned = clean_string(producer)

            if cleaned != producer:
                credits["producer"] = cleaned
                cleaned_records += 1

    write_json(GAMES_PATH, games)

    print("\n[DONE] Final credits cleanup complete")
    print(f"  records cleaned: {cleaned_records}")
    print(f"  junk removed:    {removed_items}")
    print(f"  output:          {GAMES_PATH}")
    print(f"  backup:          {BACKUP_PATH}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
