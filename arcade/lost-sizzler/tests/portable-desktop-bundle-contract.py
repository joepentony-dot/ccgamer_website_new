#!/usr/bin/env python3

import hashlib
import json
from pathlib import Path
import subprocess
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[3]
BUILDER = ROOT / "scripts" / "build-lost-sizzler-portable-desktop-bundle.py"


def write_staging(root: Path, mode="desktop-offline"):
    files = {
        "application/arcade/lost-sizzler/index.html": "<!doctype html><title>C64 Dungeon Carnage</title>\n",
        "application/arcade/lost-sizzler/version.json": '{"version":"10.42"}\n',
        "application/arcade/lost-sizzler/js/online-services-gate.js": "/* offline gate */\n",
        "application/games/games.json": "[]\n",
        "metadata/package-manifest.json": '{"schema":"ccg-lost-sizzler-desktop-package-manifest-v1"}\n',
        "metadata/package-provenance.json": '{"schema":"ccg-lost-sizzler-desktop-package-provenance-v1"}\n',
    }
    for rel, text in files.items():
        target = root / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(text, encoding="utf-8")
    config = {
        "schema": "ccg-c64-dungeon-carnage-desktop-staging-v1",
        "applicationId": "uk.co.cheekycommodoregamer.c64-dungeon-carnage",
        "stableProfileId": "ccg-c64-dungeon-carnage",
        "delivery": {"mode": mode, "onlineScripts": None},
        "acceptance": {"networkingRequired": False, "websiteRootSupabaseBootstrapAllowed": False},
    }
    (root / "desktop-staging.json").write_text(json.dumps(config, indent=2) + "\n", encoding="utf-8")


def run_builder(staging: Path, output: Path):
    return subprocess.run(
        ["python3", str(BUILDER), "--staging-root", str(staging), "--output", str(output)],
        cwd=ROOT,
        text=True,
        capture_output=True,
    )


with tempfile.TemporaryDirectory(prefix="ccg-portable-bundle-") as temp_name:
    temp = Path(temp_name)
    staging = temp / "staging"
    staging.mkdir()
    write_staging(staging)

    first = temp / "bundle-a.zip"
    second = temp / "bundle-b.zip"
    result = run_builder(staging, first)
    assert result.returncode == 0, result.stderr or result.stdout
    result = run_builder(staging, second)
    assert result.returncode == 0, result.stderr or result.stdout

    digest_a = hashlib.sha256(first.read_bytes()).hexdigest()
    digest_b = hashlib.sha256(second.read_bytes()).hexdigest()
    assert digest_a == digest_b, "same verified staging tree must produce identical portable ZIP bytes"

    with zipfile.ZipFile(first) as archive:
        names = archive.namelist()
        assert names == sorted(names), "portable bundle entries must be sorted"
        for required in (
            "desktop-staging.json",
            "application/arcade/lost-sizzler/index.html",
            "application/arcade/lost-sizzler/version.json",
            "application/arcade/lost-sizzler/js/online-services-gate.js",
            "application/games/games.json",
            "metadata/package-manifest.json",
            "metadata/package-provenance.json",
        ):
            assert required in names, f"missing required portable bundle entry: {required}"
        for info in archive.infolist():
            assert info.date_time == (1980, 1, 1, 0, 0, 0), "ZIP timestamps must be deterministic"

    overwrite = run_builder(staging, first)
    assert overwrite.returncode != 0
    assert "must not already exist" in overwrite.stderr

    online = temp / "online-stage"
    online.mkdir()
    write_staging(online, mode="desktop-online")
    rejected = run_builder(online, temp / "online.zip")
    assert rejected.returncode != 0
    assert "requires desktop-offline staging" in rejected.stderr

    missing = temp / "missing-stage"
    missing.mkdir()
    write_staging(missing)
    (missing / "application/games/games.json").unlink()
    rejected = run_builder(missing, temp / "missing.zip")
    assert rejected.returncode != 0
    assert "required file is missing" in rejected.stderr

    if hasattr(Path, "symlink_to"):
        linked = temp / "linked-stage"
        linked.mkdir()
        write_staging(linked)
        real_version = linked / "real-version.json"
        real_version.write_text('{"version":"10.42"}\n', encoding="utf-8")
        version_path = linked / "application/arcade/lost-sizzler/version.json"
        version_path.unlink()
        try:
            version_path.symlink_to(real_version)
            rejected = run_builder(linked, temp / "linked.zip")
            assert rejected.returncode != 0
            assert "missing or unsafe" in rejected.stderr or "refuses symbolic links" in rejected.stderr
        except OSError:
            pass

print("C64 Dungeon Carnage portable desktop bundle contract passed.")
