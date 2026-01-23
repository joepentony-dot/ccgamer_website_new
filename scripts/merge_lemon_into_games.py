#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
merge_lemon_into_games.py

Safely merges cleaned Lemon metadata into games.json.

Rules:
- Never overwrites non-empty manual fields
- Adds credits{} block if missing
- Preserves ALL existing fields
- Creates automatic backup

Usage:
  python scripts/merge_lemon_into_games.py
"""

import json
import os
import shutil
from typing import Any, Dict, List


GAMES_PATH = "games/games.json"
LEMON_PATH = "data/lemon-metadata.json"
BACKUP_PATH = "games/games.json.backup-pre-lemon"


LIST_KEYS = {"publisher", "re_releaser", "coder", "graphics", "musician"}
SCALAR_KEYS = {"developer", "producer"}
YEAR_KEY = "released"


def read_json(path: str) -> Any:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def write_json(path: str, data: Any) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def backup_file(src: str, dst: str) -> None:
    if not os.path.exists(dst):
        shutil.copy2(src, dst)
        print(f"[OK] Backup created: {dst}")
    else:
        print(f"[OK] Backup already exists: {dst}")


def empty_credits() -> Dict[str, Any]:
    return {
        "publisher": [],
        "producer": "",
        "coder": [],
        "graphics": [],
        "musician": [],
        "re_releaser": []
    }


def merge_list(existing: List[str], incoming: List[str]) -> List[str]:
    out = list(existing) if isinstance(existing, list) else []
    seen = {x.lower() for x in out if isinstance(x, str)}

    for item in incoming:
        if not isinstance(item, str):
            continue
        low = item.lower()
        if low not in seen:
            seen.add(low)
            out.append(item)

    return out


def merge_scalar(existing: str, incoming: str) -> str:
    if isinstance(existing, str) and existing.strip():
        return existing
    return incoming or ""


def main() -> int:

    if not os.path.exists(GAMES_PATH):
        print(f"[ERROR] Missing {GAMES_PATH}")
        return 2

    if not os.path.exists(LEMON_PATH):
        print(f"[ERROR] Missing {LEMON_PATH}")
        return 2

    backup_file(GAMES_PATH, BACKUP_PATH)

    games = read_json(GAMES_PATH)
    lemon = read_json(LEMON_PATH)

    if not isinstance(games, list):
        print("[ERROR] games.json must be an array")
        return 2

    if not isinstance(lemon, dict):
        print("[ERROR] lemon-metadata.json must be an object")
        return 2

    merged = 0
    skipped = 0

    for game in games:

        slug = game.get("slug") or game.get("id")
        if not slug:
            skipped += 1
            continue

        meta = lemon.get(slug)
        if not meta:
            skipped += 1
            continue

        # Ensure credits block exists
        if "credits" not in game or not isinstance(game["credits"], dict):
            game["credits"] = empty_credits()

        credits = game["credits"]

        # Merge lists
        for key in LIST_KEYS:
            incoming = meta.get(key, [])
            existing = credits.get(key, [])

            if incoming:
                merged_list = merge_list(existing, incoming)
                credits[key] = merged_list

        # Merge scalars
        for key in SCALAR_KEYS:
            incoming = meta.get(key, "")
            existing = credits.get(key, "")

            credits[key] = merge_scalar(existing, incoming)

        merged += 1

    write_json(GAMES_PATH, games)

    print("\n[DONE] Merge complete")
    print(f"  merged:  {merged}")
    print(f"  skipped: {skipped}")
    print(f"  output:  {GAMES_PATH}")
    print(f"  backup:  {BACKUP_PATH}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
