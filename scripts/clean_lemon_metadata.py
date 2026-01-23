#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
clean_lemon_metadata.py

Cleans Lemon scrape output to remove UI noise such as:
- "Info / logo", "Info / 4 logos"
- "photo", "2 photos", "3 photos"
- "Interview"

Creates a backup of the original lemon-metadata.json before overwriting.

Usage:
  python scripts/clean_lemon_metadata.py
  python scripts/clean_lemon_metadata.py --in data/lemon-metadata.json --backup data/lemon-metadata.raw.json
"""

from __future__ import annotations

import argparse
import json
import os
import re
from typing import Any, Dict, List, Tuple


JUNK_EXACT = {
    "info",
    "logo",
    "logos",
    "photo",
    "photos",
    "interview",
}

# Matches:
# "Info / logo"
# "Info / 4 logos"
# "Info/4 logos"
JUNK_INFO_LOGO_RE = re.compile(r"^\s*info\s*/\s*\d*\s*logos?\s*$", re.IGNORECASE)

# Matches:
# "photo"
# "2 photos"
# "3 photos"
# "4 photos"
JUNK_PHOTO_RE = re.compile(r"^\s*\d*\s*photos?\s*$", re.IGNORECASE)

# Sometimes anchor text gets polluted with these tokens mid-string.
# We only remove if the entire item is junky; we DO NOT try to edit legitimate names.
def is_junk_item(s: str) -> bool:
    ss = re.sub(r"\s+", " ", s).strip()
    if not ss:
        return True
    low = ss.lower()

    if low in JUNK_EXACT:
        return True
    if JUNK_INFO_LOGO_RE.match(ss):
        return True
    if JUNK_PHOTO_RE.match(ss):
        return True
    if low == "interview":
        return True

    return False


def clean_string(s: str) -> str:
    # Normalise whitespace only. Do not alter legit names.
    return re.sub(r"\s+", " ", s).strip()


def dedupe_preserve_case(items: List[str]) -> List[str]:
    seen = set()
    out: List[str] = []
    for it in items:
        key = it.lower()
        if key not in seen:
            seen.add(key)
            out.append(it)
    return out


def clean_list(items: Any) -> List[str]:
    if not isinstance(items, list):
        return []
    out: List[str] = []
    for it in items:
        if not isinstance(it, str):
            continue
        it = clean_string(it)
        if not it:
            continue
        if is_junk_item(it):
            continue
        out.append(it)
    return dedupe_preserve_case(out)


def clean_scalar(value: Any) -> Any:
    # For developer/producer strings etc.
    if value is None:
        return value
    if isinstance(value, str):
        v = clean_string(value)
        # If the scalar itself is junk, blank it.
        if is_junk_item(v):
            return ""
        return v
    return value


def clean_record(slug: str, rec: Dict[str, Any]) -> Tuple[Dict[str, Any], Dict[str, int]]:
    """
    Returns (cleaned_record, stats)
    """
    stats = {
        "removed_items": 0,
        "changed_fields": 0,
    }

    cleaned = dict(rec)

    # Keys we expect from the scrape
    list_keys = {"publisher", "re_releaser", "coder", "graphics", "musician"}
    scalar_keys = {"developer", "producer"}
    year_key = "released"

    # Clean lists
    for k in list_keys:
        before = cleaned.get(k, [])
        after = clean_list(before)
        # count removals roughly
        if isinstance(before, list):
            removed = len([x for x in before if isinstance(x, str) and is_junk_item(clean_string(x))])
            stats["removed_items"] += removed
        if before != after:
            stats["changed_fields"] += 1
        cleaned[k] = after

    # Clean scalars
    for k in scalar_keys:
        before = cleaned.get(k, "")
        after = clean_scalar(before)
        if before != after:
            stats["changed_fields"] += 1
        cleaned[k] = after

    # Normalise year
    if year_key in cleaned:
        y = cleaned[year_key]
        try:
            cleaned[year_key] = int(y) if y not in ("", None) else None
        except Exception:
            cleaned[year_key] = None

    # Ensure required keys exist so downstream merges are stable
    cleaned.setdefault("publisher", [])
    cleaned.setdefault("re_releaser", [])
    cleaned.setdefault("coder", [])
    cleaned.setdefault("graphics", [])
    cleaned.setdefault("musician", [])
    cleaned.setdefault("developer", "")
    cleaned.setdefault("producer", "")
    cleaned.setdefault("released", cleaned.get("released", None))

    return cleaned, stats


def read_json(path: str) -> Any:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def write_json(path: str, data: Any) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2, sort_keys=True)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="in_path", default="data/lemon-metadata.json", help="Input lemon-metadata.json")
    ap.add_argument("--backup", dest="backup_path", default="data/lemon-metadata.raw.json", help="Backup path")
    ap.add_argument("--no-backup", action="store_true", help="Do not write backup file")
    args = ap.parse_args()

    in_path = args.in_path
    backup_path = args.backup_path

    if not os.path.exists(in_path):
        print(f"[ERROR] Input not found: {in_path}")
        return 2

    data = read_json(in_path)
    if not isinstance(data, dict):
        print("[ERROR] lemon-metadata.json must be a JSON object keyed by slug")
        return 2

    if (not args.no_backup) and (not os.path.exists(backup_path)):
        write_json(backup_path, data)
        print(f"[OK] Backup written: {backup_path}")
    elif not args.no_backup:
        # If backup exists, do not overwrite (safety).
        print(f"[OK] Backup already exists (left untouched): {backup_path}")

    total = len(data)
    removed_total = 0
    changed_records = 0

    cleaned_all: Dict[str, Any] = {}

    for slug, rec in data.items():
        if not isinstance(rec, dict):
            continue
        cleaned, stats = clean_record(slug, rec)
        cleaned_all[slug] = cleaned
        removed_total += stats["removed_items"]
        if stats["changed_fields"] > 0:
            changed_records += 1

    write_json(in_path, cleaned_all)
    print("[DONE] Cleaned lemon metadata")
    print(f"  records: {total}")
    print(f"  records changed: {changed_records}")
    print(f"  junk items removed: {removed_total}")
    print(f"  output: {in_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
