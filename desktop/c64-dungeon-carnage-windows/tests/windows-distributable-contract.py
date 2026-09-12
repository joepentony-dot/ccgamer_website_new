#!/usr/bin/env python3

import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[3]
BUILDER_PATH = ROOT / "scripts" / "build-c64-dungeon-carnage-windows-distributable.py"
SPEC = importlib.util.spec_from_file_location("ccg_windows_distributable", BUILDER_PATH)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError("Unable to load Windows distributable builder.")
BUILDER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BUILDER)


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def expect_rejected(action, label: str) -> None:
    try:
        action()
    except Exception:
        return
    raise AssertionError(f"Expected rejection: {label}")


def run(wrapper: Path, staging: Path, output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    first = output_dir / "c64-dungeon-carnage-win-x64-a.zip"
    second = output_dir / "c64-dungeon-carnage-win-x64-b.zip"
    for path in (first, second):
        if path.exists():
            path.unlink()

    staging_config = json.loads((staging / "desktop-staging.json").read_text(encoding="utf-8"))
    require(staging_config["delivery"]["injectBefore"] is None, "current offline staging must not claim an absent injection target")
    require(not (staging / "application/arcade/lost-sizzler/js/online-services-gate.js").exists(), "current verified package must not fabricate the unpromoted online-services gate")

    BUILDER.build_distributable(str(wrapper), str(staging), str(first))
    BUILDER.build_distributable(str(wrapper), str(staging), str(second))
    require(first.read_bytes() == second.read_bytes(), "identical inputs must produce byte-identical Windows distributables")
    require(sha256(first) == sha256(second), "identical Windows distributables must have the same SHA-256")

    with zipfile.ZipFile(first) as archive:
        names = archive.namelist()
        require(len(names) == len(set(names)), "Windows distributable contains duplicate archive paths")
        require("C64 Dungeon Carnage/C64DungeonCarnage.exe" in names, "native Windows launcher missing")
        require("C64 Dungeon Carnage/staging/desktop-staging.json" in names, "desktop staging metadata missing")
        require("C64 Dungeon Carnage/staging/application/arcade/lost-sizzler/index.html" in names, "packaged game entrypoint missing")
        require("C64 Dungeon Carnage/staging/application/games/games.json" in names, "packaged C64 catalogue missing")
        require("C64 Dungeon Carnage/staging/metadata/package-manifest.json" in names, "package manifest missing")
        require("C64 Dungeon Carnage/staging/metadata/package-provenance.json" in names, "package provenance missing")
        require("C64 Dungeon Carnage/staging/application/arcade/lost-sizzler/js/online-services-gate.js" not in names, "Windows distributable must not fabricate an unverified gate outside the package manifest")
        require("C64 Dungeon Carnage/windows-package.json" in names, "Windows package metadata missing")
        require("C64 Dungeon Carnage/README.txt" in names, "Windows package readme missing")
        require(not any(name.lower().endswith(".pdb") for name in names), "debug symbols leaked into Windows distributable")
        require(all(info.date_time == BUILDER.FIXED_ZIP_TIME for info in archive.infolist()), "archive timestamps are not deterministic")
        metadata = json.loads(archive.read("C64 Dungeon Carnage/windows-package.json"))
        require(metadata["schema"] == BUILDER.PACKAGE_SCHEMA, "Windows package schema drifted")
        require(metadata["applicationId"] == BUILDER.APPLICATION_ID, "Windows package application id drifted")
        require(metadata["stableProfileId"] == BUILDER.PROFILE_ID, "Windows package profile identity drifted")
        require(metadata["architecture"] == "win-x64", "Windows package architecture drifted")
        require(metadata["deliveryMode"] == "desktop-offline", "Windows package must remain desktop-offline")

    expect_rejected(
        lambda: BUILDER.build_distributable(str(wrapper), str(staging), str(first)),
        "existing output overwrite",
    )

    pdb_fixture = wrapper / "release-debug-symbols.pdb"
    pdb_fixture.write_bytes(b"debug fixture")
    try:
        expect_rejected(
            lambda: BUILDER.build_distributable(str(wrapper), str(staging), str(output_dir / "pdb-should-fail.zip")),
            "debug symbol fixture",
        )
    finally:
        pdb_fixture.unlink(missing_ok=True)

    version_path = staging / "application/arcade/lost-sizzler/version.json"
    original_version = version_path.read_bytes()
    version_path.write_bytes(original_version + b" ")
    try:
        expect_rejected(
            lambda: BUILDER.build_distributable(str(wrapper), str(staging), str(output_dir / "tampered-staging-should-fail.zip")),
            "post-staging application tamper",
        )
    finally:
        version_path.write_bytes(original_version)

    print(f"C64 Dungeon Carnage Windows distributable contract passed: sha256={sha256(first)}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--wrapper-root", required=True)
    parser.add_argument("--staging-root", required=True)
    parser.add_argument("--output-dir", required=True)
    args = parser.parse_args()
    run(Path(args.wrapper_root).resolve(), Path(args.staging_root).resolve(), Path(args.output_dir).resolve())
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"C64 Dungeon Carnage Windows distributable contract failed: {exc}", file=sys.stderr)
        raise
