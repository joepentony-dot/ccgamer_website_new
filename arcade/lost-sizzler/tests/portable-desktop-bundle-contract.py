#!/usr/bin/env python3

import hashlib
import json
from pathlib import Path
import subprocess
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[3]
BUILDER = ROOT / "scripts" / "build-lost-sizzler-portable-desktop-bundle.py"


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def write_staging(root: Path, mode="desktop-offline"):
    application_files = {
        "arcade/lost-sizzler/index.html": "<!doctype html><title>C64 Dungeon Carnage</title>\n",
        "arcade/lost-sizzler/version.json": '{"version":"10.42"}\n',
        "arcade/lost-sizzler/js/online-services-gate.js": "/* offline gate */\n",
        "games/games.json": "[]\n",
    }
    manifest_files = []
    total_bytes = 0
    for rel, text in application_files.items():
        target = root / "application" / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        data = text.encode("utf-8")
        target.write_bytes(data)
        total_bytes += len(data)
        manifest_files.append(
            {
                "path": rel,
                "bytes": len(data),
                "sha256": sha256_bytes(data),
                "classification": "catalogue" if rel == "games/games.json" else "runtime",
                "sourceRepositoryPath": rel,
            }
        )

    manifest = {
        "schema": "ccg-lost-sizzler-desktop-package-manifest-v1",
        "releaseIdentifier": "10.42-portable-bundle-test",
        "sourceRoot": ".",
        "requiredInputs": [],
        "fileCount": len(manifest_files),
        "totalBytes": total_bytes,
        "classificationCounts": {"runtime": 3, "catalogue": 1},
        "files": sorted(manifest_files, key=lambda item: item["path"]),
    }
    metadata = root / "metadata"
    metadata.mkdir(parents=True, exist_ok=True)
    manifest_path = metadata / "package-manifest.json"
    manifest_bytes = (json.dumps(manifest, indent=2) + "\n").encode("utf-8")
    manifest_path.write_bytes(manifest_bytes)
    provenance = {
        "schema": "ccg-lost-sizzler-desktop-package-provenance-v1",
        "releaseIdentifier": manifest["releaseIdentifier"],
        "packageManifestSha256": sha256_bytes(manifest_bytes),
        "packageManifestBytes": len(manifest_bytes),
        "packageFileCount": manifest["fileCount"],
        "packageTotalBytes": manifest["totalBytes"],
    }
    (metadata / "package-provenance.json").write_text(json.dumps(provenance, indent=2) + "\n", encoding="utf-8")

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

    tampered = temp / "tampered-stage"
    tampered.mkdir()
    write_staging(tampered)
    (tampered / "application/arcade/lost-sizzler/index.html").write_text(
        "<!doctype html><title>TAMPERED</title>\n", encoding="utf-8"
    )
    rejected = run_builder(tampered, temp / "tampered.zip")
    assert rejected.returncode != 0
    assert "staged application tree verification failed" in rejected.stderr
    assert not (temp / "tampered.zip").exists(), "tampered staging must never publish a bundle"

    provenance_tampered = temp / "provenance-tampered-stage"
    provenance_tampered.mkdir()
    write_staging(provenance_tampered)
    provenance_path = provenance_tampered / "metadata/package-provenance.json"
    provenance = json.loads(provenance_path.read_text(encoding="utf-8"))
    provenance["packageTotalBytes"] += 1
    provenance_path.write_text(json.dumps(provenance, indent=2) + "\n", encoding="utf-8")
    rejected = run_builder(provenance_tampered, temp / "provenance-tampered.zip")
    assert rejected.returncode != 0
    assert "staged package provenance verification failed" in rejected.stderr
    assert not (temp / "provenance-tampered.zip").exists(), "invalid provenance must never publish a bundle"

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
