#!/usr/bin/env python3
"""Phase 7F: audit and optimise HTML redirect shells without changing routes."""
from __future__ import annotations

import argparse
import html
import json
import re
from pathlib import Path
from typing import Any
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
SITE_ORIGIN = "https://www.cheekycommodoregamer.co.uk"
ORIGINS = {SITE_ORIGIN, "https://cheekycommodoregamer.co.uk"}
PROTECTED = {"index.html", "home.html", "resources/css/intro.css", "js/index-intro.js", "games/games.json"}
EXCLUDED = ("data/lemon-cache/", "admin/js/_backup_2026-02-working/")
NON_PUBLIC_HTML_PREFIXES = ("templates/", "admin/templates/")
SOURCE_DIRS = ("scripts", "templates", "admin/templates")
SOURCE_FILES = ("admin/js/games-editor.js",)
ANALYTICS_RE = re.compile(
    r"[ \t]*<script\b(?=[^>]*\bsrc\s*=\s*(['\"])(?:https?://(?:www\.)?cheekycommodoregamer\.co\.uk)?/?js/analytics\.js(?:\?[^'\"]*)?\1)[^>]*>\s*</script>[ \t]*(?:\r?\n)?",
    re.I,
)
BLOCK_RE = re.compile(r"<!DOCTYPE\s+html\b.*?</html>", re.I | re.S)
LOCATION_RE = re.compile(r"(?:window\.)?location\.(?:replace|assign)\s*\(", re.I)
STATIC_TARGET_RE = re.compile(r"(?:window\.)?location\.(?:replace|assign)\s*\(\s*(['\"])(?P<target>.*?)\1", re.I | re.S)
REFRESH_RE = re.compile(r"^\s*(?P<delay>\d+(?:\.\d+)?)\s*;\s*url\s*=\s*(?P<target>.+?)\s*$", re.I)
TEMPLATE_TOKEN_RE = re.compile(r"{{.*?}}|{%.*?%}|\$\{.*?}", re.S)


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def read(path: Path) -> str:
    return path.read_bytes().decode("utf-8")


def write(path: Path, text: str) -> None:
    path.write_bytes(text.encode("utf-8"))


def html_paths() -> list[Path]:
    out = []
    for path in sorted(ROOT.rglob("*.html")):
        name = rel(path)
        if name in PROTECTED or name.startswith(EXCLUDED) or name.startswith(NON_PUBLIC_HTML_PREFIXES):
            continue
        if any(part in {".git", "node_modules", "__pycache__"} for part in path.parts):
            continue
        out.append(path)
    return out


def source_paths() -> list[Path]:
    out: list[Path] = []
    for folder in SOURCE_DIRS:
        base = ROOT / folder
        if not base.exists():
            continue
        for path in base.rglob("*"):
            if path.is_file() and path.suffix.lower() in {".py", ".js", ".mjs", ".html"}:
                out.append(path)
    for name in SOURCE_FILES:
        path = ROOT / name
        if path.exists():
            out.append(path)
    return sorted(set(out))


def refresh(soup: BeautifulSoup) -> tuple[float | None, str | None]:
    for meta in soup.find_all("meta"):
        if str(meta.get("http-equiv") or "").lower() != "refresh":
            continue
        match = REFRESH_RE.match(str(meta.get("content") or ""))
        if not match:
            return None, None
        return float(match.group("delay")), html.unescape(match.group("target").strip().strip("'\""))
    return None, None


def noindex(soup: BeautifulSoup) -> bool:
    for meta in soup.find_all("meta"):
        if str(meta.get("name") or "").lower() == "robots" and "noindex" in str(meta.get("content") or "").lower():
            return True
    return False


def canonical(soup: BeautifulSoup) -> str | None:
    for link in soup.find_all("link"):
        if "canonical" in [str(v).lower() for v in (link.get("rel") or [])]:
            return str(link.get("href") or "").strip() or None
    return None


def assets(soup: BeautifulSoup) -> list[str]:
    out = [f"script:{tag.get('src')}" for tag in soup.find_all("script", src=True)]
    for tag in soup.find_all("link", href=True):
        values = {str(v).lower() for v in (tag.get("rel") or [])}
        if values & {"stylesheet", "preload", "modulepreload", "prefetch"}:
            out.append(f"link:{tag.get('href')}")
    out.extend(f"img:{tag.get('src')}" for tag in soup.find_all("img", src=True))
    return out


def inspect_redirect(path: Path, text: str) -> dict[str, Any] | None:
    soup = BeautifulSoup(text, "html.parser")
    scripts = "\n".join(tag.get_text("\n") for tag in soup.find_all("script") if not tag.get("src"))
    delay, meta_target = refresh(soup)
    has_location = bool(LOCATION_RE.search(scripts))
    if not noindex(soup) or not (meta_target or has_location):
        return None
    body_len = len(" ".join(soup.body.stripped_strings)) if soup.body else 0
    if meta_target is None:
        other_assets = [item for item in assets(soup) if "analytics.js" not in item.lower()]
        if body_len > 100 or soup.find("main") is not None or other_assets:
            return None
    elif body_len > 500:
        return None
    match = STATIC_TARGET_RE.search(scripts)
    script_target = html.unescape(match.group("target")) if match else None
    return {
        "path": rel(path),
        "delay": delay,
        "meta_target": meta_target,
        "script_target": script_target,
        "target": meta_target or script_target,
        "dynamic": not bool(meta_target or script_target),
        "canonical": canonical(soup),
        "query": "window.location.search" in scripts,
        "hash": "window.location.hash" in scripts,
        "analytics": sum(1 for item in assets(soup) if "analytics.js" in item.lower()),
        "assets": assets(soup),
    }


def is_template_value(value: str | None) -> bool:
    return bool(value and TEMPLATE_TOKEN_RE.search(value))


def path_only(value: str | None, source_path: str | None = None) -> str | None:
    if not value or is_template_value(value):
        return None
    base = f"{SITE_ORIGIN}/{source_path}" if source_path else f"{SITE_ORIGIN}/"
    parsed = urlparse(urljoin(base, value))
    if f"{parsed.scheme}://{parsed.netloc}" not in ORIGINS:
        return None
    return parsed.path or "/"


def target_file(value: str, source_path: str) -> Path | None:
    route = path_only(value, source_path)
    if route is None:
        return None
    if route == "/":
        return ROOT / "index.html"
    return ROOT / route.lstrip("/") / "index.html" if route.endswith("/") else ROOT / route.lstrip("/")


def is_source_redirect(block: str) -> bool:
    lower = block.lower()
    if "noindex" not in lower:
        return False
    has_refresh = "http-equiv=\"refresh\"" in lower or "http-equiv='refresh'" in lower
    dynamic = LOCATION_RE.search(block) and "redirecting" in lower and "<main" not in lower
    return bool(has_refresh or dynamic)


def scan() -> dict[str, Any]:
    pages = []
    for path in html_paths():
        try:
            info = inspect_redirect(path, read(path))
        except UnicodeDecodeError:
            continue
        if info:
            pages.append(info)
    by_file = {item["path"]: item for item in pages}
    findings = {key: [] for key in ("missing", "external", "chains", "targets", "canonicals", "delays", "analytics", "assets")}
    for item in pages:
        if item["delay"] not in (None, 0.0):
            findings["delays"].append({"path": item["path"], "delay": item["delay"]})
        if item["analytics"]:
            findings["analytics"].append({"path": item["path"], "count": item["analytics"]})
        if item["assets"]:
            findings["assets"].append({"path": item["path"], "assets": item["assets"]})
        meta_route = path_only(item["meta_target"], item["path"])
        script_route = path_only(item["script_target"], item["path"])
        if item["meta_target"] and item["script_target"] and meta_route != script_route:
            findings["targets"].append({"path": item["path"], "meta": item["meta_target"], "script": item["script_target"]})
        target = item["target"]
        if not target or is_template_value(target):
            continue
        route = path_only(target, item["path"])
        if route is None:
            findings["external"].append({"path": item["path"], "target": target})
            continue
        destination = target_file(target, item["path"])
        if destination is None or not destination.exists():
            findings["missing"].append({"path": item["path"], "target": target})
        elif rel(destination) in by_file:
            findings["chains"].append({"path": item["path"], "target": target})
        canonical_value = item["canonical"]
        if canonical_value and not is_template_value(canonical_value):
            canonical_route = path_only(canonical_value, item["path"])
            if canonical_route != route:
                findings["canonicals"].append({"path": item["path"], "canonical": canonical_value, "target": target})
    source_templates = 0
    source_analytics = []
    for path in source_paths():
        try:
            text = read(path)
        except UnicodeDecodeError:
            continue
        for number, match in enumerate(BLOCK_RE.finditer(text), 1):
            block = match.group(0)
            if not is_source_redirect(block):
                continue
            source_templates += 1
            count = len(ANALYTICS_RE.findall(block))
            if count:
                source_analytics.append({"path": rel(path), "template": number, "count": count})
    totals = {
        "redirect_pages": len(pages),
        "static_pages": sum(not item["dynamic"] for item in pages),
        "dynamic_pages": sum(item["dynamic"] for item in pages),
        "analytics_tags": sum(item["analytics"] for item in pages),
        "pages_with_assets": len(findings["assets"]),
        "asset_tags": sum(len(item["assets"]) for item in findings["assets"]),
        "missing_targets": len(findings["missing"]),
        "external_targets": len(findings["external"]),
        "redirect_chains": len(findings["chains"]),
        "target_mismatches": len(findings["targets"]),
        "canonical_mismatches": len(findings["canonicals"]),
        "delayed_refreshes": len(findings["delays"]),
        "source_templates": source_templates,
        "source_templates_with_analytics": len(source_analytics),
    }
    route_map = {item["path"]: {key: item[key] for key in ("meta_target", "script_target", "canonical", "dynamic", "query", "hash")} for item in pages}
    findings["source_analytics"] = source_analytics
    return {"totals": totals, "route_map": route_map, "examples": {key: value[:80] for key, value in findings.items()}}


def apply() -> dict[str, Any]:
    changed, html_removed, source_removed = [], 0, 0
    for path in html_paths():
        try:
            text = read(path)
        except UnicodeDecodeError:
            continue
        if not inspect_redirect(path, text):
            continue
        updated, count = ANALYTICS_RE.subn("", text)
        if updated != text:
            write(path, updated)
            changed.append(rel(path))
            html_removed += count
    for path in source_paths():
        try:
            text = read(path)
        except UnicodeDecodeError:
            continue
        removed = 0

        def replace(match: re.Match[str]) -> str:
            nonlocal removed
            block = match.group(0)
            if not is_source_redirect(block):
                return block
            updated, count = ANALYTICS_RE.subn("", block)
            removed += count
            return updated

        updated = BLOCK_RE.sub(replace, text)
        if updated != text:
            write(path, updated)
            changed.append(rel(path))
            source_removed += removed
    result = {"changed_files": sorted(set(changed)), "changed_file_count": len(set(changed)), "html_removed": html_removed, "source_removed": source_removed}
    print(json.dumps(result, indent=2))
    return result


def bullets(items: list[dict[str, Any]]) -> str:
    return "- None" if not items else "\n".join(f"- `{item['path']}`: `{json.dumps(item, ensure_ascii=False)}`" for item in items)


def validate(before_path: Path, after_path: Path, report_path: Path, evidence_path: Path) -> None:
    before = json.loads(before_path.read_text(encoding="utf-8"))
    after = json.loads(after_path.read_text(encoding="utf-8"))
    b, a = before["totals"], after["totals"]
    checks = {
        "route_map_unchanged": before["route_map"] == after["route_map"],
        "page_count_unchanged": b["redirect_pages"] == a["redirect_pages"],
        "analytics_zero": a["analytics_tags"] == 0,
        "source_templates_analytics_zero": a["source_templates_with_analytics"] == 0,
        "chains_zero": a["redirect_chains"] == 0,
        "missing_targets_zero": a["missing_targets"] == 0,
        "external_targets_zero": a["external_targets"] == 0,
        "target_mismatches_zero": a["target_mismatches"] == 0,
        "canonical_mismatches_zero": a["canonical_mismatches"] == 0,
        "delayed_refreshes_zero": a["delayed_refreshes"] == 0,
    }
    failures = [name for name, passed in checks.items() if not passed]
    evidence = {"before": b, "after": a, "removed": {"analytics_tags": b["analytics_tags"] - a["analytics_tags"], "pages_with_assets": b["pages_with_assets"] - a["pages_with_assets"]}, "checks": checks, "failures": failures, "remaining": after["examples"]}
    evidence_path.parent.mkdir(parents=True, exist_ok=True)
    evidence_path.write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")
    report = f"""# Phase 7F Redirect-Route Performance Review

## Verdict

**{'PASS' if not failures else 'FAIL'} — redirect-route delivery {'is ready for review' if not failures else 'needs further work'}.**

Phase 7F removes the analytics request from verified `noindex` redirect shells while retaining their targets, canonical metadata and query/hash forwarding.

## Results

| Finding | Before | After |
|---|---:|---:|
| Redirect pages | {b['redirect_pages']:,} | {a['redirect_pages']:,} |
| Analytics tags on redirect pages | {b['analytics_tags']:,} | {a['analytics_tags']:,} |
| Redirect pages with delivery assets | {b['pages_with_assets']:,} | {a['pages_with_assets']:,} |
| Source redirect templates with analytics | {b['source_templates_with_analytics']:,} | {a['source_templates_with_analytics']:,} |
| Missing static targets | {b['missing_targets']:,} | {a['missing_targets']:,} |
| Redirect chains | {b['redirect_chains']:,} | {a['redirect_chains']:,} |

- Static redirect pages: **{a['static_pages']:,}**
- Dynamic redirect pages: **{a['dynamic_pages']:,}**
- Checks passed: **{len(checks) - len(failures)} / {len(checks)}**

## Policy

- Redirect shells remain `noindex,follow` and retain existing zero-delay redirect behaviour.
- Static destinations must exist and must not be another redirect shell.
- Relative internal destinations are resolved from the redirect page location before validation.
- Source templates are validated separately from published redirect pages.
- Redirect targets, canonicals, query strings and fragments are not rewritten.
- Canonical destination pages continue loading analytics normally.
- These are GitHub Pages compatibility shells; this phase does not claim HTTP 301/308 behaviour.

## Remaining findings

### Chains
{bullets(after['examples']['chains'])}

### Missing targets
{bullets(after['examples']['missing'])}

### Canonical mismatches
{bullets(after['examples']['canonicals'])}

### Remaining delivery assets
{bullets(after['examples']['assets'])}

## Safety

- `index.html`, `home.html`, `resources/css/intro.css`, `js/index-intro.js` and `games/games.json` unchanged
- no CSS source file, game record, thumbnail or route is renamed or removed
"""
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(report, encoding="utf-8")
    if failures:
        raise SystemExit("Phase 7F validation failed: " + ", ".join(failures))
    print(json.dumps({"passed": len(checks), "total": len(checks)}, indent=2))


def main() -> None:
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("apply")
    inspect_parser = sub.add_parser("inspect")
    inspect_parser.add_argument("--output", required=True)
    validate_parser = sub.add_parser("validate")
    validate_parser.add_argument("--before", required=True)
    validate_parser.add_argument("--after", required=True)
    validate_parser.add_argument("--report", required=True)
    validate_parser.add_argument("--evidence", required=True)
    args = parser.parse_args()
    if args.command == "apply":
        apply()
    elif args.command == "inspect":
        payload = scan()
        output = Path(args.output)
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
        print(json.dumps(payload, indent=2))
    else:
        validate(Path(args.before), Path(args.after), Path(args.report), Path(args.evidence))


if __name__ == "__main__":
    main()
