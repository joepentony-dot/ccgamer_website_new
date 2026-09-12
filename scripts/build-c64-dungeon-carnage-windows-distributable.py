#!/usr/bin/env python3

import argparse
import hashlib
import json
import os
from pathlib import Path
import stat
import subprocess
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[1]
TREE_VERIFIER = ROOT / "scripts" / "verify-lost-sizzler-package-tree.mjs"
PROVENANCE_VERIFIER = ROOT / "scripts" / "build-lost-sizzler-package-provenance.mjs"
STAGING_SCHEMA = "ccg-c64-dungeon-carnage-desktop-staging-v1"
PACKAGE_SCHEMA = "ccg-c64-dungeon-carnage-windows-distributable-v1"
APPLICATION_ID = "uk.co.cheekycommodoregamer.c64-dungeon-carnage"
PROFILE_ID = "ccg-c64-dungeon-carnage"
LAUNCHER = "C64DungeonCarnage.exe"
PACKAGE_ROOT = "C64 Dungeon Carnage"
FIXED_ZIP_TIME = (1980, 1, 1, 0, 0, 0)
REQUIRED_STAGING_FILES = (
    "desktop-staging.json",
    "application/arcade/lost-sizzler/index.html",
    "application/arcade/lost-sizzler/version.json",
    "application/arcade/lost-sizzler/js/online-services-gate.js",
    "application/games/games.json",
    "metadata/package-manifest.json",
    "metadata/package-provenance.json",
)


def fail(message: str) -> None:
    raise ValueError(message)


def is_reparse(path: Path) -> bool:
    if path.is_symlink():
        return True
    checker = getattr(path, "is_junction", None)
    return bool(checker and checker())


def require_real_directory(value: str, label: str) -> Path:
    root = Path(value).resolve()
    if not root.exists() or not root.is_dir():
        fail(f"{label} must be an existing directory: {root}")
    current = root
    while True:
        if is_reparse(current):
            fail(f"{label} must not traverse a symbolic link/junction: {current}")
        if current.parent == current:
            break
        current = current.parent
    return root


def require_regular_file(path: Path, label: str) -> Path:
    if not path.exists() or not path.is_file() or is_reparse(path):
        fail(f"{label} is missing or unsafe: {path}")
    return path


def run_verifier(command, label: str) -> None:
    result = subprocess.run(command, cwd=ROOT, text=True, capture_output=True)
    if result.returncode != 0:
        detail = (result.stderr or result.stdout or "").strip()
        fail(f"{label} failed: {detail or f'exit {result.returncode}'}")


def validate_staging(staging: Path) -> dict:
    config_path = require_regular_file(staging / "desktop-staging.json", "desktop staging metadata")
    try:
        config = json.loads(config_path.read_text(encoding="utf-8"))
    except Exception as exc:
        fail(f"desktop staging metadata is invalid JSON: {exc}")
    if config.get("schema") != STAGING_SCHEMA:
        fail("desktop staging schema is unsupported")
    if config.get("applicationId") != APPLICATION_ID:
        fail("desktop staging application identity drifted")
    if config.get("stableProfileId") != PROFILE_ID:
        fail("desktop staging profile identity drifted")
    delivery = config.get("delivery") or {}
    if delivery.get("mode") != "desktop-offline" or delivery.get("onlineScripts") is not None:
        fail("Windows distributable requires desktop-offline staging with no online scripts")
    for relative in REQUIRED_STAGING_FILES:
        require_regular_file(staging / relative, f"required staging file {relative}")

    manifest = staging / "metadata/package-manifest.json"
    provenance = staging / "metadata/package-provenance.json"
    application = staging / "application"
    run_verifier(
        ["node", str(TREE_VERIFIER), "--manifest", str(manifest), "--root", str(application)],
        "staged application tree verification",
    )
    run_verifier(
        ["node", str(PROVENANCE_VERIFIER), "--manifest", str(manifest), "--verify", str(provenance)],
        "staged package provenance verification",
    )
    return config


def read_release_identity(staging: Path) -> dict:
    source = require_regular_file(
        staging / "application/arcade/lost-sizzler/version.json",
        "packaged release identity",
    )
    try:
        version = json.loads(source.read_text(encoding="utf-8"))
    except Exception as exc:
        fail(f"packaged release identity is invalid JSON: {exc}")
    release_version = str(version.get("releaseVersion") or "").strip()
    build = str(version.get("build") or "").strip()
    cache_token = str(version.get("cacheToken") or "").strip()
    if not release_version or not build or not cache_token:
        fail("packaged release identity is incomplete")
    return {
        "releaseVersion": release_version,
        "build": build,
        "cacheToken": cache_token,
    }


def collect_files(root: Path, label: str):
    files = []
    for base, dirs, names in os.walk(root, topdown=True, followlinks=False):
        base_path = Path(base)
        dirs.sort()
        names.sort()
        for dirname in list(dirs):
            child = base_path / dirname
            if is_reparse(child):
                fail(f"{label} refuses symbolic links/junctions: {child}")
        for name in names:
            child = base_path / name
            if is_reparse(child) or not child.is_file():
                fail(f"{label} refuses unsafe entry: {child}")
            files.append((child.relative_to(root).as_posix(), child))
    return sorted(files, key=lambda item: item[0])


def validate_wrapper(wrapper: Path) -> None:
    require_regular_file(wrapper / LAUNCHER, "Windows launcher")
    for relative, _ in collect_files(wrapper, "Windows wrapper publish tree"):
        lower = relative.lower()
        if lower.endswith(".pdb"):
            fail(f"Windows distributable must not contain debug symbols: {relative}")
        if lower.startswith("staging/") or lower == "staging":
            fail("Windows wrapper publish tree must not pre-populate the staging directory")
        if lower in {".env", ".env.local", ".env.production"}:
            fail(f"Windows wrapper publish tree must not contain environment files: {relative}")


def package_metadata(release: dict) -> bytes:
    payload = {
        "schema": PACKAGE_SCHEMA,
        "applicationId": APPLICATION_ID,
        "stableProfileId": PROFILE_ID,
        "architecture": "win-x64",
        "launcher": LAUNCHER,
        "stagingDirectory": "staging",
        "deliveryMode": "desktop-offline",
        "webView2Runtime": "Microsoft Edge WebView2 Evergreen Runtime required",
        **release,
    }
    return (json.dumps(payload, indent=2, sort_keys=True) + "\n").encode("utf-8")


def readme_bytes() -> bytes:
    return (
        "C64 Dungeon Carnage — Windows Offline Edition\r\n"
        "\r\n"
        "Run C64DungeonCarnage.exe. The game uses the packaged staging/ directory and keeps its WebView2 profile outside the application directory.\r\n"
        "This build is desktop-offline: remote game/network requests are blocked by the wrapper.\r\n"
        "Microsoft Edge WebView2 Evergreen Runtime is required on Windows.\r\n"
    ).encode("utf-8")


def write_entry(archive: zipfile.ZipFile, name: str, data: bytes, executable: bool = False) -> None:
    info = zipfile.ZipInfo(name, date_time=FIXED_ZIP_TIME)
    info.compress_type = zipfile.ZIP_DEFLATED
    info.create_system = 3
    mode = 0o755 if executable else 0o644
    info.external_attr = (stat.S_IFREG | mode) << 16
    info.flag_bits |= 0x800
    archive.writestr(info, data, compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)


def build_distributable(wrapper_value: str, staging_value: str, output_value: str) -> Path:
    wrapper = require_real_directory(wrapper_value, "Windows wrapper publish root")
    staging = require_real_directory(staging_value, "desktop staging root")
    if wrapper == staging or wrapper in staging.parents or staging in wrapper.parents:
        fail("Windows wrapper publish root and desktop staging root must be disjoint")
    validate_wrapper(wrapper)
    validate_staging(staging)
    release = read_release_identity(staging)

    output = Path(output_value).resolve()
    if output.suffix.lower() != ".zip":
        fail("Windows distributable output must use .zip")
    if output.exists():
        fail(f"Windows distributable output must not already exist: {output}")
    if not output.parent.exists() or not output.parent.is_dir():
        fail(f"Windows distributable parent must exist: {output.parent}")
    if output == wrapper or output in wrapper.parents or output == staging or output in staging.parents:
        fail("Windows distributable output must be outside its inputs")

    wrapper_files = collect_files(wrapper, "Windows wrapper publish tree")
    staging_files = collect_files(staging, "desktop staging tree")
    partial = output.with_name(f".{output.name}.partial")
    if partial.exists():
        fail(f"Windows distributable partial output already exists: {partial}")

    try:
        with zipfile.ZipFile(partial, "x", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
            for relative, source in wrapper_files:
                write_entry(
                    archive,
                    f"{PACKAGE_ROOT}/{relative}",
                    source.read_bytes(),
                    executable=relative.lower().endswith(".exe"),
                )
            for relative, source in staging_files:
                write_entry(archive, f"{PACKAGE_ROOT}/staging/{relative}", source.read_bytes())
            write_entry(archive, f"{PACKAGE_ROOT}/windows-package.json", package_metadata(release))
            write_entry(archive, f"{PACKAGE_ROOT}/README.txt", readme_bytes())
        partial.replace(output)
    finally:
        if partial.exists():
            partial.unlink()

    digest = hashlib.sha256(output.read_bytes()).hexdigest()
    print(f"C64 Dungeon Carnage Windows distributable built: {output}; sha256={digest}")
    return output


def parse_args():
    parser = argparse.ArgumentParser(description="Build deterministic C64 Dungeon Carnage Windows offline distributable.")
    parser.add_argument("--wrapper-root", required=True)
    parser.add_argument("--staging-root", required=True)
    parser.add_argument("--output", required=True)
    return parser.parse_args()


def main() -> int:
    try:
        args = parse_args()
        build_distributable(args.wrapper_root, args.staging_root, args.output)
        return 0
    except Exception as exc:
        print(f"C64 Dungeon Carnage Windows distributable failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
