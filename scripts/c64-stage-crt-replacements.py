#!/usr/bin/env python3
"""Prepare only duplicate-title CRT replacements from an owner-supplied ZIP.

Dry-run is the default. This never alters the existing Blast/PRG binary packs.
Public activation requires explicit redistribution approval and tested gameplay.
Run from a checkout of this repository; all three catalogue manifests must exist.

  python scripts/c64-stage-crt-replacements.py cartridge_games.zip
  python scripts/c64-stage-crt-replacements.py cartridge_games.zip \
      --apply --rights-confirmed --gameplay-confirmed
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import unicodedata
import zipfile
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOGUE = ROOT / "emulator/c64/library.json"
BLAST = ROOT / "emulator/c64/media/blast/catalog.json"
ARCHIVE = ROOT / "emulator/c64/media/prg-archive/catalog.json"
MEDIA_DIR = ROOT / "emulator/c64/media/cartridge-replacements"
# See js/ccg-c64/core/cartridges/registry.js. Header validity alone does not
# establish that the cartridge is playable: actual gameplay testing is required.
SUPPORTED_TYPES = {0, 1, 3, 19, 32}


def key(value: str) -> str:
    value = unicodedata.normalize("NFKD", str(value))
    value = "".join(c for c in value if not unicodedata.combining(c))
    value = value.lower().replace("&", " and ")
    value = re.sub(r"['\\u2018\\u2019\\x60]", "", value)
    return re.sub(r"\\s+", " ", re.sub(r"[^a-z0-9]+", " ", value)).strip()


def crt_name(filename: str) -> str:
    stem = Path(filename).stem
    # File-edition qualifiers are not game-title components; keep compilations
    # separate because their base titles still must match an existing title.
    return re.sub(r"\\s*\\([^()]*\\)", "", stem).strip()


def quality(filename: str) -> tuple[int, int, int, str]:
    stem = Path(filename).stem.lower()
    return (int("prototype" in stem or "preview" in stem),
            int("alt" in stem or "small maze" in stem),
            int("max" in stem or "v01" in stem or "v02" in stem),
            stem)


def check_crt(data: bytes) -> int:
    if len(data) < 80 or data[:16] != b"C64 CARTRIDGE   ":
        raise ValueError("Invalid CRT header")
    header_length = int.from_bytes(data[16:20], "big")
    hardware_type = int.from_bytes(data[22:24], "big")
    if header_length < 64 or header_length > len(data) - 16:
        raise ValueError("Invalid CRT header length")
    pos = header_length
    count = 0
    while pos < len(data):
        if pos + 16 > len(data) or data[pos:pos + 4] != b"CHIP":
            raise ValueError("Invalid CRT CHIP packet")
        size = int.from_bytes(data[pos + 4:pos + 8], "big")
        payload = int.from_bytes(data[pos + 14:pos + 16], "big")
        if size < 16 or pos + size > len(data) or payload > size - 16:
            raise ValueError("Invalid CRT CHIP length")
        pos += size
        count += 1
    if pos != len(data) or not count:
        raise ValueError("Missing CRT CHIP data")
    return hardware_type


def load_titles() -> tuple[dict, dict]:
    host = json.loads(CATALOGUE.read_text(encoding="utf-8-sig"))
    all_titles = defaultdict(list)
    for item in host["entries"]:
        all_titles[key(item["title"])].append(("hosted", item["title"], item["format"]))
    for name, path in (("blast", BLAST), ("archive", ARCHIVE)):
        data = json.loads(path.read_text(encoding="utf-8-sig"))
        if not isinstance(data.get("games"), list) or data["recordCount"] != len(data["games"]):
            raise ValueError(f"{name} catalogue is incomplete")
        for item in data["games"]:
            all_titles[key(item[1])].append((name, item[1], item[2]))
    return host, all_titles


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=Path, help="Owner-supplied cartridge ZIP")
    parser.add_argument("--apply", action="store_true", help="Write approved CRTs and catalogue")
    parser.add_argument("--rights-confirmed", action="store_true",
                        help="Owner has checked redistribution rights for every selected CRT")
    parser.add_argument("--gameplay-confirmed", action="store_true",
                        help="Owner has tested every selected CRT in this emulator")
    args = parser.parse_args()
    if args.apply and not (args.rights_confirmed and args.gameplay_confirmed):
        parser.error("--apply requires both --rights-confirmed and --gameplay-confirmed")
    host, titles = load_titles()
    selected = []
    skipped = defaultdict(list)
    source_groups = defaultdict(list)
    with zipfile.ZipFile(args.archive) as source:
        for member in source.infolist():
            if member.is_dir() or not member.filename.lower().endswith(".crt"):
                continue
            basename = Path(member.filename).name
            if not basename or ".." in Path(member.filename).parts:
                skipped["unsafe filename"].append(member.filename)
                continue
            display_key = key(crt_name(basename))
            if not display_key or display_key not in titles:
                skipped["not already listed"].append(basename)
                continue
            try:
                data = source.read(member)
                hardware_type = check_crt(data)
            except (ValueError, zipfile.BadZipFile) as error:
                skipped["invalid cartridge"].append(f"{basename}: {error}")
                continue
            if hardware_type not in SUPPORTED_TYPES:
                skipped["unsupported hardware"].append(f"{basename} (type {hardware_type})")
                continue
            if any(where == "hosted" and fmt.lower() == "crt"
                   for where, _, fmt in titles[display_key]):
                skipped["existing hosted CRT"].append(basename)
                continue
            source_groups[display_key].append((basename, data, hardware_type))

    known_ids = {x["id"] for x in host["entries"]}
    known_urls = {x.get("url") for x in host["entries"]}
    for display_key, candidates in sorted(source_groups.items()):
        candidates.sort(key=lambda row: quality(row[0]))
        # Never silently choose between different equal-priority editions.
        if len(candidates) > 1 and quality(candidates[0][0])[:3] == quality(candidates[1][0])[:3]:
            skipped["ambiguous editions"].extend(c[0] for c in candidates)
            continue
        name, data, hardware_type = candidates[0]
        if "prototype" in name.lower() or "preview" in name.lower():
            skipped["untested prototype"].append(name)
            continue
        for alternate, _, _ in candidates[1:]:
            skipped["alternate cartridge version"].append(alternate)
        # Keep exact on-screen naming from the first existing game instead of
        # deriving display metadata from the cartridge filename.
        title = titles[display_key][0][1]
        slug = re.sub(r"[^a-z0-9]+", "-", display_key).strip("-")
        entry_id = "owner-crt-" + slug
        rel_url = "/emulator/c64/media/cartridge-replacements/" + slug + ".crt"
        if entry_id in known_ids or rel_url in known_urls:
            skipped["existing replacement"].append(name)
            continue
        destination = MEDIA_DIR / (slug + ".crt")
        if destination.exists() and destination.read_bytes() != data:
            raise RuntimeError(f"Refusing to overwrite an existing CRT: {destination}")
        entry = {
            "id": entry_id,
            "title": title,
            "filename": slug + ".crt",
            "format": "crt",
            "description": "Owner-selected cartridge replacement for existing game versions.",
            "url": rel_url,
            "bytes": len(data),
            "sha256": hashlib.sha256(data).hexdigest(),
            "license": "Owner-confirmed public redistribution permission for supplied CRT",
            "approved": True,
            "preferOverOtherFormats": True,
        }
        selected.append((name, destination, data, hardware_type, entry))

    print(f"CRT replacements eligible: {len(selected)} (among {len(source_groups)} matching titles)")
    for reason, values in sorted(skipped.items()):
        print(f"Skipped {reason}: {len(values)}")
    for name, _, data, hw, entry in selected:
        print(f"  {entry['title']} | {name} | type {hw} | {len(data)} bytes")
    if not args.apply:
        print("DRY RUN: repository unchanged. Activation needs rights and gameplay confirmation.")
        return 0

    MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    for _, destination, data, _, _ in selected:
        destination.write_bytes(data)
    host["entries"].extend(item[4] for item in selected)
    # Preserve the prior structure/data and CRLF convention used by the direct
    # catalogue. Do not rebuild or change the shared packed archive binaries.
    CATALOGUE.write_bytes((json.dumps(host, ensure_ascii=False, indent=4) + "\n")
                          .replace("\n", "\r\n").encode("utf-8"))
    print(f"Staged {len(selected)} reviewed CRT replacements in the direct library.")
    print("Run the emulator tests and deployed desktop/mobile/gameplay smoke before merging.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
