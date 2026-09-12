#!/usr/bin/env python3

import argparse
import json
import os
from pathlib import Path
import stat
import subprocess
import sys
import zipfile

SCHEMA = "ccg-c64-dungeon-carnage-desktop-staging-v1"
APPLICATION_ID = "uk.co.cheekycommodoregamer.c64-dungeon-carnage"
PROFILE_ID = "ccg-c64-dungeon-carnage"
ROOT = Path(__file__).resolve().parents[1]
TREE_VERIFIER = ROOT / "scripts" / "verify-lost-sizzler-package-tree.mjs"
PROVENANCE_VERIFIER = ROOT / "scripts" / "build-lost-sizzler-package-provenance.mjs"
REQUIRED = (
    "desktop-staging.json",
    "application/arcade/lost-sizzler/index.html",
    "application/arcade/lost-sizzler/version.json",
    "application/arcade/lost-sizzler/js/online-services-gate.js",
    "application/games/games.json",
    "metadata/package-manifest.json",
    "metadata/package-provenance.json",
)
FIXED_ZIP_TIME = (1980, 1, 1, 0, 0, 0)


def fail(message: str) -> None:
    raise ValueError(message)


def require_real_directory(value: str) -> Path:
    root = Path(value).resolve()
    if not root.exists() or not root.is_dir():
        fail(f"desktop staging root must be an existing directory: {root}")
    current = root
    while True:
        if current.is_symlink():
            fail(f"desktop staging root must not traverse a symbolic link: {current}")
        if current.parent == current:
            break
        current = current.parent
    return root


def run_verifier(command, label: str) -> None:
    result = subprocess.run(command, cwd=ROOT, text=True, capture_output=True)
    if result.returncode != 0:
        detail = (result.stderr or result.stdout or "").strip()
        fail(f"{label} failed: {detail or f'exit {result.returncode}'}")


def validate_staging(root: Path) -> None:
    config_path = root / "desktop-staging.json"
    if not config_path.is_file() or config_path.is_symlink():
        fail("desktop staging metadata is missing or unsafe")
    try:
        config = json.loads(config_path.read_text(encoding="utf-8"))
    except Exception as exc:
        fail(f"desktop staging metadata is invalid JSON: {exc}")
    if config.get("schema") != SCHEMA:
        fail("desktop staging schema is unsupported")
    if config.get("applicationId") != APPLICATION_ID:
        fail("desktop staging application identity drifted")
    if config.get("stableProfileId") != PROFILE_ID:
        fail("desktop staging profile identity drifted")
    delivery = config.get("delivery") or {}
    if delivery.get("mode") != "desktop-offline":
        fail("portable bundle requires desktop-offline staging")
    if delivery.get("onlineScripts") is not None:
        fail("portable bundle must not include online service script configuration")
    acceptance = config.get("acceptance") or {}
    if acceptance.get("networkingRequired") is not False:
        fail("portable bundle must remain offline-capable")
    if acceptance.get("websiteRootSupabaseBootstrapAllowed") is not False:
        fail("portable bundle must forbid website-root Supabase bootstrap")
    for relative in REQUIRED:
        candidate = root / relative
        if not candidate.exists() or not candidate.is_file() or candidate.is_symlink():
            fail(f"portable bundle required file is missing or unsafe: {relative}")

    application = root / "application"
    manifest = root / "metadata/package-manifest.json"
    provenance = root / "metadata/package-provenance.json"
    run_verifier(
        ["node", str(TREE_VERIFIER), "--manifest", str(manifest), "--root", str(application)],
        "staged application tree verification",
    )
    run_verifier(
        ["node", str(PROVENANCE_VERIFIER), "--manifest", str(manifest), "--verify", str(provenance)],
        "staged package provenance verification",
    )


def collect_files(root: Path):
    files = []
    for base, dirs, names in os.walk(root, topdown=True, followlinks=False):
        base_path = Path(base)
        dirs.sort()
        names.sort()
        for dirname in list(dirs):
            child = base_path / dirname
            if child.is_symlink():
                fail(f"portable bundle refuses symbolic links: {child}")
        for name in names:
            child = base_path / name
            if child.is_symlink():
                fail(f"portable bundle refuses symbolic links: {child}")
            if not child.is_file():
                fail(f"portable bundle refuses unsupported entry: {child}")
            relative = child.relative_to(root).as_posix()
            files.append((relative, child))
    return sorted(files, key=lambda item: item[0])


def build_bundle(staging_value: str, output_value: str) -> Path:
    staging = require_real_directory(staging_value)
    validate_staging(staging)
    output = Path(output_value).resolve()
    if output.suffix.lower() != ".zip":
        fail("portable desktop bundle output must use .zip")
    if output.exists():
        fail(f"portable desktop bundle output must not already exist: {output}")
    if not output.parent.exists() or not output.parent.is_dir():
        fail(f"portable desktop bundle parent must exist: {output.parent}")
    if output.is_relative_to(staging) or staging.is_relative_to(output):
        fail("portable desktop bundle output must be disjoint from staging input")

    files = collect_files(staging)
    if not files:
        fail("portable desktop bundle staging input is empty")

    partial = output.with_name(f".{output.name}.partial")
    if partial.exists():
        fail(f"portable desktop bundle partial output already exists: {partial}")
    try:
        with zipfile.ZipFile(partial, "x", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
            for relative, source in files:
                info = zipfile.ZipInfo(relative, date_time=FIXED_ZIP_TIME)
                info.compress_type = zipfile.ZIP_DEFLATED
                info.create_system = 3
                info.external_attr = (stat.S_IFREG | 0o644) << 16
                info.flag_bits |= 0x800
                archive.writestr(info, source.read_bytes(), compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
        partial.replace(output)
    finally:
        if partial.exists():
            partial.unlink()
    return output


def parse_args():
    parser = argparse.ArgumentParser(description="Build deterministic C64 Dungeon Carnage portable desktop ZIP from verified staging.")
    parser.add_argument("--staging-root", required=True)
    parser.add_argument("--output", required=True)
    return parser.parse_args()


def main() -> int:
    try:
        args = parse_args()
        output = build_bundle(args.staging_root, args.output)
        print(f"C64 Dungeon Carnage portable desktop bundle built: {output}")
        return 0
    except Exception as exc:
        print(f"C64 Dungeon Carnage portable desktop bundle failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
